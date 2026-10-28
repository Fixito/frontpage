import { createServerFn } from '@tanstack/react-start';
import { and, eq, sql } from 'drizzle-orm';
import { withMutation } from './server-fn-helpers';
import { db as productionDb } from './db';
import { FeedFetchError, FeedNotModifiedError, fetchFeed } from './feed-fetcher';
import { FeedParseError, parseFeed } from './feed-parser';
import { BlockedUrlError } from './url-guard';
import type { Database } from './db';
import type { FetchFeedResult } from './feed-fetcher';
import type { NewFeedItem } from '@/db/schema';
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

	await _storeItems(db, inserted.id, result.finalUrl, parsed.items);
	return inserted.id;
}

// ── Refresh a single feed owned by a user ──────────────────────────────────────

/** Fetches a Feed's document. Defaults to the network; tests pass a stub. */
export type FeedFetcher = (url: string) => Promise<FetchFeedResult>;

export async function refreshFeed(
	db: Database,
	userId: string,
	feedId: string,
	fetcher: FeedFetcher = fetchFeed,
): Promise<void> {
	const feedRows = await db
		.select()
		.from(feed)
		.where(and(eq(feed.id, feedId), eq(feed.userId, userId)))
		.limit(1);
	if (!feedRows.length) throw new Error(`Feed ${feedId} not found`);
	const feedRow = feedRows[0];

	let xml: string;
	let finalUrl = feedRow.url;

	try {
		const result = await fetcher(feedRow.url);
		xml = result.xml;
		finalUrl = result.finalUrl;
	} catch (err) {
		if (err instanceof FeedNotModifiedError) {
			await db
				.update(feed)
				.set({ lastFetchedAt: new Date(), healthStatus: 'active', errorMessage: null })
				.where(eq(feed.id, feedId));
			return;
		}
		const msg =
			err instanceof FeedFetchError || err instanceof BlockedUrlError
				? err.message
				: 'Fetch failed';
		await db
			.update(feed)
			.set({ healthStatus: 'error', errorMessage: msg })
			.where(eq(feed.id, feedId));
		throw err;
	}

	let parsed;
	try {
		parsed = parseFeed(xml);
	} catch (err) {
		const msg = err instanceof FeedParseError ? err.message : 'Parse failed';
		await db
			.update(feed)
			.set({ healthStatus: 'error', errorMessage: msg })
			.where(eq(feed.id, feedId));
		throw err;
	}

	// Update feed metadata
	await db
		.update(feed)
		.set({
			title: parsed.title,
			description: parsed.description,
			faviconUrl: getFaviconUrl(parsed.siteUrl ?? finalUrl),
			...(finalUrl !== feedRow.url ? { url: finalUrl } : {}),
			healthStatus: 'active',
			errorMessage: null,
			lastFetchedAt: new Date(),
		})
		.where(eq(feed.id, feedId));

	await _storeItems(db, feedId, finalUrl, parsed.items);
}

// Fetch, parse, and store items for a URL (used by addFeed and refreshFeed)
async function _storeItems(
	db: Database,
	feedId: string,
	feedUrl: string,
	items?: Awaited<ReturnType<typeof parseFeed>>['items'],
) {
	let feedItems = items;
	if (!feedItems) {
		const result = await fetchFeed(feedUrl);
		const parsed = parseFeed(result.xml);
		feedItems = parsed.items;
	}
	if (feedItems.length === 0) return;

	// Fetch existing GUIDs for this feed to deduplicate
	const existing = await db
		.select({ guid: feedItem.guid })
		.from(feedItem)
		.where(eq(feedItem.feedId, feedId));
	const existingGuids = new Set(existing.map((r) => r.guid));

	const newItems: Array<NewFeedItem> = feedItems
		.filter((item) => !existingGuids.has(item.guid))
		.map((item) => ({
			feedId,
			guid: item.guid,
			url: item.url,
			title: item.title,
			description: item.description,
			contentHtml: item.contentHtml,
			author: item.author,
			publishedAt: item.publishedAt,
		}));

	if (newItems.length > 0) {
		// Insert in chunks to avoid large query payloads
		const CHUNK = 100;
		for (let i = 0; i < newItems.length; i += CHUNK) {
			await db.insert(feedItem).values(newItems.slice(i, i + CHUNK));
		}
	}
}

// ── Refresh all feeds for a user ──────────────────────────────────────────────

export async function refreshAllFeeds(db: Database, userId: string): Promise<void> {
	const feeds = await db.select({ id: feed.id }).from(feed).where(eq(feed.userId, userId));
	await Promise.allSettled(feeds.map((f) => refreshFeed(db, userId, f.id)));
}

// ── Mark feeds as stale (last fetched > 30 days ago) ──────────────────────────

export async function markStaleFeeds(db: Database): Promise<void> {
	await db
		.update(feed)
		.set({ healthStatus: 'stale' })
		.where(
			sql`${feed.healthStatus} = 'active' AND ${feed.lastFetchedAt} < NOW() - INTERVAL '30 days'`,
		);
}

// ── Server function wrappers ───────────────────────────────────────────────────

// Signed-in Users only: validating fetches an arbitrary URL server-side.
export const validateFeedUrlFn = createServerFn({ method: 'POST' })
	.validator((data: { url: string }) => data)
	.handler(
		withMutation(async (_userId: string, data: { url: string }) =>
			validateAndPreviewFeed(data.url),
		),
	);

export const addFeedFn = createServerFn({ method: 'POST' })
	.validator((data: { url: string; categoryId: string | null }) => data)
	.handler(
		withMutation(async (userId: string, data: { url: string; categoryId: string | null }) =>
			addFeed(productionDb, userId, data.url, data.categoryId),
		),
	);

export const refreshFeedFn = createServerFn({ method: 'POST' })
	.validator((data: { feedId: string }) => data)
	.handler(
		withMutation(async (userId: string, data: { feedId: string }) =>
			refreshFeed(productionDb, userId, data.feedId),
		),
	);

export const refreshAllFeedsFn = createServerFn({ method: 'POST' }).handler(
	withMutation(async (userId) => refreshAllFeeds(productionDb, userId)),
);
