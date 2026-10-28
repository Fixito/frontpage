import { eq } from 'drizzle-orm';
import { afterEach, beforeEach, expect, it } from 'vitest';
import { bookmark, feedItem, readState } from './schema';
import type { Seed, TestDb } from '@/test/db';
import { createTestDb, migrateTestDb, seedTestDb } from '@/test/db';
import { getItems } from '@/lib/items-service';

// Migration 0002 makes Feed Items unique per (Feed, guid). A database from
// before it can hold duplicates, which the migration merges first.

let db: TestDb;
let seed: Seed;

beforeEach(async () => {
	db = await createTestDb({ migrateUpTo: '0001_feed_custom_title' });
	seed = await seedTestDb(db);
});

afterEach(async () => {
	await db.$client.close();
});

/** Inserts a later-fetched copy of a seeded Feed Item: same Feed, same guid. */
async function duplicate(itemId: string, copyId: string) {
	const [original] = await db.select().from(feedItem).where(eq(feedItem.id, itemId));
	await db.insert(feedItem).values({
		...original,
		id: copyId,
		fetchedAt: new Date(original.fetchedAt.getTime() + 60_000),
	});
}

it('merges duplicate Feed Items and keeps their read state and bookmarks', async () => {
	const { userA } = seed;
	const [readAndBookmarked, unread] = userA.feeds.tech.itemIds;
	// A copy of a read, bookmarked item, also read: both rows collide on merge.
	await duplicate(readAndBookmarked, 'copy-of-read');
	await db.insert(readState).values({ userId: userA.id, itemId: 'copy-of-read' });
	// Two copies of an unread item: one read, the other bookmarked.
	await duplicate(unread, 'copy-read');
	await duplicate(unread, 'copy-bookmarked');
	await db.insert(readState).values({ userId: userA.id, itemId: 'copy-read' });
	await db.insert(bookmark).values({ userId: userA.id, itemId: 'copy-bookmarked' });

	await migrateTestDb(db);

	const { items } = await getItems(db, { userId: userA.id, feedId: userA.feeds.tech.id });
	expect(items.map((i) => ({ id: i.id, isRead: i.isRead, isBookmarked: i.isBookmarked }))).toEqual([
		{ id: readAndBookmarked, isRead: true, isBookmarked: true },
		{ id: unread, isRead: true, isBookmarked: true },
		{ id: userA.feeds.tech.itemIds[2], isRead: false, isBookmarked: false },
	]);
});

it('still lets two Feeds carry the same guid', async () => {
	// User B's Tech Feed shares User A's URL, so a shared guid is legitimate.
	const [itemA] = await db
		.select()
		.from(feedItem)
		.where(eq(feedItem.id, seed.userA.feeds.loose.itemIds[0]));
	await db.insert(feedItem).values({
		...itemA,
		id: 'same-guid-other-feed',
		feedId: seed.userB.feeds.tech.id,
	});

	await migrateTestDb(db);

	const { totalCount } = await getItems(db, {
		userId: seed.userB.id,
		feedId: seed.userB.feeds.tech.id,
	});
	expect(totalCount).toBe(2);
});
