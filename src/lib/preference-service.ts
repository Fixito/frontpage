import { createServerFn } from '@tanstack/react-start';
import { eq } from 'drizzle-orm';
import { withAuth, withMutation } from './server-fn-helpers';
import { db } from './db';
import { userPreference } from '@/db/schema';

// ── getPreference ──────────────────────────────────────────────────────────────

export const getPreferenceFn = createServerFn({ method: 'POST' }).handler(
	withAuth(async (userId) => {
		const row = await db
			.select()
			.from(userPreference)
			.where(eq(userPreference.userId, userId))
			.limit(1)
			.then((rows) => rows.at(0));

		if (row !== undefined) return { defaultLayout: row.defaultLayout, theme: row.theme };

		await db
			.insert(userPreference)
			.values({
				userId,
				defaultLayout: 'list',
				theme: 'system',
				refreshInterval: 'off',
			})
			.onConflictDoNothing();

		return { defaultLayout: 'list', theme: 'system' };
	}),
);

// ── updateLayout ───────────────────────────────────────────────────────────────

export const updateLayoutFn = createServerFn({ method: 'POST' })
	.inputValidator((data: { layout: 'list' | 'compact' | 'cards' }) => data)
	.handler(
		withMutation(async (userId: string, data: { layout: 'list' | 'compact' | 'cards' }) => {
			await db
				.insert(userPreference)
				.values({
					userId,
					defaultLayout: data.layout,
					refreshInterval: 'off',
					theme: 'system',
				})
				.onConflictDoUpdate({
					target: userPreference.userId,
					set: { defaultLayout: data.layout, updatedAt: new Date() },
				});
		}),
	);

// ── updateTheme ────────────────────────────────────────────────────────────────

export const updateThemeFn = createServerFn({ method: 'POST' })
	.inputValidator((data: { theme: 'light' | 'dark' | 'system' }) => data)
	.handler(
		withMutation(async (userId: string, data: { theme: 'light' | 'dark' | 'system' }) => {
			await db
				.insert(userPreference)
				.values({
					userId,
					theme: data.theme,
					refreshInterval: 'off',
					defaultLayout: 'list',
				})
				.onConflictDoUpdate({
					target: userPreference.userId,
					set: { theme: data.theme, updatedAt: new Date() },
				});
		}),
	);
