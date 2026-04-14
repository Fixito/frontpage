import { createServerFn } from '@tanstack/react-start';
import { eq } from 'drizzle-orm';
import { db } from './db';
import { userPreference } from '@/db/schema';

// ── getPreference ──────────────────────────────────────────────────────────────

export const getPreferenceFn = createServerFn({ method: 'POST' })
	.inputValidator((data: { userId: string }) => data)
	.handler(async ({ data }) => {
		const row = await db
			.select()
			.from(userPreference)
			.where(eq(userPreference.userId, data.userId))
			.limit(1)
			.then((rows) => rows.at(0));

		if (row !== undefined) return { defaultLayout: row.defaultLayout, theme: row.theme };

		await db
			.insert(userPreference)
			.values({
				userId: data.userId,
				defaultLayout: 'list',
				theme: 'system',
				refreshInterval: 'off',
			})
			.onConflictDoNothing();

		return { defaultLayout: 'list', theme: 'system' };
	});

// ── updateLayout ───────────────────────────────────────────────────────────────

export const updateLayoutFn = createServerFn({ method: 'POST' })
	.inputValidator((data: { userId: string; layout: 'list' | 'compact' | 'cards' }) => data)
	.handler(async ({ data }) => {
		await db
			.insert(userPreference)
			.values({
				userId: data.userId,
				defaultLayout: data.layout,
				refreshInterval: 'off',
				theme: 'system',
			})
			.onConflictDoUpdate({
				target: userPreference.userId,
				set: { defaultLayout: data.layout, updatedAt: new Date() },
			});
	});

// ── updateTheme ────────────────────────────────────────────────────────────────

export const updateThemeFn = createServerFn({ method: 'POST' })
	.inputValidator((data: { userId: string; theme: 'light' | 'dark' | 'system' }) => data)
	.handler(async ({ data }) => {
		await db
			.insert(userPreference)
			.values({
				userId: data.userId,
				theme: data.theme,
				refreshInterval: 'off',
				defaultLayout: 'list',
			})
			.onConflictDoUpdate({
				target: userPreference.userId,
				set: { theme: data.theme, updatedAt: new Date() },
			});
	});
