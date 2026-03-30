import { createServerFn } from '@tanstack/react-start';
import { and, desc, eq, gte, isNotNull, isNull, or } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { generateArticleSummary, generateWeeklyDigest, suggestCategory } from './ai';
import { db } from './db';
import { feed, feedItem, readState } from '@/db/schema';

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
	.inputValidator((data: { userId: string; itemId: string }) => data)
	.handler(
		async ({
			data,
		}): Promise<{ summary: string; cached: boolean } | { summary: null; error: string }> => {
			const rows = await db
				.select({
					id: feedItem.id,
					title: feedItem.title,
					description: feedItem.description,
					contentHtml: feedItem.contentHtml,
					aiSummary: feedItem.aiSummary,
				})
				.from(feedItem)
				.innerJoin(feed, eq(feed.id, feedItem.feedId))
				.where(and(eq(feedItem.id, data.itemId), eq(feed.userId, data.userId)))
				.limit(1);

			if (rows.length === 0) return { summary: null, error: 'AI unavailable' };

			const item = rows[0];

			if (item.aiSummary) {
				return { summary: item.aiSummary, cached: true };
			}

			try {
				const content = item.contentHtml ?? item.description ?? '';
				const summary = await generateArticleSummary(item.title, content);
				await db.update(feedItem).set({ aiSummary: summary }).where(eq(feedItem.id, data.itemId));
				return { summary, cached: false };
			} catch (err) {
				console.error('[AI] generateSummaryFn error:', err);
				const msg = err instanceof Error ? err.message : 'Unknown error';
				return { summary: null, error: msg };
			}
		},
	);

// ── suggestCategoryFn ─────────────────────────────────────────────────────────

export const suggestCategoryFn = createServerFn({ method: 'POST' })
	.inputValidator(
		(data: { feedTitle: string; feedDescription: string | null; categoryNames: Array<string> }) =>
			data,
	)
	.handler(async ({ data }): Promise<string | null> => {
		try {
			return await suggestCategory(data.feedTitle, data.feedDescription, data.categoryNames);
		} catch {
			return null;
		}
	});

// ── getWeeklyDigestFn ─────────────────────────────────────────────────────────

export const getWeeklyDigestFn = createServerFn({ method: 'POST' })
	.inputValidator((data: { userId: string }) => data)
	.handler(async ({ data }): Promise<{ briefing: string | null; items: Array<DigestItem> }> => {
		const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

		const rs = alias(readState, 'rs');

		const rows = await db
			.select({
				id: feedItem.id,
				title: feedItem.title,
				url: feedItem.url,
				feedTitle: feed.title,
				publishedAt: feedItem.publishedAt,
				description: feedItem.description,
				contentHtml: feedItem.contentHtml,
				aiSummary: feedItem.aiSummary,
			})
			.from(feedItem)
			.innerJoin(feed, eq(feed.id, feedItem.feedId))
			.leftJoin(rs, and(eq(rs.itemId, feedItem.id), eq(rs.userId, data.userId)))
			.where(
				and(
					eq(feed.userId, data.userId),
					gte(feedItem.publishedAt, sevenDaysAgo),
					isNull(rs.itemId),
					or(isNotNull(feedItem.description), isNotNull(feedItem.contentHtml)),
				),
			)
			.orderBy(desc(feedItem.publishedAt))
			.limit(10);

		const digestItems: Array<DigestItem> = rows.map((row) => ({
			id: row.id,
			title: row.title,
			url: row.url,
			feedTitle: row.feedTitle,
			publishedAt: row.publishedAt,
			description: row.description,
			aiSummary: row.aiSummary,
		}));

		const briefingInput = rows.map((row) => ({
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
	});
