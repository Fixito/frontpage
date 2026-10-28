// Server-only, like the Feed Ingestion module it seeds through. Run by `pnpm seed`.
import { and, eq } from 'drizzle-orm';
import sampleFeeds from '../../data/sample-feeds.json' with { type: 'json' };
import { FeedAlreadyFollowedError, addFeed } from './feed-ingestion.server';
import type { Database } from './db';
import type { FetchFeedOptions } from './feed-fetcher';
import { category, user } from '@/db/schema';

const DEMO_EMAIL = 'guest-demo@frontpage.local';

interface SeedGuestOptions {
	fetchOptions?: FetchFeedOptions;
	log?: (line: string) => void;
}

/**
 * Seeds the Guest demo user with the sample feeds (`data/sample-feeds.json`),
 * each in its category, and returns the user's id. Every Feed goes through
 * `addFeed`, so re-running creates no duplicates: Feeds already followed are
 * skipped, and Feeds whose fetch failed last time are tried again.
 */
export async function seedGuest(
	db: Database,
	{ fetchOptions, log = console.log }: SeedGuestOptions = {},
): Promise<string> {
	const userId = await upsertDemoUser(db, log);

	for (const [position, { name, feeds }] of sampleFeeds.categories.entries()) {
		const categoryId = await upsertCategory(db, userId, name, position);
		log(`\n${name}`);

		for (const { title, feedUrl } of feeds) {
			try {
				await addFeed(db, userId, { url: feedUrl, categoryId }, fetchOptions);
				log(`  ✓ '${title}'`);
			} catch (err) {
				if (err instanceof FeedAlreadyFollowedError) {
					log(`  → '${title}' already followed — skipping`);
				} else {
					log(`  ✗ '${title}': ${err instanceof Error ? err.message : String(err)}`);
				}
			}
		}
	}

	return userId;
}

async function upsertDemoUser(db: Database, log: (line: string) => void): Promise<string> {
	const existing = await db
		.select({ id: user.id })
		.from(user)
		.where(eq(user.email, DEMO_EMAIL))
		.limit(1);
	if (existing.length > 0) {
		log(`Demo user already exists: ${existing[0].id}`);
		return existing[0].id;
	}

	const id = crypto.randomUUID();
	const now = new Date();
	await db.insert(user).values({
		id,
		name: 'Guest Demo',
		email: DEMO_EMAIL,
		emailVerified: true,
		createdAt: now,
		updatedAt: now,
	});
	log(`Created demo user: ${id}`);
	return id;
}

async function upsertCategory(
	db: Database,
	userId: string,
	name: string,
	position: number,
): Promise<string> {
	const existing = await db
		.select({ id: category.id })
		.from(category)
		.where(and(eq(category.userId, userId), eq(category.name, name)))
		.limit(1);
	if (existing.length > 0) return existing[0].id;

	const [inserted] = await db
		.insert(category)
		.values({ userId, name, position })
		.returning({ id: category.id });
	return inserted.id;
}
