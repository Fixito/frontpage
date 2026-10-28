import { and, eq, exists, inArray, notExists } from 'drizzle-orm';
import { QueryBuilder } from 'drizzle-orm/pg-core';
import { z } from 'zod';
import type { SQL } from 'drizzle-orm';
import { bookmark, feed, feedItem, readState } from '@/db/schema';

/**
 * Which Feed Items a list shows: all of the User's, one Feed's, one Category's,
 * or the User's Bookmarks. See "Item Scope" in GLOSSARY.md.
 */
export type ItemScope =
	| { kind: 'all' }
	| { kind: 'feed'; feedId: string }
	| { kind: 'category'; categoryId: string }
	| { kind: 'bookmarks' };

/** Parses an Item Scope sent by the client. */
export const itemScopeSchema: z.ZodType<ItemScope> = z.discriminatedUnion('kind', [
	z.object({ kind: z.literal('all') }),
	z.object({ kind: z.literal('feed'), feedId: z.string() }),
	z.object({ kind: z.literal('category'), categoryId: z.string() }),
	z.object({ kind: z.literal('bookmarks') }),
]);

/** Whether the User bookmarked the Feed Item. */
export function isBookmarkedBy(userId: string): SQL {
	return exists(
		new QueryBuilder()
			.select({ itemId: bookmark.itemId })
			.from(bookmark)
			.where(and(eq(bookmark.userId, userId), eq(bookmark.itemId, feedItem.id))),
	);
}

/** The one definition of unread: the User has no read state for the Feed Item. */
export function isUnreadBy(userId: string): SQL {
	return notExists(
		new QueryBuilder()
			.select({ itemId: readState.itemId })
			.from(readState)
			.where(and(eq(readState.userId, userId), eq(readState.itemId, feedItem.id))),
	);
}

/**
 * A condition on `feedItem` selecting the Feed Items `userId` can see in `scope`,
 * or only the unread ones. Ownership is enforced here: only Feed Items of the
 * User's own Feeds match, whatever Feed or Category id the scope names.
 */
export function itemsInScope(
	userId: string,
	scope: ItemScope,
	{ unreadOnly = false }: { unreadOnly?: boolean } = {},
): SQL {
	// Subqueries are built without a database: they run inside the caller's query.
	const ownFeeds = new QueryBuilder()
		.select({ id: feed.id })
		.from(feed)
		.where(
			and(
				eq(feed.userId, userId),
				scope.kind === 'feed' ? eq(feed.id, scope.feedId) : undefined,
				scope.kind === 'category' ? eq(feed.categoryId, scope.categoryId) : undefined,
			),
		);
	const conditions = [inArray(feedItem.feedId, ownFeeds)];
	if (scope.kind === 'bookmarks') conditions.push(isBookmarkedBy(userId));
	if (unreadOnly) conditions.push(isUnreadBy(userId));
	return and(...conditions) as SQL;
}
