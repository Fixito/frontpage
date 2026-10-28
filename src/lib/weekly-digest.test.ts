import { afterEach, beforeEach, expect, it } from 'vitest';
import { selectDigestItems } from './ai-service';
import { getItems } from './items-service';
import type { Seed, TestDb } from '@/test/db';
import { createTestDb, seedTestDb } from '@/test/db';
import { feedItem, readState } from '@/db/schema';

let db: TestDb;
let seed: Seed;

const SINCE = new Date('2026-03-01T00:00:00Z');

beforeEach(async () => {
	db = await createTestDb();
	seed = await seedTestDb(db);
});

afterEach(async () => {
	await db.$client.close();
});

/** A Feed Item with a description, published the day after `SINCE`. */
function recentItem(id: string, feedId: string) {
	return {
		id,
		feedId,
		guid: id,
		url: `https://example.com/${id}`,
		title: id,
		description: `About ${id}`,
		publishedAt: new Date('2026-03-02T00:00:00Z'),
	};
}

it("selects the User's unread Feed Items, as the unread list does", async () => {
	const { userA, userB } = seed;
	await db
		.insert(feedItem)
		.values([
			recentItem('a-unread', userA.feeds.tech.id),
			recentItem('a-read', userA.feeds.design.id),
			recentItem('b-unread', userB.feeds.news.id),
		]);
	await db.insert(readState).values([
		{ userId: userA.id, itemId: 'a-read' },
		// Another User's read state leaves the Feed Item unread for User A.
		{ userId: userB.id, itemId: 'a-unread' },
	]);

	const digest = await selectDigestItems(db, userA.id, SINCE);
	const { items: unread } = await getItems(db, {
		userId: userA.id,
		scope: { kind: 'all' },
		unreadOnly: true,
	});

	expect(digest.map((i) => i.id)).toEqual(['a-unread']);
	expect(unread.map((i) => i.id)).toContain('a-unread');
	expect(unread.map((i) => i.id)).not.toContain('a-read');
});
