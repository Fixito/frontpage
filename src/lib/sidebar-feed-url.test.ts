import { afterAll, beforeAll, expect, it } from 'vitest';
import { getSidebarData } from './category-service';
import type { Seed, TestDb } from '@/test/db';
import { createTestDb, seedTestDb } from '@/test/db';

let db: TestDb;
let seed: Seed;

beforeAll(async () => {
	db = await createTestDb();
	seed = await seedTestDb(db);
});

afterAll(async () => {
	await db.$client.close();
});

it('Sidebar Data carries each Feed URL, for the edit dialog', async () => {
	const { userA } = seed;

	const data = await getSidebarData(db, userA.id);

	const urls = Object.fromEntries(
		[...data.categories.flatMap((c) => c.feeds), ...data.uncategorized].map((f) => [f.id, f.url]),
	);
	expect(urls).toEqual({
		[userA.feeds.tech.id]: 'https://tech.example.com/feed.xml',
		[userA.feeds.design.id]: 'https://design.example.com/rss',
		[userA.feeds.loose.id]: 'https://loose.example.com/atom.xml',
	});
});
