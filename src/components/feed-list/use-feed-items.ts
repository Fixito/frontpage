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
	handleMarkRead: (itemId: string) => void;
	handleBookmarkToggle: (itemId: string) => void;
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
						userId: effectiveUserId,
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
		// eslint-disable-next-line react-you-might-not-need-an-effect/no-derived-state
		fetchItems(1).finally(() => {
			setLoading(false);
		});
	}, [fetchItems, refreshKey]);

	const handleMarkRead = useCallback(
		(itemId: string) => {
			if (!userId) return;
			const isCurrentlyRead = items.find((i) => i.id === itemId)?.isRead ?? false;
			setItems((prev) =>
				prev.map((item) => (item.id === itemId ? { ...item, isRead: !item.isRead } : item)),
			);
			const fn = isCurrentlyRead
				? unmarkReadFn({ data: { userId, itemId } })
				: markReadFn({ data: { userId, itemId } });
			void fn.catch(() => {
				setItems((prev) =>
					prev.map((item) => (item.id === itemId ? { ...item, isRead: isCurrentlyRead } : item)),
				);
			});
		},
		[userId, items],
	);

	const handleBookmarkToggle = useCallback(
		(itemId: string) => {
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
			void toggleBookmarkFn({ data: { userId, itemId } })
				.then(() => {
					onSidebarRefresh();
				})
				.catch(() => {
					setItems((prev) =>
						view === 'bookmarks'
							? prev.some((i) => i.id === itemId)
								? prev
								: [...prev, originalItem]
							: prev.map((item) => (item.id === itemId ? originalItem : item)),
					);
					onBookmarkCountChange?.(-delta);
				});
		},
		[userId, view, items, onSidebarRefresh, onBookmarkCountChange],
	);

	const handleMarkAllRead = useCallback(async () => {
		if (!userId) return;
		setMarkingAllRead(true);
		try {
			await markAllReadFn({ data: { userId, feedId, categoryId } });
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
			await markAllUnreadFn({ data: { userId, feedId, categoryId } });
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
		handleBookmarkToggle,
		handleMarkAllRead,
		handleMarkAllUnread,
		handleLoadMore,
		handleRetry,
	};
}
