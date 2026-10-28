import { eq } from 'drizzle-orm';
import { afterEach, beforeEach, expect, it } from 'vitest';
import { bookmark, feed, feedItem, readState } from './schema';
import type { Seed, TestDb } from '@/test/db';
import { createTestDb, migrateTestDb, seedTestDb } from '@/test/db';
import { getItems } from '@/lib/items-service';
import { getSidebarData } from '@/lib/category-service';

// Migration 0003 makes Feeds unique per (User, URL). A database from before it
// can hold a User's duplicate Feeds, which the migration merges first.

let db: TestDb;
let seed: Seed;

beforeEach(async () => {
	db = await createTestDb({ migrateUpTo: '0002_feed_item_unique_guid' });
	seed = await seedTestDb(db);
});

afterEach(async () => {
	await db.$client.close();
});

/** Adds a later copy of User A's Tech Feed: one item it shares, read and bookmarked, one it alone has. */
async function duplicateTechFeed() {
	const { tech } = seed.userA.feeds;
	const [original] = await db.select().from(feed).where(eq(feed.id, tech.id));
	await db.insert(feed).values({
		...original,
		id: 'copy-of-tech',
		createdAt: new Date(original.createdAt.getTime() + 60_000),
	});
	const [unreadItem] = await db.select().from(feedItem).where(eq(feedItem.id, tech.itemIds[1]));
	await db.insert(feedItem).values([
		{ ...unreadItem, id: 'copy-shared', feedId: 'copy-of-tech' },
		{
			...unreadItem,
			id: 'copy-only',
			feedId: 'copy-of-tech',
			guid: `${tech.url}#copy-only`,
			title: 'Only in the copy',
			publishedAt: new Date(unreadItem.publishedAt!.getTime() - 12 * 3_600_000),
		},
	]);
	await db.insert(readState).values({ userId: seed.userA.id, itemId: 'copy-shared' });
	await db.insert(bookmark).values([
		{ userId: seed.userA.id, itemId: 'copy-shared' },
		{ userId: seed.userA.id, itemId: 'copy-only' },
	]);
}

it("merges a User's duplicate Feeds and keeps their items, read state and bookmarks", async () => {
	const { userA } = seed;
	await duplicateTechFeed();

	await migrateTestDb(db);

	const sidebar = await getSidebarData(db, userA.id);
	const feeds = [...sidebar.categories.flatMap((c) => c.feeds), ...sidebar.uncategorized];
	expect(feeds.filter((f) => f.url === userA.feeds.tech.url).map((f) => f.id)).toEqual([
		userA.feeds.tech.id,
	]);
	const { items } = await getItems(db, { userId: userA.id, feedId: userA.feeds.tech.id });
	expect(items.map((i) => ({ id: i.id, isRead: i.isRead, isBookmarked: i.isBookmarked }))).toEqual([
		{ id: userA.feeds.tech.itemIds[0], isRead: true, isBookmarked: true },
		{ id: userA.feeds.tech.itemIds[1], isRead: true, isBookmarked: true },
		{ id: 'copy-only', isRead: false, isBookmarked: true },
		{ id: userA.feeds.tech.itemIds[2], isRead: false, isBookmarked: false },
	]);
});

it('still lets two Users follow the same URL', async () => {
	// User B's Tech Feed shares User A's URL.
	await migrateTestDb(db);

	const { totalCount } = await getItems(db, {
		userId: seed.userB.id,
		feedId: seed.userB.feeds.tech.id,
	});
	expect(totalCount).toBe(1);
});
