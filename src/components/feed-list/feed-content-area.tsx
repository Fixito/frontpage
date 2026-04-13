import { CheckCheck, Circle, Loader2 } from 'lucide-react';
import { FeedItemSkeleton } from './feed-item-skeleton';
import { FeedItemList } from './feed-item-list';
import { FeedErrorBanner } from './feed-error-banner';
import { EmptyState } from './empty-state';
import { useFeedItems } from './use-feed-items';
import type { FeedLayout } from '@/components/ui/layout-toggle';
import type { GuestSession } from '@/lib/session';
import { Button } from '@/components/ui/button';

interface FeedContentAreaProps {
	userId: string | null;
	guest: GuestSession | null;
	feedId?: string;
	categoryId?: string;
	view: 'all' | 'bookmarks';
	layout: FeedLayout;
	onSidebarRefresh: () => void;
	refreshKey?: number;
}

export function FeedContentArea({
	userId,
	guest,
	feedId,
	categoryId,
	view,
	layout,
	onSidebarRefresh,
	refreshKey,
}: FeedContentAreaProps) {
	const {
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
	} = useFeedItems({ userId, guest, feedId, categoryId, view, onSidebarRefresh, refreshKey });

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
	const allRead = items.length > 0 && items.every((i) => i.isRead);

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
							disabled={markingAllRead || markingAllUnread}
							onClick={() => {
								if (allRead) {
									void handleMarkAllUnread();
								} else {
									void handleMarkAllRead();
								}
							}}
						>
							{markingAllRead || markingAllUnread ? (
								<Loader2 size={13} className="animate-spin" aria-hidden />
							) : allRead ? (
								<Circle size={13} aria-hidden />
							) : (
								<CheckCheck size={13} aria-hidden />
							)}
							{allRead ? 'Mark all as unread' : 'Mark all as read'}
						</Button>
					)}
				</div>
			)}

			{/* Content */}
			<div className="flex-1 overflow-y-auto">
				{showEmptyState ? (
					<EmptyState
						view={view}
						isGuest={guest !== null}
						feedId={feedId}
						categoryId={categoryId}
					/>
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
