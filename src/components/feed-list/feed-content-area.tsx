import { useCallback, useEffect, useState } from 'react';
import { CheckCheck, Loader2 } from 'lucide-react';
import { FeedItemSkeleton } from './feed-item-skeleton';
import { FeedItemList } from './feed-item-list';
import { FeedErrorBanner } from './feed-error-banner';
import { EmptyState } from './empty-state';
import type { FeedLayout } from '@/components/ui/layout-toggle';
import type { FeedItemRow, GetItemsResult } from '@/lib/items-service';
import type { GuestSession } from '@/lib/session';
import { Button } from '@/components/ui/button';
import {
	getItemsFn,
	markAllReadFn,
	markReadFn,
	toggleBookmarkFn,
	unmarkReadFn,
} from '@/lib/items-service';

interface FeedContentAreaProps {
	userId: string | null;
	guest: GuestSession | null;
	feedId?: string;
	categoryId?: string;
	view: 'all' | 'bookmarks';
	layout: FeedLayout;
	onSidebarRefresh: () => void;
}

const PAGE_SIZE = 50;

export function FeedContentArea({
	userId,
	guest,
	feedId,
	categoryId,
	view,
	layout,
	onSidebarRefresh,
}: FeedContentAreaProps) {
	const [items, setItems] = useState<Array<FeedItemRow>>([]);
	const [totalCount, setTotalCount] = useState(0);
	const [hasMore, setHasMore] = useState(false);
	const [page, setPage] = useState(1);
	const [loading, setLoading] = useState(true);
	const [loadingMore, setLoadingMore] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [feedInfo, setFeedInfo] = useState<GetItemsResult['feedInfo']>(null);
	const [markingAllRead, setMarkingAllRead] = useState(false);

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
	}, [fetchItems]);

	const handleMarkRead = useCallback(
		(itemId: string) => {
			if (!userId) return;
			const isCurrentlyRead = items.find((i) => i.id === itemId)?.isRead ?? false;
			// Optimistic toggle
			setItems((prev) =>
				prev.map((item) => (item.id === itemId ? { ...item, isRead: !item.isRead } : item)),
			);
			const fn = isCurrentlyRead
				? unmarkReadFn({ data: { userId, itemId } })
				: markReadFn({ data: { userId, itemId } });
			void fn.catch(() => {
				// Rollback on error
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
			// Optimistic: in bookmarks view, remove the item immediately; elsewhere toggle the flag
			setItems((prev) =>
				view === 'bookmarks'
					? prev.filter((item) => item.id !== itemId)
					: prev.map((item) =>
							item.id === itemId ? { ...item, isBookmarked: !item.isBookmarked } : item,
						),
			);
			void toggleBookmarkFn({ data: { userId, itemId } })
				.then((isBookmarked) => {
					setItems((prev) =>
						view === 'bookmarks' && !isBookmarked
							? prev.filter((item) => item.id !== itemId)
							: prev.map((item) => (item.id === itemId ? { ...item, isBookmarked } : item)),
					);
					onSidebarRefresh();
				})
				.catch(console.error);
		},
		[userId, view, onSidebarRefresh],
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

	if (loading) {
		return (
			<div className="flex-1 overflow-y-auto" role="status" aria-label="Loading articles…">
				<FeedItemSkeleton />
			</div>
		);
	}

	if (error) {
		return (
			<div
				role="alert"
				className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center"
			>
				<p className="text-destructive font-medium">{error}</p>
				<Button variant="outline" size="sm" onClick={handleRetry}>
					Try again
				</Button>
			</div>
		);
	}

	const showEmptyState = items.length === 0;

	return (
		<div className="flex flex-1 flex-col overflow-hidden">
			{/* Feed error banner */}
			{feedInfo?.healthStatus === 'error' && feedInfo.errorMessage && feedInfo.id && (
				<div className="shrink-0 p-4 pb-0">
					<FeedErrorBanner
						feedId={feedInfo.id}
						errorMessage={feedInfo.errorMessage}
						onRetry={handleRetry}
					/>
				</div>
			)}

			{/* Toolbar */}
			{!showEmptyState && (
				<div className="flex shrink-0 items-center justify-between px-4 py-2">
					<p className="text-muted-foreground text-xs">
						{totalCount === 1 ? '1 article' : `${totalCount} articles`}
					</p>
					{view !== 'bookmarks' && userId && (
						<Button
							variant="ghost"
							size="sm"
							className="gap-1.5 text-xs"
							disabled={markingAllRead}
							onClick={() => {
								void handleMarkAllRead();
							}}
						>
							{markingAllRead ? (
								<Loader2 size={13} className="animate-spin" aria-hidden />
							) : (
								<CheckCheck size={13} aria-hidden />
							)}
							Mark all as read
						</Button>
					)}
				</div>
			)}

			{/* Content */}
			<div className="flex-1 overflow-y-auto">
				{showEmptyState ? (
					<EmptyState view={view} isGuest={guest !== null} feedId={feedId} categoryId={categoryId} />
				) : (
					<>
						<FeedItemList
							items={items}
							layout={layout}
							onMarkRead={handleMarkRead}
							onMarkBookmark={handleBookmarkToggle}
							userId={userId}
						/>

						{/* Load more */}
						{hasMore && (
							<div className="flex justify-center p-4">
								<Button
									variant="outline"
									size="sm"
									disabled={loadingMore}
									onClick={() => {
										void handleLoadMore();
									}}
								>
									{loadingMore ? (
										<>
											<Loader2 size={14} className="animate-spin" aria-hidden />
											Loading…
										</>
									) : (
										'Load more'
									)}
								</Button>
							</div>
						)}
					</>
				)}
			</div>
		</div>
	);
}
