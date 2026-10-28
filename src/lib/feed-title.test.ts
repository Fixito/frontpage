import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { getSidebarData, updateFeed } from './category-service';
import { refreshFeed } from './feed-ingestion.server';
import { getItems } from './items-service';
import type { FeedFetcher } from './feed-ingestion.server';
import type { SidebarData } from '@/components/sidebar/types';
import type { Seed, TestDb } from '@/test/db';
import { createTestDb, seedTestDb } from '@/test/db';

let db: TestDb;
let seed: Seed;

beforeEach(async () => {
	db = await createTestDb();
	seed = await seedTestDb(db);
});

afterEach(async () => {
	await db.$client.close();
});

/** A fetcher that serves an RSS document titled `title`, at the requested URL. */
function serveFeedTitled(title: string): FeedFetcher {
	return (url) =>
		Promise.resolve({
			xml: `<?xml version="1.0"?><rss version="2.0"><channel><title>${title}</title><link>${url}</link></channel></rss>`,
			finalUrl: url,
			wasRedirected: false,
			etag: null,
			lastModified: null,
		});
}

function sidebarTitle(data: SidebarData, feedId: string): string | undefined {
	return [...data.categories.flatMap((c) => c.feeds), ...data.uncategorized].find(
		(f) => f.id === feedId,
	)?.title;
}

describe('a Feed title edited by the User', () => {
	it('survives a refresh of the Feed', async () => {
		const { userA } = seed;
		const feedId = userA.feeds.tech.id;

		await updateFeed(db, userA.id, feedId, { customTitle: 'My tech reads' });
		await refreshFeed(db, userA.id, feedId, serveFeedTitled('Tech Feed'));

		expect(sidebarTitle(await getSidebarData(db, userA.id), feedId)).toBe('My tech reads');
	});

	it("is cleared by an empty title, so the Feed's own latest title shows", async () => {
		const { userA } = seed;
		const feedId = userA.feeds.tech.id;
		await updateFeed(db, userA.id, feedId, { customTitle: 'My tech reads' });

		await updateFeed(db, userA.id, feedId, { customTitle: '   ' });
		await refreshFeed(db, userA.id, feedId, serveFeedTitled('Tech Feed Weekly'));

		expect(sidebarTitle(await getSidebarData(db, userA.id), feedId)).toBe('Tech Feed Weekly');
	});

	it("is not kept when it matches the Feed's own title, so later renames show", async () => {
		const { userA } = seed;
		const feedId = userA.feeds.tech.id;

		await updateFeed(db, userA.id, feedId, { customTitle: userA.feeds.tech.title });
		await refreshFeed(db, userA.id, feedId, serveFeedTitled('Tech Feed Weekly'));

		expect(sidebarTitle(await getSidebarData(db, userA.id), feedId)).toBe('Tech Feed Weekly');
	});

	it("names the Feed on its Feed Items and in the Feed's item list", async () => {
		const { userA } = seed;
		const feedId = userA.feeds.tech.id;

		await updateFeed(db, userA.id, feedId, { customTitle: 'My tech reads' });
		const { items, feedInfo } = await getItems(db, { userId: userA.id, feedId });

		expect(items.map((item) => item.feedTitle)).toEqual([
			'My tech reads',
			'My tech reads',
			'My tech reads',
		]);
		expect(feedInfo?.title).toBe('My tech reads');
	});
});
