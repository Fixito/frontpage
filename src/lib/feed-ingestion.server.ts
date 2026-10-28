// Server-only: fetching a Feed pulls in node:dns via the URL guard. The `.server`
// suffix makes TanStack Start's import protection fail the build if client code
// ever imports this module; feed-service.ts calls it only inside server fn handlers.
import { and, eq, max } from 'drizzle-orm';
import { FeedFetchError, FeedNotModifiedError, fetchFeed } from './feed-fetcher';
import { FeedParseError, parseFeed } from './feed-parser';
import { BlockedUrlError } from './url-guard';
import type { ParsedFeed } from './feed-parser';
import type { Database } from './db';
import type { FetchFeedOptions } from './feed-fetcher';
import type { Feed, FeedHealth, NewFeedItem } from '@/db/schema';
import { feed, feedItem } from '@/db/schema';

// ── Helpers ────────────────────────────────────────────────────────────────────

function getFaviconUrl(siteUrl: string | null): string | null {
	if (!siteUrl) return null;
	try {
		const { hostname } = new URL(siteUrl);
		return `https://www.google.com/s2/favicons?domain=${hostname}&sz=32`;
	} catch {
		return null;
	}
}

// ── Validate & preview a feed URL (no DB writes) ───────────────────────────────

export interface FeedPreview {
	title: string;
	description: string | null;
	faviconUrl: string | null;
	finalUrl: string;
	itemCount: number;
}

export async function validateAndPreviewFeed(url: string): Promise<FeedPreview> {
	const result = await fetchFeed(url, { timeoutMs: 15_000 });
	const parsed = parseFeed(result.xml);
	return {
		title: parsed.title,
		description: parsed.description,
		faviconUrl: getFaviconUrl(parsed.siteUrl ?? result.finalUrl),
		finalUrl: result.finalUrl,
		itemCount: parsed.items.length,
	};
}

// ── Add a feed for a user and perform initial fetch ────────────────────────────

export async function addFeed(
	db: Database,
	userId: string,
	url: string,
	categoryId: string | null = null,
): Promise<string> {
	// Single fetch — parse once, store metadata + items without a second network call.
	const result = await fetchFeed(url, { timeoutMs: 15_000 });
	const parsed = parseFeed(result.xml);
	const faviconUrl = getFaviconUrl(parsed.siteUrl ?? result.finalUrl);

	const [inserted] = await db
		.insert(feed)
		.values({
			userId,
			url: result.finalUrl,
			title: parsed.title,
			description: parsed.description,
			faviconUrl,
			categoryId,
			healthStatus: 'active',
			lastFetchedAt: new Date(),
		})
		.returning({ id: feed.id });

	await storeItems(db, inserted.id, parsed.items);
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
	let xml: string;
	let finalUrl = target.url;

	try {
		const result = await fetchFeed(target.url, fetchOptions);
		xml = result.xml;
		finalUrl = result.finalUrl;
	} catch (err) {
		if (err instanceof FeedNotModifiedError) {
			await db
				.update(feed)
				.set({ lastFetchedAt: new Date(), healthStatus: 'active', errorMessage: null })
				.where(eq(feed.id, target.id));
			return { status: 'active', newItemCount: 0, error: null };
		}
		return recordError(
			db,
			target.id,
			err instanceof FeedFetchError || err instanceof BlockedUrlError
				? err.message
				: 'Fetch failed',
		);
	}

	let parsed;
	try {
		parsed = parseFeed(xml);
	} catch (err) {
		return recordError(db, target.id, err instanceof FeedParseError ? err.message : 'Parse failed');
	}

	const newItemCount = await storeItems(db, target.id, parsed.items);
	const status = (await isStale(db, target.id)) ? 'stale' : 'active';

	await db
		.update(feed)
		.set({
			title: parsed.title,
			description: parsed.description,
			faviconUrl: getFaviconUrl(parsed.siteUrl ?? finalUrl),
			...(finalUrl !== target.url ? { url: finalUrl } : {}),
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
