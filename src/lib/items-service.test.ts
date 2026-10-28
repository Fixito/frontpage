import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { getItems } from './items-service';
import { getSidebarData } from './category-service';
import type { ItemScope } from './item-scope';
import type { Seed, TestDb } from '@/test/db';
import { bookmark, feedItem } from '@/db/schema';
import { SEED, createTestDb, seedTestDb } from '@/test/db';

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

async function listedIds(userId: string, scope: ItemScope, unreadOnly = false) {
	const { items } = await getItems(db, { userId, scope, unreadOnly });
	return items.map((i) => i.id).sort();
}

const { userA, userB } = SEED;

describe('getItems', () => {
	it.each<[string, ItemScope, Array<string>]>([
		[
			'all',
			{ kind: 'all' },
			[...userA.feeds.tech.itemIds, ...userA.feeds.design.itemIds, ...userA.feeds.loose.itemIds],
		],
		['one Feed', { kind: 'feed', feedId: userA.feeds.tech.id }, [...userA.feeds.tech.itemIds]],
		[
			'one Category',
			{ kind: 'category', categoryId: userA.categories.design.id },
			[...userA.feeds.design.itemIds],
		],
		['bookmarks', { kind: 'bookmarks' }, [...userA.bookmarkedItemIds]],
	])("lists the User's Feed Items in scope %s", async (_name, scope, expected) => {
		expect(await listedIds(seed.userA.id, scope)).toEqual([...expected].sort());
	});

	it.each<[string, ItemScope]>([
		['Feed', { kind: 'feed', feedId: userB.feeds.news.id }],
		['Category', { kind: 'category', categoryId: userB.categories.news.id }],
	])("lists nothing for another User's %s", async (_name, scope) => {
		const result = await getItems(db, { userId: seed.userA.id, scope });

		expect(result.items).toEqual([]);
		expect(result.totalCount).toBe(0);
		expect(result.feedInfo).toBeNull();
	});

	it("never lists another User's Feed Items", async () => {
		expect(await listedIds(seed.userB.id, { kind: 'all' })).toEqual(
			[...userB.feeds.news.itemIds, ...userB.feeds.tech.itemIds].sort(),
		);
		expect(await listedIds(seed.userB.id, { kind: 'bookmarks' })).toEqual([
			...userB.bookmarkedItemIds,
		]);
	});
});

describe('Sidebar Data counts', () => {
	it.each([SEED.userA.id, SEED.userB.id])(
		'match the unread Feed Items listed in each scope (User %s)',
		async (userId) => {
			const data = await getSidebarData(db, userId);
			const unreadListed = async (scope: ItemScope) =>
				(await getItems(db, { userId, scope, unreadOnly: true })).totalCount;

			expect(data.totalUnread).toBe(await unreadListed({ kind: 'all' }));
			for (const c of data.categories) {
				expect(c.unreadCount).toBe(await unreadListed({ kind: 'category', categoryId: c.id }));
			}
			for (const f of [...data.categories.flatMap((c) => c.feeds), ...data.uncategorized]) {
				expect(f.unreadCount).toBe(await unreadListed({ kind: 'feed', feedId: f.id }));
			}
		},
	);

	it('lists exactly the unread Feed Items', async () => {
		expect(
			await listedIds(seed.userA.id, { kind: 'feed', feedId: userA.feeds.tech.id }, true),
		).toEqual(userA.feeds.tech.itemIds.slice(1));
		expect((await getSidebarData(db, seed.userA.id)).totalUnread).toBe(5);
	});

	it('counts as many Bookmarks as the Bookmarks view lists', async () => {
		const data = await getSidebarData(db, seed.userA.id);
		const { items, totalCount } = await getItems(db, {
			userId: seed.userA.id,
			scope: { kind: 'bookmarks' },
		});

		expect(data.bookmarkCount).toBe(2);
		expect(totalCount).toBe(2);
		expect(items).toHaveLength(2);
	});
});

describe("another User's Feed Item bookmarked", () => {
	it('is neither counted nor listed', async () => {
		const isolatedDb = await createTestDb();
		try {
			await seedTestDb(isolatedDb);
			// A bookmark row on User B's Feed Item, as a bookmark mutation without an ownership check writes.
			await isolatedDb
				.insert(bookmark)
				.values({ userId: userA.id, itemId: userB.feeds.news.itemIds[0] });

			const data = await getSidebarData(isolatedDb, userA.id);
			const { totalCount } = await getItems(isolatedDb, {
				userId: userA.id,
				scope: { kind: 'bookmarks' },
			});

			expect(data.bookmarkCount).toBe(2);
			expect(totalCount).toBe(2);
		} finally {
			await isolatedDb.$client.close();
		}
	});
});

describe('getItems pagination', () => {
	it('has more until the page that reaches the total', async () => {
		const scope: ItemScope = { kind: 'feed', feedId: userA.feeds.design.id };
		const page = (n: number, pageSize: number) =>
			getItems(db, { userId: seed.userA.id, scope, page: n, pageSize });

		expect(await page(1, 2)).toMatchObject({ totalCount: 2, hasMore: false });
		expect(await page(1, 1)).toMatchObject({ totalCount: 2, hasMore: true });
		expect(await page(2, 1)).toMatchObject({ totalCount: 2, hasMore: false });
	});

	it('returns every Feed Item once across pages, newest first and undated last', async () => {
		const isolatedDb = await createTestDb();
		try {
			await seedTestDb(isolatedDb);
			const feedId = userA.feeds.tech.id;
			await isolatedDb.insert(feedItem).values({
				id: 'newest',
				feedId,
				guid: 'newest',
				url: 'https://tech.example.com/newest',
				title: 'Newest',
				publishedAt: new Date('2026-02-01T00:00:00Z'),
			});
			// Undated Feed Items stored by one ingestion share their fetchedAt.
			await isolatedDb.insert(feedItem).values(
				['undated-1', 'undated-2', 'undated-3'].map((id) => ({
					id,
					feedId,
					guid: id,
					url: `https://tech.example.com/${id}`,
					title: id,
				})),
			);

			const pages = [];
			for (let page = 1; page <= 3; page++) {
				pages.push(
					await getItems(isolatedDb, {
						userId: userA.id,
						scope: { kind: 'feed', feedId },
						page,
						pageSize: 3,
					}),
				);
			}
			const ids = pages.flatMap((p) => p.items.map((i) => i.id));

			expect(pages.map((p) => [p.totalCount, p.hasMore])).toEqual([
				[7, true],
				[7, true],
				[7, false],
			]);
			expect(ids.slice(0, 4)).toEqual(['newest', ...userA.feeds.tech.itemIds]);
			expect(ids.slice(4).sort()).toEqual(['undated-1', 'undated-2', 'undated-3']);
		} finally {
			await isolatedDb.$client.close();
		}
	});
});
