// Server-only: fetching a Feed pulls in node:dns via the URL guard. The `.server`
// suffix makes TanStack Start's import protection fail the build if client code
// ever imports this module; feed-service.ts calls it only inside server fn handlers.
import { and, eq, max } from 'drizzle-orm';
import { FeedFetchError, fetchFeed } from './feed-fetcher';
import { FeedParseError, parseFeed } from './feed-parser';
import { BlockedUrlError } from './url-guard';
import type { ParsedFeed } from './feed-parser';
import type { Database } from './db';
import type { FetchFeedOptions } from './feed-fetcher';
import type { Feed, FeedHealth, NewFeedItem } from '@/db/schema';
import { feed, feedItem } from '@/db/schema';

// ── Fetch & parse ──────────────────────────────────────────────────────────────

/** The Feed metadata a fetched document declares, and the URL it was fetched from. */
interface FeedMetadata {
	finalUrl: string;
	title: string;
	description: string | null;
	faviconUrl: string | null;
}

/** A Feed document fetched and parsed. */
interface FetchedFeed extends FeedMetadata {
	items: ParsedFeed['items'];
}

/** Throws a FeedFetchError, BlockedUrlError or FeedParseError on failure. */
async function fetchAndParse(url: string, fetchOptions: FetchFeedOptions): Promise<FetchedFeed> {
	const { xml, finalUrl } = await fetchFeed(url, fetchOptions);
	let parsed: ParsedFeed;
	try {
		parsed = parseFeed(xml);
	} catch (err) {
		throw err instanceof FeedParseError ? err : new FeedParseError('Parse failed');
	}
	return {
		finalUrl,
		title: parsed.title,
		description: parsed.description,
		faviconUrl: getFaviconUrl(parsed.siteUrl ?? finalUrl),
		items: parsed.items,
	};
}

function getFaviconUrl(siteUrl: string | null): string | null {
	if (!siteUrl) return null;
	try {
		const { hostname } = new URL(siteUrl);
		return `https://www.google.com/s2/favicons?domain=${hostname}&sz=32`;
	} catch {
		return null;
	}
}

// ── Fetch a Feed the User doesn't follow yet ───────────────────────────────────

/** Thrown when a User adds a Feed URL they already follow. */
export class FeedAlreadyFollowedError extends Error {
	constructor() {
		super('You already follow this feed');
		this.name = 'FeedAlreadyFollowedError';
	}
}

const NEW_FEED_FETCH_OPTIONS: FetchFeedOptions = { timeoutMs: 15_000 };

/**
 * Fetches and parses a Feed for a User, rejecting it with FeedAlreadyFollowedError
 * when they already follow its URL, before fetching, or the URL it redirects to.
 * Fetch and parse failures are rethrown with a message meant for the User.
 */
async function fetchNewFeed(
	db: Database,
	userId: string,
	url: string,
	fetchOptions: FetchFeedOptions,
): Promise<FetchedFeed> {
	const rows = await db.select({ url: feed.url }).from(feed).where(eq(feed.userId, userId));
	const followed = new Set(rows.map((row) => normalizeFeedUrl(row.url)));
	const assertNotFollowed = (candidate: string) => {
		if (followed.has(normalizeFeedUrl(candidate))) throw new FeedAlreadyFollowedError();
	};

	assertNotFollowed(url);
	let fetched: FetchedFeed;
	try {
		fetched = await fetchAndParse(url, fetchOptions);
	} catch (err) {
		if (err instanceof FeedParseError) {
			throw new Error('This URL doesn’t point to an RSS or Atom feed.', { cause: err });
		}
		if (err instanceof FeedFetchError) {
			throw new Error(`Couldn’t load this feed (${err.message}).`, { cause: err });
		}
		throw err; // BlockedUrlError messages are already written for the User.
	}
	assertNotFollowed(fetched.finalUrl);
	return fetched;
}

/**
 * The form two Feed URLs are compared in: scheme and host lowercased (the URL
 * parser does it), trailing slashes dropped from the path.
 */
function normalizeFeedUrl(rawUrl: string): string {
	try {
		const url = new URL(rawUrl.trim());
		return `${url.protocol}//${url.host}${url.pathname.replace(/\/+$/, '')}${url.search}`;
	} catch {
		return rawUrl.trim();
	}
}

// ── Validate & preview a feed URL (no DB writes) ───────────────────────────────

export interface FeedPreview extends FeedMetadata {
	itemCount: number;
}

export async function validateAndPreviewFeed(
	db: Database,
	userId: string,
	url: string,
	fetchOptions: FetchFeedOptions = NEW_FEED_FETCH_OPTIONS,
): Promise<FeedPreview> {
	const { title, description, faviconUrl, finalUrl, items } = await fetchNewFeed(
		db,
		userId,
		url,
		fetchOptions,
	);
	return { title, description, faviconUrl, finalUrl, itemCount: items.length };
}

// ── Add a feed for a user and perform initial fetch ────────────────────────────

/** A Feed a User asks to add: its URL, and the category to file it in, if any. */
export interface NewFeed {
	url: string;
	categoryId: string | null;
}

/**
 * Fetches a Feed the User doesn't follow yet and stores it with its Feed Items.
 * Throws, storing nothing, when the fetch or parse fails or the User already
 * follows it (FeedAlreadyFollowedError). Returns the new Feed's id.
 */
export async function addFeed(
	db: Database,
	userId: string,
	{ url, categoryId }: NewFeed,
	fetchOptions: FetchFeedOptions = NEW_FEED_FETCH_OPTIONS,
): Promise<string> {
	const fetched = await fetchNewFeed(db, userId, url, fetchOptions);

	const [inserted] = await db
		.insert(feed)
		.values({
			userId,
			url: fetched.finalUrl,
			title: fetched.title,
			description: fetched.description,
			faviconUrl: fetched.faviconUrl,
			categoryId,
			healthStatus: 'active',
			lastFetchedAt: new Date(),
		})
		.returning({ id: feed.id });

	try {
		await storeItems(db, inserted.id, fetched.items);
	} catch (err) {
		// No transaction on neon-http: undo the insert so a failed add leaves no Feed.
		await db.delete(feed).where(eq(feed.id, inserted.id));
		throw err;
	}
	return inserted.id;
}

// ── Ingest a Feed: fetch, parse, store, and record its health ──────────────────

/** What one ingest did: the Feed's health after it, and how many Feed Items it added. */
export interface IngestOutcome {
	status: FeedHealth;
	newItemCount: number;
	error: string | null;
}

/**
 * Fetches a Feed (retrying network errors and 5xx, never timeouts or 4xx),
 * stores the Feed Items it doesn't have yet, and records its health:
 * - `error`: the fetch or parse failed; existing Feed Items are left untouched.
 * - `stale`: fetched fine, but the newest Feed Item is over 30 days old.
 * - `active`: fetched fine otherwise.
 *
 * Health transitions happen only here. Every refresh path (one Feed,
 * refresh-all, auto-refresh on login, the error-banner retry) goes through it.
 */
export async function ingestFeed(
	db: Database,
	target: Pick<Feed, 'id' | 'url'>,
	fetchOptions: FetchFeedOptions = {},
): Promise<IngestOutcome> {
	let fetched: FetchedFeed;
	try {
		fetched = await fetchAndParse(target.url, fetchOptions);
	} catch (err) {
		return recordError(
			db,
			target.id,
			err instanceof FeedFetchError ||
				err instanceof BlockedUrlError ||
				err instanceof FeedParseError
				? err.message
				: 'Fetch failed',
		);
	}

	const newItemCount = await storeItems(db, target.id, fetched.items);
	const status = (await isStale(db, target.id)) ? 'stale' : 'active';

	await db
		.update(feed)
		.set({
			title: fetched.title,
			description: fetched.description,
			faviconUrl: fetched.faviconUrl,
			...(fetched.finalUrl !== target.url ? { url: fetched.finalUrl } : {}),
			healthStatus: status,
			errorMessage: null,
			lastFetchedAt: new Date(),
		})
		.where(eq(feed.id, target.id));

	return { status, newItemCount, error: null };
}

// ── Refresh a single feed owned by a user ──────────────────────────────────────

export async function refreshFeed(
	db: Database,
	userId: string,
	feedId: string,
	fetchOptions: FetchFeedOptions = {},
): Promise<IngestOutcome> {
	const rows = await db
		.select({ id: feed.id, url: feed.url })
		.from(feed)
		.where(and(eq(feed.id, feedId), eq(feed.userId, userId)))
		.limit(1);
	if (!rows.length) throw new Error(`Feed ${feedId} not found`);
	return ingestFeed(db, rows[0], fetchOptions);
}

// ── Storage & Feed Health ─────────────────────────────────────────────────────

async function recordError(db: Database, feedId: string, message: string): Promise<IngestOutcome> {
	await db
		.update(feed)
		.set({ healthStatus: 'error', errorMessage: message })
		.where(eq(feed.id, feedId));
	return { status: 'error', newItemCount: 0, error: message };
}

const STALE_AFTER_MS = 30 * 86_400_000;

/** A Feed is stale when its newest Feed Item was published more than 30 days ago. */
async function isStale(db: Database, feedId: string): Promise<boolean> {
	const [{ newest }] = await db
		.select({ newest: max(feedItem.publishedAt) })
		.from(feedItem)
		.where(eq(feedItem.feedId, feedId));
	return newest !== null && Date.now() - newest.getTime() > STALE_AFTER_MS;
}

/**
 * Stores the items a Feed doesn't have yet and returns how many it added.
 * Idempotent: the (Feed, guid) unique index drops items already stored, even
 * by a concurrent ingest of the same Feed.
 */
async function storeItems(
	db: Database,
	feedId: string,
	items: ParsedFeed['items'],
): Promise<number> {
	const rows: Array<NewFeedItem> = items.map((item) => ({
		feedId,
		guid: item.guid,
		url: item.url,
		title: item.title,
		description: item.description,
		contentHtml: item.contentHtml,
		author: item.author,
		publishedAt: item.publishedAt,
	}));

	let added = 0;
	// Insert in chunks to avoid large query payloads
	const CHUNK = 100;
	for (let i = 0; i < rows.length; i += CHUNK) {
		const inserted = await db
			.insert(feedItem)
			.values(rows.slice(i, i + CHUNK))
			.onConflictDoNothing({ target: [feedItem.feedId, feedItem.guid] })
			.returning({ id: feedItem.id });
		added += inserted.length;
	}
	return added;
}

// ── Refresh all feeds for a user ──────────────────────────────────────────────

export async function refreshAllFeeds(db: Database, userId: string): Promise<void> {
	const feeds = await db
		.select({ id: feed.id, url: feed.url })
		.from(feed)
		.where(eq(feed.userId, userId));
	await Promise.allSettled(feeds.map((f) => ingestFeed(db, f)));
}
