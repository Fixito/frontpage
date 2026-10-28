import { useCallback, useEffect, useState } from 'react';
import type { GuestSession } from '@/lib/session';
import type { FeedItemRow, GetItemsResult } from '@/lib/items-service';
import {
	getItemsFn,
	markAllReadFn,
	markAllUnreadFn,
	markReadFn,
	toggleBookmarkFn,
	unmarkReadFn,
} from '@/lib/items-service';

const PAGE_SIZE = 50;

/** `items` with one item's read state set (for optimistic updates and rollbacks). */
function withItemRead(
	items: Array<FeedItemRow>,
	itemId: string,
	isRead: boolean,
): Array<FeedItemRow> {
	return items.map((item) => (item.id === itemId ? { ...item, isRead } : item));
}

interface UseFeedItemsParams {
	userId: string | null;
	guest: GuestSession | null;
	feedId?: string;
	categoryId?: string;
	view: 'all' | 'bookmarks';
	onSidebarRefresh: () => void;
	onBookmarkCountChange?: (delta: number) => void;
	refreshKey?: number;
}

export interface UseFeedItemsResult {
	items: Array<FeedItemRow>;
	totalCount: number;
	hasMore: boolean;
	loading: boolean;
	loadingMore: boolean;
	error: string | null;
	feedInfo: GetItemsResult['feedInfo'];
	markingAllRead: boolean;
	markingAllUnread: boolean;
	/** Mark-read intent: unread → read, read stays read. */
	handleMarkRead: (itemId: string) => Promise<void>;
	/** Explicit read/unread toggle. */
	handleReadToggle: (itemId: string) => Promise<void>;
	handleBookmarkToggle: (itemId: string) => Promise<void>;
	handleMarkAllRead: () => Promise<void>;
	handleMarkAllUnread: () => Promise<void>;
	handleLoadMore: () => Promise<void>;
	handleRetry: () => void;
}

export function useFeedItems({
	userId,
	guest,
	feedId,
	categoryId,
	view,
	onSidebarRefresh,
	onBookmarkCountChange,
	refreshKey,
}: UseFeedItemsParams): UseFeedItemsResult {
	const [items, setItems] = useState<Array<FeedItemRow>>([]);
	const [totalCount, setTotalCount] = useState(0);
	const [hasMore, setHasMore] = useState(false);
	const [page, setPage] = useState(1);
	const [loading, setLoading] = useState(true);
	const [loadingMore, setLoadingMore] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [feedInfo, setFeedInfo] = useState<GetItemsResult['feedInfo']>(null);
	const [markingAllRead, setMarkingAllRead] = useState(false);
	const [markingAllUnread, setMarkingAllUnread] = useState(false);

	const guestDemoUserId = guest?.demoUserId ?? null;

	// Reset sync state during render when filter props change
	const filterKey = `${userId}|${guestDemoUserId}|${feedId}|${categoryId}|${view}`;
	const [prevFilterKey, setPrevFilterKey] = useState(filterKey);
	if (prevFilterKey !== filterKey) {
		setPrevFilterKey(filterKey);
		setLoading(true);
		setError(null);
		setPage(1);
	}

	const fetchItems = useCallback(
		async (pageNum: number, append = false) => {
			const effectiveUserId = userId ?? guestDemoUserId ?? null;
			if (!effectiveUserId) {
				setItems([]);
				setLoading(false);
				return;
			}
			try {
				const result = await getItemsFn({
					data: {
						feedId,
						categoryId,
						view,
						page: pageNum,
						pageSize: PAGE_SIZE,
					},
				});
				if (append) {
					setItems((prev) => [...prev, ...result.items]);
				} else {
					setItems(result.items);
				}
				setTotalCount(result.totalCount);
				setHasMore(result.hasMore);
				setFeedInfo(result.feedInfo ?? null);
			} catch {
				setError('Failed to load articles. Please try again.');
			}
		},
		[userId, guestDemoUserId, feedId, categoryId, view],
	);

	// Refetch when filters change (items are async data, cannot be computed during render)
	useEffect(() => {
		// eslint-disable-next-line react-hooks/set-state-in-effect -- data fetching; candidate for useQuery
		fetchItems(1).finally(() => {
			setLoading(false);
		});
	}, [fetchItems, refreshKey]);

	const handleMarkRead = useCallback(
		async (itemId: string) => {
			if (!userId) return;
			const item = items.find((i) => i.id === itemId);
			if (!item) return;
			// Sent even when the item already looks read: this tab can be stale (another
			// tab marked it unread), and the server's mark read is idempotent.
			const wasRead = item.isRead;
			setItems((prev) => withItemRead(prev, itemId, true));
			try {
				await markReadFn({ data: { itemId } });
			} catch {
				setItems((prev) => withItemRead(prev, itemId, wasRead));
			}
		},
		[userId, items],
	);

	const handleReadToggle = useCallback(
		async (itemId: string) => {
			if (!userId) return;
			const wasRead = items.find((i) => i.id === itemId)?.isRead ?? false;
			setItems((prev) => withItemRead(prev, itemId, !wasRead));
			try {
				if (wasRead) {
					await unmarkReadFn({ data: { itemId } });
				} else {
					await markReadFn({ data: { itemId } });
				}
			} catch {
				setItems((prev) => withItemRead(prev, itemId, wasRead));
			}
		},
		[userId, items],
	);

	const handleBookmarkToggle = useCallback(
		async (itemId: string) => {
			if (!userId) return;
			const originalItem = items.find((i) => i.id === itemId);
			if (!originalItem) return;
			const delta = originalItem.isBookmarked ? -1 : 1;
			setItems((prev) =>
				view === 'bookmarks'
					? prev.filter((item) => item.id !== itemId)
					: prev.map((item) =>
							item.id === itemId ? { ...item, isBookmarked: !originalItem.isBookmarked } : item,
						),
			);
			onBookmarkCountChange?.(delta);
			try {
				await toggleBookmarkFn({ data: { itemId } });
				onSidebarRefresh();
			} catch {
				setItems((prev) =>
					view === 'bookmarks'
						? prev.some((i) => i.id === itemId)
							? prev
							: [...prev, originalItem]
						: prev.map((item) => (item.id === itemId ? originalItem : item)),
				);
				onBookmarkCountChange?.(-delta);
			}
		},
		[userId, view, items, onSidebarRefresh, onBookmarkCountChange],
	);

	const handleMarkAllRead = useCallback(async () => {
		if (!userId) return;
		setMarkingAllRead(true);
		try {
			await markAllReadFn({ data: { feedId, categoryId } });
			setItems((prev) => prev.map((item) => ({ ...item, isRead: true })));
			onSidebarRefresh();
		} catch (err) {
			console.error('Failed to mark all as read', err);
		} finally {
			setMarkingAllRead(false);
		}
	}, [userId, feedId, categoryId, onSidebarRefresh]);

	const handleMarkAllUnread = useCallback(async () => {
		if (!userId) return;
		setMarkingAllUnread(true);
		try {
			await markAllUnreadFn({ data: { feedId, categoryId } });
			setItems((prev) => prev.map((item) => ({ ...item, isRead: false })));
			onSidebarRefresh();
		} catch (err) {
			console.error('Failed to mark all as unread', err);
		} finally {
			setMarkingAllUnread(false);
		}
	}, [userId, feedId, categoryId, onSidebarRefresh]);

	const handleLoadMore = useCallback(async () => {
		const effectiveUserId = userId ?? guestDemoUserId ?? null;
		if (loadingMore || !hasMore || !effectiveUserId) return;
		setLoadingMore(true);
		const nextPage = page + 1;
		await fetchItems(nextPage, true);
		setPage(nextPage);
		setLoadingMore(false);
	}, [loadingMore, hasMore, userId, guestDemoUserId, page, fetchItems]);

	const handleRetry = useCallback(() => {
		setLoading(true);
		setError(null);
		setPage(1);
		fetchItems(1).finally(() => {
			setLoading(false);
		});
	}, [fetchItems]);

	return {
		items,
		totalCount,
		hasMore,
		loading,
		loadingMore,
		error,
		feedInfo,
		markingAllRead,
		markingAllUnread,
		handleMarkRead,
		handleReadToggle,
		handleBookmarkToggle,
		handleMarkAllRead,
		handleMarkAllUnread,
		handleLoadMore,
		handleRetry,
	};
}
