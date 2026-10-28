import { createServerFn } from '@tanstack/react-start';
import { withMutation } from './server-fn-helpers';
import { db as productionDb } from './db';
import {
	addFeed,
	refreshAllFeeds,
	refreshFeed,
	validateAndPreviewFeed,
} from './feed-ingestion.server';
import type { NewFeed } from './feed-ingestion.server';

export type { FeedPreview } from './feed-ingestion.server';

// ── Server function wrappers ───────────────────────────────────────────────────

// Signed-in Users only: validating fetches an arbitrary URL server-side.
export const validateFeedUrlFn = createServerFn({ method: 'POST' })
	.validator((data: { url: string }) => data)
	.handler(
		withMutation(async (userId: string, data: { url: string }) =>
			validateAndPreviewFeed(productionDb, userId, data.url),
		),
	);

export const addFeedFn = createServerFn({ method: 'POST' })
	.validator((data: NewFeed) => data)
	.handler(
		withMutation(async (userId: string, data: NewFeed) => addFeed(productionDb, userId, data)),
	);

export const refreshFeedFn = createServerFn({ method: 'POST' })
	.validator((data: { feedId: string }) => data)
	.handler(
		withMutation(async (userId: string, data: { feedId: string }) =>
			refreshFeed(productionDb, userId, data.feedId),
		),
	);

export const refreshAllFeedsFn = createServerFn({ method: 'POST' }).handler(
	withMutation(async (userId) => refreshAllFeeds(productionDb, userId)),
);
