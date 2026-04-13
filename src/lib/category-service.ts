import { createServerFn } from '@tanstack/react-start';
import { and, asc, count, eq, max, sql } from 'drizzle-orm';
import { db } from './db';
import type { CategoryNavItem, FeedNavItem, SidebarData } from '@/components/sidebar/types';
import { bookmark, category, feed, feedItem, readState } from '@/db/schema';

// ── getSidebarData ─────────────────────────────────────────────────────────────

export async function getSidebarData(userId: string): Promise<SidebarData> {
	const feedsRaw = await db
		.select({
			id: feed.id,
			title: feed.title,
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
			faviconUrl: f.faviconUrl,
			unreadCount: Math.max(0, f.unreadCount),
			healthStatus: f.healthStatus as 'active' | 'stale' | 'error',
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
		.select({ cnt: count() })
		.from(bookmark)
		.where(eq(bookmark.userId, userId));
	const bookmarkCount = bmRow.cnt;

	return { categories, uncategorized, totalUnread, bookmarkCount };
}

// ── Category CRUD ──────────────────────────────────────────────────────────────

export async function createCategory(userId: string, name: string): Promise<string> {
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

export async function deleteCategory(userId: string, id: string): Promise<void> {
	const rows = await db
		.select({ id: category.id })
		.from(category)
		.where(and(eq(category.id, id), eq(category.userId, userId)))
		.limit(1);
	if (!rows.length) throw new Error('Category not found');

	await db.delete(category).where(eq(category.id, id));
}

export async function reorderCategories(userId: string, orderedIds: Array<string>): Promise<void> {
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
	userId: string,
	feedId: string,
	patch: { customTitle?: string; categoryId?: string | null },
): Promise<void> {
	const rows = await db
		.select({ id: feed.id })
		.from(feed)
		.where(and(eq(feed.id, feedId), eq(feed.userId, userId)))
		.limit(1);
	if (!rows.length) throw new Error('Feed not found');

	const updates: { title?: string; categoryId?: string | null } = {};
	if (patch.customTitle !== undefined) updates.title = patch.customTitle;
	if (patch.categoryId !== undefined) updates.categoryId = patch.categoryId;
	if (Object.keys(updates).length === 0) return;

	await db.update(feed).set(updates).where(eq(feed.id, feedId));
}

export async function deleteFeed(userId: string, feedId: string): Promise<void> {
	const rows = await db
		.select({ id: feed.id })
		.from(feed)
		.where(and(eq(feed.id, feedId), eq(feed.userId, userId)))
		.limit(1);
	if (!rows.length) throw new Error('Feed not found');

	await db.delete(feed).where(eq(feed.id, feedId));
}

// ── Server function wrappers ───────────────────────────────────────────────────

export const getSidebarDataFn = createServerFn({ method: 'POST' })
	.inputValidator((data: { userId: string }) => data)
	.handler(async ({ data }) => getSidebarData(data.userId));

export const createCategoryFn = createServerFn({ method: 'POST' })
	.inputValidator((data: { userId: string; name: string }) => data)
	.handler(async ({ data }) => createCategory(data.userId, data.name));

export const updateCategoryFn = createServerFn({ method: 'POST' })
	.inputValidator((data: { userId: string; id: string; name?: string; position?: number }) => data)
	.handler(async ({ data }) =>
		updateCategory(data.userId, data.id, { name: data.name, position: data.position }),
	);

export const deleteCategoryFn = createServerFn({ method: 'POST' })
	.inputValidator((data: { userId: string; id: string }) => data)
	.handler(async ({ data }) => deleteCategory(data.userId, data.id));

export const reorderCategoriesFn = createServerFn({ method: 'POST' })
	.inputValidator((data: { userId: string; orderedIds: Array<string> }) => data)
	.handler(async ({ data }) => reorderCategories(data.userId, data.orderedIds));

export const updateFeedFn = createServerFn({ method: 'POST' })
	.inputValidator(
		(data: { userId: string; feedId: string; customTitle?: string; categoryId?: string | null }) =>
			data,
	)
	.handler(async ({ data }) =>
		updateFeed(data.userId, data.feedId, {
			customTitle: data.customTitle,
			categoryId: data.categoryId,
		}),
	);

export const deleteFeedFn = createServerFn({ method: 'POST' })
	.inputValidator((data: { userId: string; feedId: string }) => data)
	.handler(async ({ data }) => deleteFeed(data.userId, data.feedId));
