import { createServerFn } from '@tanstack/react-start';
import { and, desc, eq, gte, isNotNull, or } from 'drizzle-orm';
import { withMutation } from './server-fn-helpers';
import { generateArticleSummary, generateWeeklyDigest, parseAiError, suggestCategory } from './ai';
import { db as productionDb } from './db';
import { feedDisplayTitle } from './feed-title';
import { itemsInScope } from './item-scope';
import type { Database } from './db';
import { feed, feedItem } from '@/db/schema';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface DigestItem {
	id: string;
	title: string;
	url: string;
	feedTitle: string;
	publishedAt: Date | null;
	description: string | null;
	aiSummary: string | null;
}

// ── generateSummaryFn ─────────────────────────────────────────────────────────

export const generateSummaryFn = createServerFn({ method: 'POST' })
	.validator((data: { itemId: string }) => data)
	.handler(
		withMutation(
			async (
				userId: string,
				data: { itemId: string },
			): Promise<
				{ summary: string; cached: boolean } | { summary: null; error: string; retryIn?: number }
			> => {
				const rows = await productionDb
					.select({
						id: feedItem.id,
						title: feedItem.title,
						description: feedItem.description,
						contentHtml: feedItem.contentHtml,
						aiSummary: feedItem.aiSummary,
					})
					.from(feedItem)
					.innerJoin(feed, eq(feed.id, feedItem.feedId))
					.where(and(eq(feedItem.id, data.itemId), eq(feed.userId, userId)))
					.limit(1);

				if (rows.length === 0) return { summary: null, error: 'AI unavailable' };

				const item = rows[0];

				if (item.aiSummary) {
					return { summary: item.aiSummary, cached: true };
				}

				try {
					const content = item.contentHtml ?? item.description ?? '';
					const summary = await generateArticleSummary(item.title, content);
					await productionDb
						.update(feedItem)
						.set({ aiSummary: summary })
						.where(eq(feedItem.id, data.itemId));
					return { summary, cached: false };
				} catch (err) {
					console.error('[AI] generateSummaryFn error:', err);
					return { summary: null, ...parseAiError(err) };
				}
			},
		),
	);

// ── suggestCategoryFn ─────────────────────────────────────────────────────────

export const suggestCategoryFn = createServerFn({ method: 'POST' })
	.validator(
		(data: { feedTitle: string; feedDescription: string | null; categoryNames: Array<string> }) =>
			data,
	)
	.handler(
		withMutation(
			async (
				_userId: string,
				data: { feedTitle: string; feedDescription: string | null; categoryNames: Array<string> },
			): Promise<{ name: string; isNew: boolean } | null> => {
				try {
					return await suggestCategory(data.feedTitle, data.feedDescription, data.categoryNames);
				} catch {
					return null;
				}
			},
		),
	);

// ── getWeeklyDigestFn ─────────────────────────────────────────────────────────

/** The Weekly Digest's Feed Items: the User's newest unread ones published since `since`, with text to summarise. */
export async function selectDigestItems(
	db: Database,
	userId: string,
	since: Date,
): Promise<Array<DigestItem>> {
	return db
		.select({
			id: feedItem.id,
			title: feedItem.title,
			url: feedItem.url,
			feedTitle: feedDisplayTitle,
			publishedAt: feedItem.publishedAt,
			description: feedItem.description,
			aiSummary: feedItem.aiSummary,
		})
		.from(feedItem)
		.innerJoin(feed, eq(feed.id, feedItem.feedId))
		.where(
			and(
				itemsInScope(userId, { kind: 'all' }, { unreadOnly: true }),
				gte(feedItem.publishedAt, since),
				or(isNotNull(feedItem.description), isNotNull(feedItem.contentHtml)),
			),
		)
		.orderBy(desc(feedItem.publishedAt))
		.limit(10);
}

export const getWeeklyDigestFn = createServerFn({ method: 'POST' })
	.validator((data: { expectedUserId: string }) => data)
	.handler(
		withMutation(
			async (
				userId: string,
				data: { expectedUserId: string },
			): Promise<{ briefing: string | null; items: Array<DigestItem> }> => {
				if (data.expectedUserId !== userId) throw new Error('Unauthorized');
				const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

				const digestItems = await selectDigestItems(productionDb, userId, sevenDaysAgo);

				const briefingInput = digestItems.map((row) => ({
					title: row.title,
					description: row.description,
					url: row.url,
					feedTitle: row.feedTitle,
				}));

				let briefing: string | null = null;
				try {
					briefing = await generateWeeklyDigest(briefingInput);
				} catch (err) {
					console.error('[AI] getWeeklyDigestFn briefing error:', err);
				}

				return { briefing, items: digestItems };
			},
		),
	);
