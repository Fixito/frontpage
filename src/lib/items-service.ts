import { createServerFn } from '@tanstack/react-start';
import { and, count, desc, eq, inArray, isNotNull, notExists, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { db } from './db';
import { bookmark, category, feed, feedItem, readState } from '@/db/schema';

// ── Types ────────────────────────────────────────────────────────────────────

export interface FeedItemRow {
	id: string;
	feedId: string;
	feedTitle: string;
	feedFaviconUrl: string | null;
	feedHealthStatus: string;
	feedErrorMessage: string | null;
	url: string;
	title: string;
	description: string | null;
	contentHtml: string | null;
	author: string | null;
	publishedAt: Date | null;
	fetchedAt: Date;
	aiSummary: string | null;
	isRead: boolean;
	isBookmarked: boolean;
	categoryId: string | null;
	categoryName: string | null;
	categoryColor: string | null;
}

export interface GetItemsParams {
	userId: string;
	feedId?: string;
	categoryId?: string;
	view?: 'all' | 'bookmarks';
	page?: number;
	pageSize?: number;
}

export interface GetItemsResult {
	items: Array<FeedItemRow>;
	totalCount: number;
	hasMore: boolean;
	feedInfo?: {
		title: string;
		healthStatus: string;
		errorMessage: string | null;
		id: string;
	} | null;
}

// ── getItems ─────────────────────────────────────────────────────────────────

export async function getItems(params: GetItemsParams): Promise<GetItemsResult> {
	const { userId, feedId, categoryId, view = 'all', page = 1, pageSize = 50 } = params;
	const offset = (page - 1) * pageSize;

	const rs = alias(readState, 'rs');
	const bm = alias(bookmark, 'bm');

	const whereClause = and(
		eq(feed.userId, userId),
		feedId ? eq(feedItem.feedId, feedId) : undefined,
		categoryId ? eq(feed.categoryId, categoryId) : undefined,
		view === 'bookmarks' ? isNotNull(bm.itemId) : undefined,
	);

	const rows = await db
		.select({
			id: feedItem.id,
			feedId: feedItem.feedId,
			feedTitle: feed.title,
			feedFaviconUrl: feed.faviconUrl,
			feedHealthStatus: feed.healthStatus,
			feedErrorMessage: feed.errorMessage,
			url: feedItem.url,
			title: feedItem.title,
			description: feedItem.description,
			contentHtml: feedItem.contentHtml,
			author: feedItem.author,
			publishedAt: feedItem.publishedAt,
			fetchedAt: feedItem.fetchedAt,
			aiSummary: feedItem.aiSummary,
			isRead: sql<boolean>`(${rs.itemId} is not null)`,
			isBookmarked: sql<boolean>`(${bm.itemId} is not null)`,
			categoryId: feed.categoryId,
			categoryName: category.name,
			categoryColor: category.color,
		})
		.from(feedItem)
		.innerJoin(feed, eq(feed.id, feedItem.feedId))
		.leftJoin(category, eq(category.id, feed.categoryId))
		.leftJoin(rs, and(eq(rs.itemId, feedItem.id), eq(rs.userId, userId)))
		.leftJoin(bm, and(eq(bm.itemId, feedItem.id), eq(bm.userId, userId)))
		.where(whereClause)
		.orderBy(sql`${feedItem.publishedAt} desc nulls last`, desc(feedItem.fetchedAt))
		.limit(pageSize)
		.offset(offset);

	const countRows = await db
		.select({ total: count() })
		.from(feedItem)
		.innerJoin(feed, eq(feed.id, feedItem.feedId))
		.leftJoin(bm, and(eq(bm.itemId, feedItem.id), eq(bm.userId, userId)))
		.where(whereClause);

	const totalCount = countRows.length > 0 ? (countRows[0]?.total ?? 0) : 0;

	let feedInfo: GetItemsResult['feedInfo'] = null;
	if (feedId) {
		const feedRows = await db
			.select({
				id: feed.id,
				title: feed.title,
				healthStatus: feed.healthStatus,
				errorMessage: feed.errorMessage,
			})
			.from(feed)
			.where(and(eq(feed.id, feedId), eq(feed.userId, userId)))
			.limit(1);
		feedInfo = feedRows[0] ?? null;
	}

	return {
		items: rows as Array<FeedItemRow>,
		totalCount,
		hasMore: offset + rows.length < totalCount,
		feedInfo,
	};
}

// ── markRead ─────────────────────────────────────────────────────────────────

export async function markRead(userId: string, itemId: string): Promise<void> {
	await db.insert(readState).values({ userId, itemId }).onConflictDoNothing();
}

// ── markAllRead ───────────────────────────────────────────────────────────────

export async function markAllRead(
	userId: string,
	feedId?: string,
	categoryId?: string,
): Promise<void> {
	if (feedId) {
		await db
			.insert(readState)
			.select(
				db
					.select({
						userId: sql<string>`${userId}`.as('user_id'),
						itemId: feedItem.id,
						readAt: sql`now()`.as('read_at'),
					})
					.from(feedItem)
					.where(
						and(
							eq(feedItem.feedId, feedId),
							notExists(
								db
									.select()
									.from(readState)
									.where(and(eq(readState.userId, userId), eq(readState.itemId, feedItem.id))),
							),
						),
					),
			)
			.onConflictDoNothing();
		return;
	}

	if (categoryId) {
		await db
			.insert(readState)
			.select(
				db
					.select({
						userId: sql<string>`${userId}`.as('user_id'),
						itemId: feedItem.id,
						readAt: sql`now()`.as('read_at'),
					})
					.from(feedItem)
					.innerJoin(feed, eq(feed.id, feedItem.feedId))
					.where(
						and(
							eq(feed.userId, userId),
							eq(feed.categoryId, categoryId),
							notExists(
								db
									.select()
									.from(readState)
									.where(and(eq(readState.userId, userId), eq(readState.itemId, feedItem.id))),
							),
						),
					),
			)
			.onConflictDoNothing();
		return;
	}

	// All feeds for user
	const feedsSubq = db.select({ id: feed.id }).from(feed).where(eq(feed.userId, userId));
	await db
		.insert(readState)
		.select(
			db
				.select({
					userId: sql<string>`${userId}`.as('user_id'),
					itemId: feedItem.id,
					readAt: sql`now()`.as('read_at'),
				})
				.from(feedItem)
				.where(
					and(
						inArray(feedItem.feedId, feedsSubq),
						notExists(
							db
								.select()
								.from(readState)
								.where(and(eq(readState.userId, userId), eq(readState.itemId, feedItem.id))),
						),
					),
				),
		)
		.onConflictDoNothing();
}

// ── toggleBookmark ────────────────────────────────────────────────────────────

export async function toggleBookmark(userId: string, itemId: string): Promise<boolean> {
	const existing = await db
		.select({ itemId: bookmark.itemId })
		.from(bookmark)
		.where(and(eq(bookmark.userId, userId), eq(bookmark.itemId, itemId)))
		.limit(1);

	if (existing.length > 0) {
		await db.delete(bookmark).where(and(eq(bookmark.userId, userId), eq(bookmark.itemId, itemId)));
		return false;
	}

	await db.insert(bookmark).values({ userId, itemId });
	return true;
}

// ── Server function wrappers ──────────────────────────────────────────────────

export const getItemsFn = createServerFn({ method: 'POST' })
	.inputValidator((data: GetItemsParams) => data)
	.handler(async ({ data }) => getItems(data));

export const markReadFn = createServerFn({ method: 'POST' })
	.inputValidator((data: { userId: string; itemId: string }) => data)
	.handler(async ({ data }) => markRead(data.userId, data.itemId));

export const markAllReadFn = createServerFn({ method: 'POST' })
	.inputValidator((data: { userId: string; feedId?: string; categoryId?: string }) => data)
	.handler(async ({ data }) => markAllRead(data.userId, data.feedId, data.categoryId));

export const toggleBookmarkFn = createServerFn({ method: 'POST' })
	.inputValidator((data: { userId: string; itemId: string }) => data)
	.handler(async ({ data }) => toggleBookmark(data.userId, data.itemId));

export const refreshFeedByIdFn = createServerFn({ method: 'POST' })
	.inputValidator((data: { feedId: string }) => data)
	.handler(async ({ data }) => {
		const { refreshFeed } = await import('./feed-service');
		return refreshFeed(data.feedId);
	});
