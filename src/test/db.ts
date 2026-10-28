/**
 * DB-backed test harness: an in-memory PGLite database with the real schema.
 *
 * Server modules take their database as the first argument (`Database` from
 * `@/lib/db`), so a test passes the PGLite instance where server fns pass Neon:
 *
 * ```ts
 * import { afterEach, beforeEach, expect, it } from 'vitest';
 * import { createTestDb, seedTestDb } from '@/test/db';
 * import type { Seed, TestDb } from '@/test/db';
 * import { getSidebarData } from '@/lib/category-service';
 *
 * let db: TestDb;
 * let seed: Seed;
 *
 * beforeEach(async () => {
 *   db = await createTestDb();
 *   seed = await seedTestDb(db);
 * });
 * afterEach(() => db.$client.close());
 *
 * it('counts unread items', async () => {
 *   const data = await getSidebarData(db, seed.userA.id);
 *   expect(data.totalUnread).toBe(5);
 * });
 * ```
 *
 * Each `createTestDb()` call is a fresh, isolated database (about a second to
 * boot and migrate), so tests that mutate data should create one per test.
 * Read-only suites can share one via `beforeAll` / `afterAll`.
 */
import { fileURLToPath } from 'node:url';
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import * as schema from '@/db/schema';
import { bookmark, category, feed, feedItem, readState, user } from '@/db/schema';

const MIGRATIONS_FOLDER = fileURLToPath(new URL('../../drizzle', import.meta.url));

export type TestDb = Awaited<ReturnType<typeof createTestDb>>;

/** A fresh in-memory database with every Drizzle migration applied. */
export async function createTestDb() {
	const db = drizzle(new PGlite(), { schema });
	await migrate(db, { migrationsFolder: MIGRATIONS_FOLDER });
	return db;
}

// ── Seed ───────────────────────────────────────────────────────────────────────

const PUBLISHED = new Date('2026-01-15T09:00:00Z');

function daysBefore(date: Date, days: number): Date {
	return new Date(date.getTime() - days * 86_400_000);
}

/**
 * The fixed data `seedTestDb` inserts. IDs are stable strings, so tests can
 * refer to them directly or through the returned `Seed`.
 *
 * User A: categories Tech (position 0) and Design (position 1).
 * - Tech Feed (Tech): 3 items, `tech-1` read and bookmarked.
 * - Design Feed (Design): 2 items, `design-1` bookmarked.
 * - Loose Feed (uncategorized): 1 item.
 * Unread: Tech 2, Design 2, uncategorized 1, total 5. Bookmarks: 2.
 *
 * User B: category News.
 * - News Feed (News): 2 items, `news-1` read, `news-2` bookmarked.
 * - Tech Feed (uncategorized): the same URL as User A's Tech Feed, but its own
 *   Feed row with 1 item.
 * Unread: News 1, uncategorized 1, total 2. Bookmarks: 1.
 */
export const SEED = {
	userA: {
		id: 'user-a',
		name: 'Ada',
		email: 'ada@example.com',
		categories: {
			tech: { id: 'cat-a-tech', name: 'Tech', position: 0 },
			design: { id: 'cat-a-design', name: 'Design', position: 1 },
		},
		feeds: {
			tech: {
				id: 'feed-a-tech',
				title: 'Tech Feed',
				url: 'https://tech.example.com/feed.xml',
				categoryId: 'cat-a-tech',
				itemIds: ['item-a-tech-1', 'item-a-tech-2', 'item-a-tech-3'],
			},
			design: {
				id: 'feed-a-design',
				title: 'Design Feed',
				url: 'https://design.example.com/rss',
				categoryId: 'cat-a-design',
				itemIds: ['item-a-design-1', 'item-a-design-2'],
			},
			loose: {
				id: 'feed-a-loose',
				title: 'Loose Feed',
				url: 'https://loose.example.com/atom.xml',
				categoryId: null,
				itemIds: ['item-a-loose-1'],
			},
		},
		readItemIds: ['item-a-tech-1'],
		bookmarkedItemIds: ['item-a-tech-1', 'item-a-design-1'],
	},
	userB: {
		id: 'user-b',
		name: 'Bob',
		email: 'bob@example.com',
		categories: {
			news: { id: 'cat-b-news', name: 'News', position: 0 },
		},
		feeds: {
			news: {
				id: 'feed-b-news',
				title: 'News Feed',
				url: 'https://news.example.com/feed',
				categoryId: 'cat-b-news',
				itemIds: ['item-b-news-1', 'item-b-news-2'],
			},
			tech: {
				id: 'feed-b-tech',
				title: 'Tech Feed',
				url: 'https://tech.example.com/feed.xml',
				categoryId: null,
				itemIds: ['item-b-tech-1'],
			},
		},
		readItemIds: ['item-b-news-1'],
		bookmarkedItemIds: ['item-b-news-2'],
	},
} as const;

export type Seed = typeof SEED;

interface SeedUser {
	id: string;
	name: string;
	email: string;
	categories: Record<string, { id: string; name: string; position: number }>;
	feeds: Record<
		string,
		{
			id: string;
			title: string;
			url: string;
			categoryId: string | null;
			itemIds: ReadonlyArray<string>;
		}
	>;
	readItemIds: ReadonlyArray<string>;
	bookmarkedItemIds: ReadonlyArray<string>;
}

/** Inserts the two Users described by `SEED` and returns it. */
export async function seedTestDb(db: TestDb): Promise<Seed> {
	const now = new Date();
	const users: Array<SeedUser> = [SEED.userA, SEED.userB];

	for (const u of users) {
		await db.insert(user).values({
			id: u.id,
			name: u.name,
			email: u.email,
			emailVerified: true,
			createdAt: now,
			updatedAt: now,
		});

		await db
			.insert(category)
			.values(Object.values(u.categories).map((c) => ({ ...c, userId: u.id })));

		for (const f of Object.values(u.feeds)) {
			await db.insert(feed).values({
				id: f.id,
				userId: u.id,
				url: f.url,
				title: f.title,
				categoryId: f.categoryId,
				healthStatus: 'active',
				lastFetchedAt: now,
			});

			// Newest first: the first item is the most recently published.
			await db.insert(feedItem).values(
				f.itemIds.map((id, i) => ({
					id,
					feedId: f.id,
					guid: `${f.url}#${id}`,
					url: `${f.url.replace(/\/[^/]*$/, '')}/${id}`,
					title: `${f.title} item ${i + 1}`,
					publishedAt: daysBefore(PUBLISHED, i),
				})),
			);
		}

		await db.insert(readState).values(u.readItemIds.map((itemId) => ({ userId: u.id, itemId })));
		await db
			.insert(bookmark)
			.values(u.bookmarkedItemIds.map((itemId) => ({ userId: u.id, itemId })));
	}

	return SEED;
}
