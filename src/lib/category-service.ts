import { createServerFn } from '@tanstack/react-start';
import { and, asc, eq, max, sql } from 'drizzle-orm';
import { withAuth, withMutation } from './server-fn-helpers';
import { feedDisplayTitle } from './feed-title';
import { db as productionDb } from './db';
import type { Database } from './db';
import type { CategoryNavItem, FeedNavItem, SidebarData } from '@/components/sidebar/types';
import type { FeedHealth } from '@/db/schema';
import { bookmark, category, feed, feedItem, readState } from '@/db/schema';

// ── getSidebarData ─────────────────────────────────────────────────────────────

export async function getSidebarData(db: Database, userId: string): Promise<SidebarData> {
	const feedsRaw = await db
		.select({
			id: feed.id,
			title: feedDisplayTitle,
			url: feed.url,
			faviconUrl: feed.faviconUrl,
			categoryId: feed.categoryId,
			healthStatus: feed.healthStatus,
			unreadCount: sql<number>`cast(count(${feedItem.id}) - count(${readState.itemId}) as int)`,
		})
		.from(feed)
		.leftJoin(feedItem, eq(feedItem.feedId, feed.id))
		.leftJoin(readState, and(eq(readState.itemId, feedItem.id), eq(readState.userId, userId)))
		.where(eq(feed.userId, userId))
		.groupBy(feed.id);

	const cats = await db
		.select()
		.from(category)
		.where(eq(category.userId, userId))
		.orderBy(asc(category.position), asc(category.name));

	// Group feeds by categoryId
	const feedsByCategory = new Map<string, Array<FeedNavItem>>();
	const uncategorized: Array<FeedNavItem> = [];

	for (const f of feedsRaw) {
		const navItem: FeedNavItem = {
			id: f.id,
			title: f.title,
			url: f.url,
			faviconUrl: f.faviconUrl,
			unreadCount: Math.max(0, f.unreadCount),
			healthStatus: f.healthStatus as FeedHealth,
		};
		if (f.categoryId) {
			const existing = feedsByCategory.get(f.categoryId);
			if (existing) {
				existing.push(navItem);
			} else {
				feedsByCategory.set(f.categoryId, [navItem]);
			}
		} else {
			uncategorized.push(navItem);
		}
	}

	const categories: Array<CategoryNavItem> = cats.map((cat) => {
		const catFeeds = feedsByCategory.get(cat.id) ?? [];
		return {
			id: cat.id,
			name: cat.name,
			feeds: catFeeds,
			unreadCount: catFeeds.reduce((sum, f) => sum + f.unreadCount, 0),
		};
	});

	const totalUnread = feedsRaw.reduce((sum, f) => sum + Math.max(0, f.unreadCount), 0);

	const [bmRow] = await db
		.select({ cnt: sql<number>`cast(count(*) as int)` })
		.from(bookmark)
		.where(eq(bookmark.userId, userId));
	const bookmarkCount = bmRow.cnt;

	return { categories, uncategorized, totalUnread, bookmarkCount };
}

// ── Category CRUD ──────────────────────────────────────────────────────────────

export async function createCategory(db: Database, userId: string, name: string): Promise<string> {
	const result = await db
		.select({ maxPos: max(category.position) })
		.from(category)
		.where(eq(category.userId, userId));
	const maxPos = result[0]?.maxPos ?? -1;

	const [inserted] = await db
		.insert(category)
		.values({ userId, name, position: maxPos + 1 })
		.returning({ id: category.id });
	return inserted.id;
}

export async function updateCategory(
	db: Database,
	userId: string,
	id: string,
	patch: { name?: string; position?: number },
): Promise<void> {
	const rows = await db
		.select({ id: category.id })
		.from(category)
		.where(and(eq(category.id, id), eq(category.userId, userId)))
		.limit(1);
	if (!rows.length) throw new Error('Category not found');

	const updates: { name?: string; position?: number } = {};
	if (patch.name !== undefined) updates.name = patch.name;
	if (patch.position !== undefined) updates.position = patch.position;
	if (Object.keys(updates).length === 0) return;

	await db.update(category).set(updates).where(eq(category.id, id));
}

export async function deleteCategory(db: Database, userId: string, id: string): Promise<void> {
	const rows = await db
		.select({ id: category.id })
		.from(category)
		.where(and(eq(category.id, id), eq(category.userId, userId)))
		.limit(1);
	if (!rows.length) throw new Error('Category not found');

	await db.delete(category).where(eq(category.id, id));
}

export async function reorderCategories(
	db: Database,
	userId: string,
	orderedIds: Array<string>,
): Promise<void> {
	if (orderedIds.length === 0) return;

	// Verify all categories belong to user
	const userCats = await db
		.select({ id: category.id })
		.from(category)
		.where(eq(category.userId, userId));
	const userCatIds = new Set(userCats.map((c) => c.id));
	for (const id of orderedIds) {
		if (!userCatIds.has(id)) throw new Error('Category not found');
	}

	// Update each category's position to its index
	for (let i = 0; i < orderedIds.length; i++) {
		await db
			.update(category)
			.set({ position: i })
			.where(and(eq(category.id, orderedIds[i]), eq(category.userId, userId)));
	}
}

// ── Feed CRUD additions ────────────────────────────────────────────────────────

export async function updateFeed(
	db: Database,
	userId: string,
	feedId: string,
	patch: { customTitle?: string; categoryId?: string | null },
): Promise<void> {
	const rows = await db
		.select({ title: feed.title })
		.from(feed)
		.where(and(eq(feed.id, feedId), eq(feed.userId, userId)))
		.limit(1);
	if (!rows.length) throw new Error('Feed not found');

	const updates: { customTitle?: string | null; categoryId?: string | null } = {};
	if (patch.customTitle !== undefined) {
		// An empty title, or the Feed's own title, clears the custom title: the
		// Feed then shows its own title, including after the publisher renames it.
		const customTitle = patch.customTitle.trim();
		updates.customTitle = customTitle && customTitle !== rows[0].title ? customTitle : null;
	}
	if (patch.categoryId !== undefined) updates.categoryId = patch.categoryId;
	if (Object.keys(updates).length === 0) return;

	await db.update(feed).set(updates).where(eq(feed.id, feedId));
}

export async function deleteFeed(db: Database, userId: string, feedId: string): Promise<void> {
	const rows = await db
		.select({ id: feed.id })
		.from(feed)
		.where(and(eq(feed.id, feedId), eq(feed.userId, userId)))
		.limit(1);
	if (!rows.length) throw new Error('Feed not found');

	await db.delete(feed).where(eq(feed.id, feedId));
}

// ── Server function wrappers ───────────────────────────────────────────────────

export const getSidebarDataFn = createServerFn({ method: 'POST' }).handler(
	withAuth(async (userId) => getSidebarData(productionDb, userId)),
);

export const createCategoryFn = createServerFn({ method: 'POST' })
	.validator((data: { name: string }) => data)
	.handler(
		withMutation(async (userId: string, data: { name: string }) =>
			createCategory(productionDb, userId, data.name),
		),
	);

export const updateCategoryFn = createServerFn({ method: 'POST' })
	.validator((data: { id: string; name?: string; position?: number }) => data)
	.handler(
		withMutation(async (userId: string, data: { id: string; name?: string; position?: number }) =>
			updateCategory(productionDb, userId, data.id, { name: data.name, position: data.position }),
		),
	);

export const deleteCategoryFn = createServerFn({ method: 'POST' })
	.validator((data: { id: string }) => data)
	.handler(
		withMutation(async (userId: string, data: { id: string }) =>
			deleteCategory(productionDb, userId, data.id),
		),
	);

export const reorderCategoriesFn = createServerFn({ method: 'POST' })
	.validator((data: { orderedIds: Array<string> }) => data)
	.handler(
		withMutation(async (userId: string, data: { orderedIds: Array<string> }) =>
			reorderCategories(productionDb, userId, data.orderedIds),
		),
	);

export const updateFeedFn = createServerFn({ method: 'POST' })
	.validator((data: { feedId: string; customTitle?: string; categoryId?: string | null }) => data)
	.handler(
		withMutation(
			async (
				userId: string,
				data: { feedId: string; customTitle?: string; categoryId?: string | null },
			) =>
				updateFeed(productionDb, userId, data.feedId, {
					customTitle: data.customTitle,
					categoryId: data.categoryId,
				}),
		),
	);

export const deleteFeedFn = createServerFn({ method: 'POST' })
	.validator((data: { feedId: string }) => data)
	.handler(
		withMutation(async (userId: string, data: { feedId: string }) =>
			deleteFeed(productionDb, userId, data.feedId),
		),
	);
