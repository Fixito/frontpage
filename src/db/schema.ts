import {
	boolean,
	index,
	integer,
	pgTable,
	primaryKey,
	text,
	timestamp,
	uniqueIndex,
} from 'drizzle-orm/pg-core';

// ── Better Auth required tables ──────────────────────────────────────────────

export const user = pgTable('user', {
	id: text('id').primaryKey(),
	name: text('name').notNull(),
	email: text('email').notNull().unique(),
	emailVerified: boolean('email_verified').notNull(),
	image: text('image'),
	createdAt: timestamp('created_at').notNull(),
	updatedAt: timestamp('updated_at').notNull(),
});

export const session = pgTable('session', {
	id: text('id').primaryKey(),
	expiresAt: timestamp('expires_at').notNull(),
	token: text('token').notNull().unique(),
	createdAt: timestamp('created_at').notNull(),
	updatedAt: timestamp('updated_at').notNull(),
	ipAddress: text('ip_address'),
	userAgent: text('user_agent'),
	userId: text('user_id')
		.notNull()
		.references(() => user.id, { onDelete: 'cascade' }),
});

export const account = pgTable('account', {
	id: text('id').primaryKey(),
	accountId: text('account_id').notNull(),
	providerId: text('provider_id').notNull(),
	userId: text('user_id')
		.notNull()
		.references(() => user.id, { onDelete: 'cascade' }),
	accessToken: text('access_token'),
	refreshToken: text('refresh_token'),
	idToken: text('id_token'),
	accessTokenExpiresAt: timestamp('access_token_expires_at'),
	refreshTokenExpiresAt: timestamp('refresh_token_expires_at'),
	scope: text('scope'),
	password: text('password'),
	createdAt: timestamp('created_at').notNull(),
	updatedAt: timestamp('updated_at').notNull(),
});

export const verification = pgTable('verification', {
	id: text('id').primaryKey(),
	identifier: text('identifier').notNull(),
	value: text('value').notNull(),
	expiresAt: timestamp('expires_at').notNull(),
	createdAt: timestamp('created_at'),
	updatedAt: timestamp('updated_at'),
});

// ── Frontpage tables ─────────────────────────────────────────────────────────

export const category = pgTable(
	'category',
	{
		id: text('id')
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		userId: text('user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		name: text('name').notNull(),
		color: text('color'),
		position: integer('position').notNull().default(0),
		createdAt: timestamp('created_at').notNull().defaultNow(),
	},
	(t) => [index('category_user_idx').on(t.userId)],
);

export const feed = pgTable(
	'feed',
	{
		id: text('id')
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		userId: text('user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		url: text('url').notNull(),
		// The title the Feed document declares. Refreshes overwrite it.
		title: text('title').notNull(),
		// The title the User gave the Feed, or null to show `title`. Refreshes never touch it.
		customTitle: text('custom_title'),
		description: text('description'),
		faviconUrl: text('favicon_url'),
		categoryId: text('category_id').references(() => category.id, { onDelete: 'set null' }),
		// A FeedHealth, set only by Feed Ingestion
		healthStatus: text('health_status').notNull().default('active'),
		lastFetchedAt: timestamp('last_fetched_at'),
		errorMessage: text('error_message'),
		createdAt: timestamp('created_at').notNull().defaultNow(),
	},
	(t) => [
		index('feed_user_idx').on(t.userId),
		index('feed_category_idx').on(t.categoryId),
		// A User follows a Feed URL once: adding a Feed relies on it under concurrent adds.
		uniqueIndex('feed_user_url_idx').on(t.userId, t.url),
	],
);

export const feedItem = pgTable(
	'feed_item',
	{
		id: text('id')
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		feedId: text('feed_id')
			.notNull()
			.references(() => feed.id, { onDelete: 'cascade' }),
		guid: text('guid').notNull(),
		url: text('url').notNull(),
		title: text('title').notNull(),
		description: text('description'),
		contentHtml: text('content_html'),
		author: text('author'),
		publishedAt: timestamp('published_at'),
		fetchedAt: timestamp('fetched_at').notNull().defaultNow(),
		aiSummary: text('ai_summary'),
	},
	(t) => [
		index('feed_item_feed_idx').on(t.feedId),
		index('feed_item_published_idx').on(t.feedId, t.publishedAt),
		// A Feed Item's identity within its Feed: ingestion relies on it to never double-insert.
		uniqueIndex('feed_item_feed_guid_idx').on(t.feedId, t.guid),
	],
);

export const readState = pgTable(
	'read_state',
	{
		userId: text('user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		itemId: text('item_id')
			.notNull()
			.references(() => feedItem.id, { onDelete: 'cascade' }),
		readAt: timestamp('read_at').notNull().defaultNow(),
	},
	(t) => [primaryKey({ columns: [t.userId, t.itemId] }), index('read_state_user_idx').on(t.userId)],
);

export const bookmark = pgTable(
	'bookmark',
	{
		userId: text('user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		itemId: text('item_id')
			.notNull()
			.references(() => feedItem.id, { onDelete: 'cascade' }),
		createdAt: timestamp('created_at').notNull().defaultNow(),
	},
	(t) => [primaryKey({ columns: [t.userId, t.itemId] }), index('bookmark_user_idx').on(t.userId)],
);

export const userPreference = pgTable('user_preference', {
	userId: text('user_id')
		.primaryKey()
		.references(() => user.id, { onDelete: 'cascade' }),
	// 'list' | 'compact' | 'cards'
	defaultLayout: text('default_layout').notNull().default('list'),
	// 'off' | '15' | '30' | '60' (minutes)
	refreshInterval: text('refresh_interval').notNull().default('off'),
	// 'system' | 'light' | 'dark'
	theme: text('theme').notNull().default('system'),
	updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// ── Types ─────────────────────────────────────────────────────────────────────

/** Feed Health, see GLOSSARY.md. Stored in `feed.healthStatus`. */
export type FeedHealth = 'active' | 'stale' | 'error';

export type User = typeof user.$inferSelect;
export type Session = typeof session.$inferSelect;
export type Category = typeof category.$inferSelect;
export type Feed = typeof feed.$inferSelect;
export type FeedItem = typeof feedItem.$inferSelect;
export type ReadState = typeof readState.$inferSelect;
export type Bookmark = typeof bookmark.$inferSelect;
export type UserPreference = typeof userPreference.$inferSelect;

export type NewCategory = typeof category.$inferInsert;
export type NewFeed = typeof feed.$inferInsert;
export type NewFeedItem = typeof feedItem.$inferInsert;
