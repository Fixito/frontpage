import { afterEach, beforeEach, expect, it } from 'vitest';
import { seedGuest } from './guest-seed.server';
import { getSidebarData } from './category-service';
import type { TestDb } from '@/test/db';
import { createTestDb } from '@/test/db';
import { network } from '@/test/network';

let db: TestDb;

beforeEach(async () => {
	db = await createTestDb();
});

afterEach(async () => {
	await db.$client.close();
});

// ── Fixtures ───────────────────────────────────────────────────────────────────

const RECENTLY = new Date(Date.now() - 86_400_000).toUTCString();

/** Serves a two-item RSS document at every URL but `failing`, which answers 404. */
function sampleFeedsNetwork(failing?: string) {
	return network((url) =>
		Promise.resolve(
			url === failing
				? new Response('gone', { status: 404, statusText: 'Not Found' })
				: new Response(
						`<?xml version="1.0"?>
<rss version="2.0">
	<channel>
		<title>Feed at ${url}</title>
		<link>${url}</link>
		<item><guid>${url}#1</guid><title>One</title><link>${url}1</link><pubDate>${RECENTLY}</pubDate></item>
		<item><guid>${url}#2</guid><title>Two</title><link>${url}2</link><pubDate>${RECENTLY}</pubDate></item>
	</channel>
</rss>`,
						{ status: 200 },
					),
		),
	);
}

const silent = () => {};

async function sidebarOf(userId: string) {
	const data = await getSidebarData(db, userId);
	return {
		categories: data.categories.map((c) => ({ name: c.name, feedCount: c.feeds.length })),
		urls: data.categories.flatMap((c) => c.feeds.map((f) => f.url)),
		totalUnread: data.totalUnread,
	};
}

// ── Tests ──────────────────────────────────────────────────────────────────────

it('seeds the Guest demo user with the sample feeds, by category', async () => {
	const userId = await seedGuest(db, { fetchOptions: sampleFeedsNetwork().options, log: silent });

	const sidebar = await sidebarOf(userId);
	expect(sidebar.categories).toEqual([
		{ name: 'Frontend', feedCount: 6 },
		{ name: 'Design', feedCount: 5 },
		{ name: 'Backend & DevOps', feedCount: 4 },
		{ name: 'General Tech', feedCount: 2 },
		{ name: 'AI & ML', feedCount: 2 },
	]);
	expect(sidebar.urls).toContain('https://css-tricks.com/feed/');
	expect(sidebar.urls).toContain('https://huggingface.co/blog/feed.xml');
	expect(sidebar.totalUnread).toBe(19 * 2);
});

it('creates no duplicates when run again', async () => {
	const first = await seedGuest(db, { fetchOptions: sampleFeedsNetwork().options, log: silent });
	const before = await sidebarOf(first);

	const second = await seedGuest(db, { fetchOptions: sampleFeedsNetwork().options, log: silent });

	expect(second).toBe(first);
	expect(await sidebarOf(second)).toEqual(before);
});

it('skips a sample feed that fails, and adds it on the next run', async () => {
	const deadUrl = 'https://hnrss.org/best';

	const userId = await seedGuest(db, {
		fetchOptions: sampleFeedsNetwork(deadUrl).options,
		log: silent,
	});
	expect((await sidebarOf(userId)).urls).not.toContain(deadUrl);

	await seedGuest(db, { fetchOptions: sampleFeedsNetwork().options, log: silent });
	expect((await sidebarOf(userId)).urls).toContain(deadUrl);
});
