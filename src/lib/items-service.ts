import { createServerFn } from '@tanstack/react-start';
import { and, count, desc, eq, inArray, notExists, sql } from 'drizzle-orm';
import { withAuth, withMutation } from './server-fn-helpers';
import { db as productionDb } from './db';
import { feedDisplayTitle } from './feed-title';
import { isBookmarkedBy, isUnreadBy, itemScopeSchema, itemsInScope } from './item-scope';
import type { ItemScope } from './item-scope';
import type { Database } from './db';
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
	scope: ItemScope;
	/** Lists only the unread Feed Items of the scope. */
	unreadOnly?: boolean;
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

export async function getItems(db: Database, params: GetItemsParams): Promise<GetItemsResult> {
	const { userId, scope, unreadOnly = false, page = 1, pageSize = 50 } = params;
	const offset = (page - 1) * pageSize;

	const whereClause = itemsInScope(userId, scope, { unreadOnly });

	const rows = await db
		.select({
			id: feedItem.id,
			feedId: feedItem.feedId,
			feedTitle: feedDisplayTitle,
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
			isRead: sql<boolean>`not ${isUnreadBy(userId)}`,
			isBookmarked: sql<boolean>`${isBookmarkedBy(userId)}`,
			categoryId: feed.categoryId,
			categoryName: category.name,
			categoryColor: category.color,
		})
		.from(feedItem)
		.innerJoin(feed, eq(feed.id, feedItem.feedId))
		.leftJoin(category, eq(category.id, feed.categoryId))
		.where(whereClause)
		// id breaks ties, so offset pages never repeat or skip a Feed Item.
		.orderBy(sql`${feedItem.publishedAt} desc nulls last`, desc(feedItem.fetchedAt), feedItem.id)
		.limit(pageSize)
		.offset(offset);

	const [{ total: totalCount }] = await db
		.select({ total: count() })
		.from(feedItem)
		.where(whereClause);

	let feedInfo: GetItemsResult['feedInfo'] = null;
	if (scope.kind === 'feed') {
		const feedRows = await db
			.select({
				id: feed.id,
				title: feedDisplayTitle,
				healthStatus: feed.healthStatus,
				errorMessage: feed.errorMessage,
			})
			.from(feed)
			.where(and(eq(feed.id, scope.feedId), eq(feed.userId, userId)))
			.limit(1);
		feedInfo = feedRows[0] ?? null;
	}

	return {
		items: rows,
		totalCount,
		hasMore: offset + rows.length < totalCount,
		feedInfo,
	};
}

// ── markRead ─────────────────────────────────────────────────────────────────

export async function markRead(db: Database, userId: string, itemId: string): Promise<void> {
	await db.insert(readState).values({ userId, itemId }).onConflictDoNothing();
}

// ── unmarkRead ────────────────────────────────────────────────────────────────

export async function unmarkRead(db: Database, userId: string, itemId: string): Promise<void> {
	await db.delete(readState).where(and(eq(readState.userId, userId), eq(readState.itemId, itemId)));
}

// ── markAllRead ───────────────────────────────────────────────────────────────

export async function markAllRead(
	db: Database,
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

// ── markAllUnread ─────────────────────────────────────────────────────────────

export async function markAllUnread(
	db: Database,
	userId: string,
	feedId?: string,
	categoryId?: string,
): Promise<void> {
	if (feedId) {
		await db
			.delete(readState)
			.where(
				and(
					eq(readState.userId, userId),
					inArray(
						readState.itemId,
						db.select({ id: feedItem.id }).from(feedItem).where(eq(feedItem.feedId, feedId)),
					),
				),
			);
		return;
	}

	if (categoryId) {
		await db.delete(readState).where(
			and(
				eq(readState.userId, userId),
				inArray(
					readState.itemId,
					db
						.select({ id: feedItem.id })
						.from(feedItem)
						.innerJoin(feed, eq(feed.id, feedItem.feedId))
						.where(and(eq(feed.userId, userId), eq(feed.categoryId, categoryId))),
				),
			),
		);
		return;
	}

	// All feeds for user
	await db
		.delete(readState)
		.where(
			and(
				eq(readState.userId, userId),
				inArray(
					readState.itemId,
					db
						.select({ id: feedItem.id })
						.from(feedItem)
						.innerJoin(feed, eq(feed.id, feedItem.feedId))
						.where(eq(feed.userId, userId)),
				),
			),
		);
}

// ── toggleBookmark ────────────────────────────────────────────────────────────

export async function toggleBookmark(
	db: Database,
	userId: string,
	itemId: string,
): Promise<boolean> {
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
	.validator((data: Omit<GetItemsParams, 'userId'>): Omit<GetItemsParams, 'userId'> => ({
		...data,
		scope: itemScopeSchema.parse(data.scope),
	}))
	.handler(
		withAuth(async (userId: string, data: Omit<GetItemsParams, 'userId'>) =>
			getItems(productionDb, { ...data, userId }),
		),
	);

export const markReadFn = createServerFn({ method: 'POST' })
	.validator((data: { itemId: string }) => data)
	.handler(
		withMutation(async (userId: string, data: { itemId: string }) =>
			markRead(productionDb, userId, data.itemId),
		),
	);

export const unmarkReadFn = createServerFn({ method: 'POST' })
	.validator((data: { itemId: string }) => data)
	.handler(
		withMutation(async (userId: string, data: { itemId: string }) =>
			unmarkRead(productionDb, userId, data.itemId),
		),
	);

export const markAllReadFn = createServerFn({ method: 'POST' })
	.validator((data: { feedId?: string; categoryId?: string }) => data)
	.handler(
		withMutation(async (userId: string, data: { feedId?: string; categoryId?: string }) =>
			markAllRead(productionDb, userId, data.feedId, data.categoryId),
		),
	);

export const markAllUnreadFn = createServerFn({ method: 'POST' })
	.validator((data: { feedId?: string; categoryId?: string }) => data)
	.handler(
		withMutation(async (userId: string, data: { feedId?: string; categoryId?: string }) =>
			markAllUnread(productionDb, userId, data.feedId, data.categoryId),
		),
	);

export const toggleBookmarkFn = createServerFn({ method: 'POST' })
	.validator((data: { itemId: string }) => data)
	.handler(
		withMutation(async (userId: string, data: { itemId: string }) =>
			toggleBookmark(productionDb, userId, data.itemId),
		),
	);
