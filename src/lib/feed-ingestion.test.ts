import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ingestFeed } from './feed-ingestion.server';
import { getItems } from './items-service';
import { getSidebarData } from './category-service';
import type { FetchFeedOptions } from './feed-fetcher';
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

// ── Fixtures ───────────────────────────────────────────────────────────────────

function daysAgo(days: number): Date {
	return new Date(Date.now() - days * 86_400_000);
}

/** An RSS 2.0 document whose newest item was published at `published`. */
const rss2 = (published = daysAgo(1)) => `<?xml version="1.0"?>
<rss version="2.0">
	<channel>
		<title>Tech Feed</title>
		<link>https://tech.example.com</link>
		<item>
			<guid>https://tech.example.com/posts/first</guid>
			<title>First post</title>
			<link>https://tech.example.com/posts/first</link>
			<pubDate>${published.toUTCString()}</pubDate>
		</item>
		<item>
			<guid>https://tech.example.com/posts/second</guid>
			<title>Second post</title>
			<link>https://tech.example.com/posts/second</link>
			<pubDate>${daysAgo(40).toUTCString()}</pubDate>
		</item>
	</channel>
</rss>`;

const ATOM = `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
	<title>Tech Feed</title>
	<link href="https://tech.example.com/"/>
	<entry>
		<id>tag:tech.example.com,2026:atom-entry</id>
		<title>Atom entry</title>
		<link href="https://tech.example.com/atom-entry"/>
		<updated>${daysAgo(1).toISOString()}</updated>
	</entry>
</feed>`;

const RDF = `<?xml version="1.0"?>
<rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#" xmlns="http://purl.org/rss/1.0/" xmlns:dc="http://purl.org/dc/elements/1.1/">
	<channel rdf:about="https://tech.example.com/">
		<title>Tech Feed</title>
		<link>https://tech.example.com/</link>
	</channel>
	<item rdf:about="https://tech.example.com/rdf-item">
		<title>RDF item</title>
		<link>https://tech.example.com/rdf-item</link>
		<dc:date>${daysAgo(1).toISOString()}</dc:date>
	</item>
</rdf:RDF>`;

/** Two items with neither guid nor link, as some hand-written feeds ship them. */
const RSS2_WITHOUT_IDS = `<?xml version="1.0"?>
<rss version="2.0">
	<channel>
		<title>Tech Feed</title>
		<item>
			<title>Release notes</title>
			<pubDate>${daysAgo(2).toUTCString()}</pubDate>
		</item>
		<item>
			<title>Changelog</title>
			<pubDate>${daysAgo(3).toUTCString()}</pubDate>
		</item>
	</channel>
</rss>`;

// ── Fake network ───────────────────────────────────────────────────────────────

/** Fetch options whose network answers every request with `respond`. */
function network(respond: (url: string, init?: RequestInit) => Promise<Response>) {
	const calls: Array<string> = [];
	const options: FetchFeedOptions = {
		fetch: (input, init) => {
			const url = input instanceof Request ? input.url : String(input);
			calls.push(url);
			return respond(url, init);
		},
		resolveHost: () => Promise.resolve(['93.184.215.14']),
		retryDelaysMs: [0, 0, 0],
	};
	return { options, calls };
}

function serving(xml: string) {
	return network(() => Promise.resolve(new Response(xml, { status: 200 })));
}

function techFeed() {
	return { id: seed.userA.feeds.tech.id, url: seed.userA.feeds.tech.url };
}

function sidebarFeed(data: SidebarData) {
	return [...data.categories.flatMap((c) => c.feeds), ...data.uncategorized].find(
		(f) => f.id === seed.userA.feeds.tech.id,
	);
}

async function techItems() {
	return getItems(db, { userId: seed.userA.id, feedId: seed.userA.feeds.tech.id });
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('ingestFeed', () => {
	it("stores a Feed's new items and reports it healthy", async () => {
		const outcome = await ingestFeed(db, techFeed(), serving(rss2()).options);

		expect(outcome).toEqual({ status: 'active', newItemCount: 2, error: null });
		const { items } = await techItems();
		expect(items.map((i) => i.title)).toContain('First post');
		expect(items.map((i) => i.title)).toContain('Second post');
	});

	it.each([
		['Atom', ATOM, 'Atom entry'],
		['RDF', RDF, 'RDF item'],
	])('stores the items of an %s Feed', async (_format, xml, title) => {
		const outcome = await ingestFeed(db, techFeed(), serving(xml).options);

		expect(outcome).toEqual({ status: 'active', newItemCount: 1, error: null });
		expect((await techItems()).items.map((i) => i.title)).toContain(title);
	});

	it('adds no items when the same document is ingested again', async () => {
		const { options } = serving(rss2());
		await ingestFeed(db, techFeed(), options);
		const before = await techItems();

		const outcome = await ingestFeed(db, techFeed(), options);

		expect(outcome.newItemCount).toBe(0);
		expect((await techItems()).totalCount).toBe(before.totalCount);
	});

	it('stores each item once when two ingests of a Feed run concurrently', async () => {
		const { options } = serving(rss2());
		const { totalCount: seeded } = await techItems();

		const outcomes = await Promise.all([
			ingestFeed(db, techFeed(), options),
			ingestFeed(db, techFeed(), options),
		]);

		expect((await techItems()).totalCount).toBe(seeded + 2);
		expect(outcomes.map((o) => o.newItemCount).sort()).toEqual([0, 2]);
	});

	it('keeps the identity of items without guid or link across ingests', async () => {
		const { options } = serving(RSS2_WITHOUT_IDS);

		const first = await ingestFeed(db, techFeed(), options);
		const firstIds = (await techItems()).items.map((i) => i.id);
		await new Promise((resolve) => setTimeout(resolve, 5));
		const second = await ingestFeed(db, techFeed(), options);

		expect(first.newItemCount).toBe(2);
		expect(second.newItemCount).toBe(0);
		expect((await techItems()).items.map((i) => i.id)).toEqual(firstIds);
	});

	it('marks the Feed in error and keeps its items when the server fails', async () => {
		const { options, calls } = network(() =>
			Promise.resolve(new Response('oops', { status: 500, statusText: 'Internal Server Error' })),
		);
		const before = await techItems();

		const outcome = await ingestFeed(db, techFeed(), options);

		expect(outcome).toEqual({
			status: 'error',
			newItemCount: 0,
			error: 'HTTP 500 Internal Server Error',
		});
		expect(calls).toHaveLength(3);
		const after = await techItems();
		expect(after.items.map((i) => i.id)).toEqual(before.items.map((i) => i.id));
		expect(after.feedInfo).toMatchObject({
			healthStatus: 'error',
			errorMessage: 'HTTP 500 Internal Server Error',
		});
	});

	it('marks the Feed in error after a single attempt when the request times out', async () => {
		const { options, calls } = network(
			(_url, init) =>
				new Promise((_resolve, reject) => {
					init?.signal?.addEventListener('abort', () =>
						reject(new DOMException('The operation was aborted.', 'AbortError')),
					);
				}),
		);

		const outcome = await ingestFeed(db, techFeed(), { ...options, timeoutMs: 20 });

		expect(outcome).toEqual({
			status: 'error',
			newItemCount: 0,
			error: 'Request timed out after 0.02s',
		});
		expect(calls).toHaveLength(1);
	});

	it('does not retry a client error', async () => {
		const { options, calls } = network(() =>
			Promise.resolve(new Response('gone', { status: 404, statusText: 'Not Found' })),
		);

		const outcome = await ingestFeed(db, techFeed(), options);

		expect(outcome).toEqual({ status: 'error', newItemCount: 0, error: 'HTTP 404 Not Found' });
		expect(calls).toHaveLength(1);
	});

	it('marks the Feed in error when its document is not a feed', async () => {
		const outcome = await ingestFeed(db, techFeed(), serving('<html><body><p>Oops</html>').options);

		expect(outcome.status).toBe('error');
		expect(outcome.error).toMatch(/feed format|parse error/i);
		expect((await techItems()).feedInfo?.healthStatus).toBe('error');
	});

	it('shows the Feed as stale in the sidebar when its newest item is over 30 days old', async () => {
		const outcome = await ingestFeed(db, techFeed(), serving(rss2(daysAgo(31))).options);

		expect(outcome).toEqual({ status: 'stale', newItemCount: 2, error: null });
		expect(sidebarFeed(await getSidebarData(db, seed.userA.id))?.healthStatus).toBe('stale');
	});

	it('shows a stale Feed as active again once it publishes', async () => {
		await ingestFeed(db, techFeed(), serving(rss2(daysAgo(31))).options);

		// ATOM carries a new entry, published yesterday.
		const outcome = await ingestFeed(db, techFeed(), serving(ATOM).options);

		expect(outcome.status).toBe('active');
		expect(sidebarFeed(await getSidebarData(db, seed.userA.id))?.healthStatus).toBe('active');
	});
});
