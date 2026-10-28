import { useCallback, useMemo } from 'react';
import {
	infiniteQueryOptions,
	useInfiniteQuery,
	useMutation,
	useQueryClient,
} from '@tanstack/react-query';
import type { InfiniteData, QueryKey } from '@tanstack/react-query';
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

/** Prefix of every Feed Item list query, for invalidating them all at once. */
export const feedItemsQueryKey = ['feed-items'] as const;

interface ItemListFilter {
	effectiveUserId: string | null;
	feedId?: string;
	categoryId?: string;
	view: 'all' | 'bookmarks';
}

function feedItemsQueryOptions({ effectiveUserId, feedId, categoryId, view }: ItemListFilter) {
	return infiniteQueryOptions({
		queryKey: [...feedItemsQueryKey, effectiveUserId, { feedId, categoryId, view }],
		queryFn: ({ pageParam }) =>
			getItemsFn({ data: { feedId, categoryId, view, page: pageParam, pageSize: PAGE_SIZE } }),
		initialPageParam: 1,
		getNextPageParam: (lastPage, _allPages, lastPageParam) =>
			lastPage.hasMore ? lastPageParam + 1 : undefined,
		enabled: effectiveUserId !== null,
		retry: false,
		refetchOnWindowFocus: false,
	});
}

type ItemPages = InfiniteData<GetItemsResult, number>;

/** `items` with one item's read state set (for optimistic updates and rollbacks). */
function withItemRead(
	items: Array<FeedItemRow>,
	itemId: string,
	isRead: boolean,
): Array<FeedItemRow> {
	return items.map((item) => (item.id === itemId ? { ...item, isRead } : item));
}

/** Where an item sits in the loaded pages, to put it back after a failed removal. */
interface ItemPosition {
	pageIndex: number;
	index: number;
}

function findItemPosition(data: ItemPages | undefined, itemId: string): ItemPosition | null {
	for (const [pageIndex, page] of (data?.pages ?? []).entries()) {
		const index = page.items.findIndex((item) => item.id === itemId);
		if (index !== -1) return { pageIndex, index };
	}
	return null;
}

function withItemAt(
	data: ItemPages,
	item: FeedItemRow,
	{ pageIndex, index }: ItemPosition,
): ItemPages {
	if (findItemPosition(data, item.id)) return data;
	return {
		...data,
		pages: data.pages.map((page, i) =>
			i === pageIndex
				? { ...page, items: [...page.items.slice(0, index), item, ...page.items.slice(index)] }
				: page,
		),
	};
}

// Mutation variables carry the query key of the list they started from, so a
// rollback lands on that list even if the User switched filters meanwhile.
interface ReadChange {
	queryKey: QueryKey;
	itemId: string;
	isRead: boolean;
	wasRead: boolean;
}

interface BookmarkChange {
	queryKey: QueryKey;
	item: FeedItemRow;
	removeFromList: boolean;
}

interface MarkAllChange {
	queryKey: QueryKey;
	feedId?: string;
	categoryId?: string;
	isRead: boolean;
}

interface UseFeedItemsParams {
	userId: string | null;
	guest: GuestSession | null;
	feedId?: string;
	categoryId?: string;
	view: 'all' | 'bookmarks';
	onSidebarRefresh: () => void;
	onBookmarkCountChange?: (delta: number) => void;
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
}: UseFeedItemsParams): UseFeedItemsResult {
	const queryClient = useQueryClient();
	const effectiveUserId = userId ?? guest?.demoUserId ?? null;
	const queryOptions = useMemo(
		() => feedItemsQueryOptions({ effectiveUserId, feedId, categoryId, view }),
		[effectiveUserId, feedId, categoryId, view],
	);
	const { queryKey } = queryOptions;

	const {
		data,
		isPending,
		isError,
		isFetching,
		hasNextPage,
		isFetchingNextPage,
		fetchNextPage,
		refetch,
	} = useInfiniteQuery(queryOptions);
	// A retry after an error keeps the error status until it settles: show loading meanwhile.
	const retrying = isError && isFetching;

	const items = useMemo(() => data?.pages.flatMap((page) => page.items) ?? [], [data]);

	const updateItems = useCallback(
		(key: QueryKey, update: (items: Array<FeedItemRow>) => Array<FeedItemRow>) => {
			queryClient.setQueryData<ItemPages>(key, (prev) =>
				prev
					? { ...prev, pages: prev.pages.map((page) => ({ ...page, items: update(page.items) })) }
					: prev,
			);
		},
		[queryClient],
	);

	// No cancelQueries before the optimistic updates: it would also abort a
	// "load more" in flight, and the only refetches here follow an explicit refresh.
	const { mutateAsync: changeRead } = useMutation({
		mutationFn: ({ itemId, isRead }: ReadChange) =>
			isRead ? markReadFn({ data: { itemId } }) : unmarkReadFn({ data: { itemId } }),
		onMutate: ({ queryKey: key, itemId, isRead }) => {
			updateItems(key, (prev) => withItemRead(prev, itemId, isRead));
		},
		onError: (_err, { queryKey: key, itemId, wasRead }) => {
			updateItems(key, (prev) => withItemRead(prev, itemId, wasRead));
		},
	});

	const { mutateAsync: toggleBookmark } = useMutation({
		mutationFn: ({ item }: BookmarkChange) => toggleBookmarkFn({ data: { itemId: item.id } }),
		onMutate: ({ queryKey: key, item, removeFromList }) => {
			const position = findItemPosition(queryClient.getQueryData<ItemPages>(key), item.id);
			updateItems(key, (prev) =>
				removeFromList
					? prev.filter((i) => i.id !== item.id)
					: prev.map((i) => (i.id === item.id ? { ...i, isBookmarked: !item.isBookmarked } : i)),
			);
			onBookmarkCountChange?.(item.isBookmarked ? -1 : 1);
			return { position };
		},
		onSuccess: () => {
			onSidebarRefresh();
		},
		onError: (_err, { queryKey: key, item, removeFromList }, context) => {
			if (removeFromList) {
				const position = context?.position;
				if (position) {
					queryClient.setQueryData<ItemPages>(key, (prev) =>
						prev ? withItemAt(prev, item, position) : prev,
					);
				}
			} else {
				updateItems(key, (prev) =>
					prev.map((i) => (i.id === item.id ? { ...i, isBookmarked: item.isBookmarked } : i)),
				);
			}
			onBookmarkCountChange?.(item.isBookmarked ? 1 : -1);
		},
	});

	const markAllMutation = useMutation({
		mutationFn: ({ feedId: fId, categoryId: cId, isRead }: MarkAllChange) =>
			isRead
				? markAllReadFn({ data: { feedId: fId, categoryId: cId } })
				: markAllUnreadFn({ data: { feedId: fId, categoryId: cId } }),
		onSuccess: (_result, { queryKey: key, isRead }) => {
			updateItems(key, (prev) => prev.map((item) => ({ ...item, isRead })));
			onSidebarRefresh();
		},
		onError: (err, { isRead }) => {
			console.error(`Failed to mark all as ${isRead ? 'read' : 'unread'}`, err);
		},
	});
	const { mutateAsync: markAll } = markAllMutation;

	const handleMarkRead = useCallback(
		async (itemId: string) => {
			if (!userId) return;
			const item = items.find((i) => i.id === itemId);
			if (!item) return;
			// Sent even when the item already looks read: this tab can be stale (another
			// tab marked it unread), and the server's mark read is idempotent.
			await changeRead({ queryKey, itemId, isRead: true, wasRead: item.isRead }).catch(() => {});
		},
		[userId, items, queryKey, changeRead],
	);

	const handleReadToggle = useCallback(
		async (itemId: string) => {
			if (!userId) return;
			const wasRead = items.find((i) => i.id === itemId)?.isRead ?? false;
			await changeRead({ queryKey, itemId, isRead: !wasRead, wasRead }).catch(() => {});
		},
		[userId, items, queryKey, changeRead],
	);

	const handleBookmarkToggle = useCallback(
		async (itemId: string) => {
			if (!userId) return;
			const item = items.find((i) => i.id === itemId);
			if (!item) return;
			await toggleBookmark({ queryKey, item, removeFromList: view === 'bookmarks' }).catch(
				() => {},
			);
		},
		[userId, items, queryKey, view, toggleBookmark],
	);

	const handleMarkAllRead = useCallback(async () => {
		if (!userId) return;
		await markAll({ queryKey, feedId, categoryId, isRead: true }).catch(() => {});
	}, [userId, queryKey, feedId, categoryId, markAll]);

	const handleMarkAllUnread = useCallback(async () => {
		if (!userId) return;
		await markAll({ queryKey, feedId, categoryId, isRead: false }).catch(() => {});
	}, [userId, queryKey, feedId, categoryId, markAll]);

	const handleLoadMore = useCallback(async () => {
		if (!hasNextPage || isFetchingNextPage) return;
		await fetchNextPage();
	}, [hasNextPage, isFetchingNextPage, fetchNextPage]);

	const handleRetry = useCallback(() => {
		void refetch();
	}, [refetch]);

	const markingAll = markAllMutation.isPending ? markAllMutation.variables.isRead : null;
	const lastPage = data?.pages.at(-1);

	return {
		items,
		totalCount: lastPage?.totalCount ?? 0,
		hasMore: hasNextPage,
		loading: effectiveUserId !== null && (isPending || retrying),
		loadingMore: isFetchingNextPage,
		error: isError && !retrying ? 'Failed to load articles. Please try again.' : null,
		feedInfo: data?.pages[0]?.feedInfo ?? null,
		markingAllRead: markingAll === true,
		markingAllUnread: markingAll === false,
		handleMarkRead,
		handleReadToggle,
		handleBookmarkToggle,
		handleMarkAllRead,
		handleMarkAllUnread,
		handleLoadMore,
		handleRetry,
	};
}
