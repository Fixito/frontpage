import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { getSidebarData } from './category-service';
import type { SidebarData } from '@/components/sidebar/types';
import type { Seed, TestDb } from '@/test/db';
import { createTestDb, seedTestDb } from '@/test/db';

let db: TestDb;
let seed: Seed;

// Read-only suite: one seeded database is enough.
beforeAll(async () => {
	db = await createTestDb();
	seed = await seedTestDb(db);
});

afterAll(async () => {
	await db.$client.close();
});

function sidebarFeedIds(data: SidebarData): Array<string> {
	return [...data.categories.flatMap((c) => c.feeds), ...data.uncategorized]
		.map((f) => f.id)
		.sort();
}

function seededIds(records: Record<string, { id: string }>): Array<string> {
	return Object.values(records)
		.map((r) => r.id)
		.sort();
}

describe('getSidebarData', () => {
	it("returns one User's Categories, Feeds and counts", async () => {
		const { userA } = seed;

		const data = await getSidebarData(db, userA.id);

		expect(data.categories).toEqual([
			{
				id: userA.categories.tech.id,
				name: 'Tech',
				unreadCount: 2,
				feeds: [expect.objectContaining({ id: userA.feeds.tech.id, unreadCount: 2 })],
			},
			{
				id: userA.categories.design.id,
				name: 'Design',
				unreadCount: 2,
				feeds: [expect.objectContaining({ id: userA.feeds.design.id, unreadCount: 2 })],
			},
		]);
		expect(data.uncategorized).toEqual([
			expect.objectContaining({ id: userA.feeds.loose.id, unreadCount: 1 }),
		]);
		expect(data.totalUnread).toBe(5);
		expect(data.bookmarkCount).toBe(2);
	});

	it("never includes another User's Feeds or Categories", async () => {
		const { userA, userB } = seed;

		const a = await getSidebarData(db, userA.id);
		const b = await getSidebarData(db, userB.id);

		// Both Users subscribe to the same Tech Feed URL, as separate Feed rows.
		expect(sidebarFeedIds(a)).toEqual(seededIds(userA.feeds));
		expect(a.categories.map((c) => c.id).sort()).toEqual(seededIds(userA.categories));

		expect(sidebarFeedIds(b)).toEqual(seededIds(userB.feeds));
		expect(b.categories.map((c) => c.id).sort()).toEqual(seededIds(userB.categories));
		expect(b.totalUnread).toBe(2);
		expect(b.bookmarkCount).toBe(1);
	});
});
