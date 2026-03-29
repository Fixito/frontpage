// src/scripts/seed-guest.ts
// Run once: pnpm seed
// Output: GUEST_DEMO_USER_ID=<id> — add this to your .env file

import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { and, eq } from 'drizzle-orm';
import { fetchFeed } from '../lib/feed-fetcher';
import { parseFeed } from '../lib/feed-parser';
import { category, feed, feedItem, user } from '../db/schema';
import type { NewFeedItem } from '../db/schema';

// ── DB connection (standalone — not using the lazy proxy from db.ts) ──────────

const databaseUrl = process.env['DATABASE_URL'];
if (!databaseUrl) throw new Error('DATABASE_URL not set');
const sql = neon(databaseUrl);
const db = drizzle(sql);

// ── Curated feed data ─────────────────────────────────────────────────────────

const DEMO_EMAIL = 'guest-demo@frontpage.local';

interface SeedFeed {
	title: string;
	feedUrl: string;
	siteUrl: string;
	description: string;
}

interface SeedCategory {
	name: string;
	feeds: Array<SeedFeed>;
}

const SEED_CATEGORIES: Array<SeedCategory> = [
	{
		name: 'Frontend',
		feeds: [
			{
				title: 'CSS-Tricks',
				feedUrl: 'https://css-tricks.com/feed/',
				siteUrl: 'https://css-tricks.com/',
				description: 'Tips, Tricks, and Techniques on using Cascading Style Sheets.',
			},
			{
				title: 'Smashing Magazine',
				feedUrl: 'https://www.smashingmagazine.com/feed/',
				siteUrl: 'https://www.smashingmagazine.com/',
				description: 'For web designers and developers.',
			},
			{
				title: 'Josh W. Comeau',
				feedUrl: 'https://www.joshwcomeau.com/rss.xml',
				siteUrl: 'https://www.joshwcomeau.com/',
				description: 'Friendly tutorials for developers.',
			},
			{
				title: 'Kent C. Dodds',
				feedUrl: 'https://kentcdodds.com/blog/rss.xml',
				siteUrl: 'https://kentcdodds.com/',
				description: 'Helping people make the world a better place through quality software.',
			},
			{
				title: 'web.dev',
				feedUrl: 'https://web.dev/feed.xml',
				siteUrl: 'https://web.dev/',
				description: 'Building a better web, together.',
			},
			{
				title: 'MDN Blog',
				feedUrl: 'https://developer.mozilla.org/en-US/blog/rss.xml',
				siteUrl: 'https://developer.mozilla.org/en-US/blog/',
				description: 'The MDN Web Docs blog.',
			},
		],
	},
	{
		name: 'Design',
		feeds: [
			{
				title: 'Sidebar.io',
				feedUrl: 'https://sidebar.io/feed.xml',
				siteUrl: 'https://sidebar.io/',
				description: 'The five best design links, every day.',
			},
			{
				title: 'Nielsen Norman Group',
				feedUrl: 'https://www.nngroup.com/feed/rss/',
				siteUrl: 'https://www.nngroup.com/',
				description: 'Evidence-based user experience research, training, and consulting.',
			},
			{
				title: 'Figma Blog',
				feedUrl: 'https://www.figma.com/blog/feed/',
				siteUrl: 'https://www.figma.com/blog/',
				description: 'Stories about how products are designed at Figma and beyond.',
			},
			{
				title: 'A List Apart',
				feedUrl: 'https://alistapart.com/main/feed/',
				siteUrl: 'https://alistapart.com/',
				description: 'For people who make websites.',
			},
			{
				title: 'UX Collective',
				feedUrl: 'https://uxdesign.cc/feed',
				siteUrl: 'https://uxdesign.cc/',
				description: 'Curated stories on user experience, usability, and product design.',
			},
		],
	},
	{
		name: 'Backend & DevOps',
		feeds: [
			{
				title: 'Cloudflare Blog',
				feedUrl: 'https://blog.cloudflare.com/rss/',
				siteUrl: 'https://blog.cloudflare.com/',
				description: 'The Cloudflare Blog.',
			},
			{
				title: 'Vercel Blog',
				feedUrl: 'https://vercel.com/atom',
				siteUrl: 'https://vercel.com/blog',
				description: 'Updates from Vercel.',
			},
			{
				title: 'The GitHub Blog',
				feedUrl: 'https://github.blog/feed/',
				siteUrl: 'https://github.blog/',
				description: 'Updates, ideas, and inspiration from GitHub.',
			},
			{
				title: 'Netlify Blog',
				feedUrl: 'https://www.netlify.com/blog/index.xml',
				siteUrl: 'https://www.netlify.com/blog/',
				description: 'News and posts from Netlify.',
			},
		],
	},
	{
		name: 'General Tech',
		feeds: [
			{
				title: 'The Pragmatic Engineer',
				feedUrl: 'https://blog.pragmaticengineer.com/rss/',
				siteUrl: 'https://blog.pragmaticengineer.com/',
				description: 'Observations across the software engineering industry.',
			},
			{
				title: 'Hacker News Best',
				feedUrl: 'https://hnrss.org/best',
				siteUrl: 'https://news.ycombinator.com/',
				description: 'Best stories on Hacker News.',
			},
		],
	},
	{
		name: 'AI & ML',
		feeds: [
			{
				title: "Simon Willison's Weblog",
				feedUrl: 'https://simonwillison.net/atom/everything/',
				siteUrl: 'https://simonwillison.net/',
				description: "Simon Willison's weblog, covering AI, Python, and web development.",
			},
			{
				title: 'Hugging Face Blog',
				feedUrl: 'https://huggingface.co/blog/feed.xml',
				siteUrl: 'https://huggingface.co/blog',
				description: 'The latest news from Hugging Face.',
			},
		],
	},
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function getFaviconUrl(siteUrl: string | null): string | null {
	if (!siteUrl) return null;
	try {
		const { hostname } = new URL(siteUrl);
		return `https://www.google.com/s2/favicons?domain=${hostname}&sz=32`;
	} catch {
		return null;
	}
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
	// 1. Upsert demo user
	let userId: string;
	const existing = await db
		.select({ id: user.id })
		.from(user)
		.where(eq(user.email, DEMO_EMAIL))
		.limit(1);

	if (existing.length > 0) {
		userId = existing[0].id;
		console.log('Demo user already exists:', userId);
	} else {
		userId = crypto.randomUUID();
		await db.insert(user).values({
			id: userId,
			name: 'Guest Demo',
			email: DEMO_EMAIL,
			emailVerified: true,
			createdAt: new Date(),
			updatedAt: new Date(),
		});
		console.log('Created demo user:', userId);
	}

	// 2. Seed categories and feeds
	for (let catIndex = 0; catIndex < SEED_CATEGORIES.length; catIndex++) {
		const cat = SEED_CATEGORIES[catIndex];

		// Upsert category
		let catId: string;
		const existingCat = await db
			.select({ id: category.id })
			.from(category)
			.where(and(eq(category.userId, userId), eq(category.name, cat.name)))
			.limit(1);

		if (existingCat.length > 0) {
			catId = existingCat[0].id;
			console.log(`\nCategory '${cat.name}' already exists (${catId})`);
		} else {
			const [inserted] = await db
				.insert(category)
				.values({ userId, name: cat.name, position: catIndex })
				.returning({ id: category.id });
			catId = inserted.id;
			console.log(`\nCreated category '${cat.name}' (${catId})`);
		}

		// Seed feeds in this category
		for (const feedData of cat.feeds) {
			const existingFeed = await db
				.select({ id: feed.id })
				.from(feed)
				.where(and(eq(feed.userId, userId), eq(feed.url, feedData.feedUrl)))
				.limit(1);

			if (existingFeed.length > 0) {
				console.log(`  → '${feedData.title}' already exists — skipping`);
				continue;
			}

			try {
				const result = await fetchFeed(feedData.feedUrl, { timeoutMs: 15_000 });
				const parsed = parseFeed(result.xml);

				const [insertedFeed] = await db
					.insert(feed)
					.values({
						userId,
						url: result.finalUrl,
						title: parsed.title || feedData.title,
						description: parsed.description ?? feedData.description,
						faviconUrl: getFaviconUrl(parsed.siteUrl ?? result.finalUrl),
						categoryId: catId,
						healthStatus: 'active',
						lastFetchedAt: new Date(),
					})
					.returning({ id: feed.id });

				const feedId = insertedFeed.id;

				if (parsed.items.length > 0) {
					const newItems: Array<NewFeedItem> = parsed.items.map((item) => ({
						feedId,
						guid: item.guid,
						url: item.url,
						title: item.title,
						description: item.description,
						contentHtml: item.contentHtml,
						author: item.author,
						publishedAt: item.publishedAt,
					}));

					const CHUNK = 100;
					for (let i = 0; i < newItems.length; i += CHUNK) {
						await db.insert(feedItem).values(newItems.slice(i, i + CHUNK));
					}
				}

				console.log(`  ✓ '${feedData.title}' — ${parsed.items.length} items`);
			} catch (err) {
				const message = err instanceof Error ? err.message : String(err);

				// Insert feed stub with error status so it appears in sidebar
				await db.insert(feed).values({
					userId,
					url: feedData.feedUrl,
					title: feedData.title,
					description: feedData.description,
					faviconUrl: getFaviconUrl(feedData.siteUrl),
					categoryId: catId,
					healthStatus: 'error',
					errorMessage: message,
					lastFetchedAt: new Date(),
				});

				console.warn(`  ✗ '${feedData.title}': ${message}`);
			}
		}
	}

	console.log('\n---');
	console.log('GUEST_DEMO_USER_ID=' + userId);
	console.log('Add this to your .env file.');
}

main().catch((err: unknown) => {
	console.error(err);
	process.exit(1);
});
