// @vitest-environment jsdom
import { createElement } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { feedItemsQueryKey, useFeedItems } from './use-feed-items';
import type { ReactNode } from 'react';
import type { FeedItemRow } from '@/lib/items-service';

const { getItemsFn, markReadFn, unmarkReadFn, markAllReadFn, toggleBookmarkFn } = vi.hoisted(
	() => ({
		getItemsFn: vi.fn(),
		markReadFn: vi.fn(),
		unmarkReadFn: vi.fn(),
		markAllReadFn: vi.fn(),
		toggleBookmarkFn: vi.fn(),
	}),
);

vi.mock('@/lib/items-service', () => ({
	getItemsFn,
	markReadFn,
	unmarkReadFn,
	markAllReadFn,
	markAllUnreadFn: vi.fn(),
	toggleBookmarkFn,
}));

function makeItem(id: string, isRead: boolean, isBookmarked = false): FeedItemRow {
	return {
		id,
		feedId: 'f1',
		feedTitle: 'Feed',
		feedFaviconUrl: null,
		feedHealthStatus: 'healthy',
		feedErrorMessage: null,
		url: `https://example.com/${id}`,
		title: id,
		description: null,
		contentHtml: null,
		author: null,
		publishedAt: null,
		fetchedAt: new Date(0),
		aiSummary: null,
		isRead,
		isBookmarked,
		categoryId: null,
		categoryName: null,
		categoryColor: null,
	};
}

function createWrapper(
	queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } }),
) {
	return ({ children }: { children: ReactNode }) =>
		createElement(QueryClientProvider, { client: queryClient }, children);
}

async function renderWithItems(userId: string | null, items: Array<FeedItemRow>) {
	getItemsFn.mockResolvedValue({ items, totalCount: items.length, hasMore: false, feedInfo: null });
	const hook = renderHook(
		() =>
			useFeedItems({
				userId,
				guest: userId ? null : { demoUserId: 'demo', expiresAt: new Date(0) },
				view: 'all',
				onSidebarRefresh: () => {},
			}),
		{ wrapper: createWrapper() },
	);
	await waitFor(() => expect(hook.result.current.loading).toBe(false));
	return hook;
}

/** A promise the test settles by hand, to observe the optimistic state before the server answers. */
function deferred() {
	let resolve: () => void = () => {};
	let reject: (error: Error) => void = () => {};
	const promise = new Promise<void>((res, rej) => {
		resolve = res;
		reject = rej;
	});
	return { promise, resolve, reject };
}

const ids = (items: Array<FeedItemRow>) => items.map((i) => i.id);

const isRead = (items: Array<FeedItemRow>, id: string) => items.find((i) => i.id === id)?.isRead;

beforeEach(() => {
	getItemsFn.mockReset();
	markReadFn.mockReset().mockResolvedValue(undefined);
	unmarkReadFn.mockReset().mockResolvedValue(undefined);
	markAllReadFn.mockReset().mockResolvedValue(undefined);
	toggleBookmarkFn.mockReset().mockResolvedValue(undefined);
});

describe('handleMarkRead (mark-read intent)', () => {
	it('marks an unread item read', async () => {
		const { result } = await renderWithItems('u1', [makeItem('a', false)]);

		await act(() => result.current.handleMarkRead('a'));

		await waitFor(() => expect(isRead(result.current.items, 'a')).toBe(true));
		expect(markReadFn).toHaveBeenCalledWith({ data: { itemId: 'a' } });
	});

	// Local state can be stale (another tab marked it unread), so the intent is
	// still sent; the server's mark read is idempotent.
	it('keeps an already-read item read and still tells the server', async () => {
		const { result } = await renderWithItems('u1', [makeItem('a', true)]);

		await act(() => result.current.handleMarkRead('a'));

		expect(isRead(result.current.items, 'a')).toBe(true);
		expect(markReadFn).toHaveBeenCalledWith({ data: { itemId: 'a' } });
		expect(unmarkReadFn).not.toHaveBeenCalled();
	});

	it('keeps an already-read item read when the server call fails', async () => {
		markReadFn.mockRejectedValue(new Error('boom'));
		const { result } = await renderWithItems('u1', [makeItem('a', true)]);

		await act(() => result.current.handleMarkRead('a'));

		expect(isRead(result.current.items, 'a')).toBe(true);
	});

	it('calls no server fn for an item not in the list', async () => {
		const { result } = await renderWithItems('u1', [makeItem('a', false)]);

		await act(() => result.current.handleMarkRead('missing'));

		expect(markReadFn).not.toHaveBeenCalled();
	});

	it('rolls back to unread when the server call fails', async () => {
		const server = deferred();
		markReadFn.mockReturnValue(server.promise);
		const { result } = await renderWithItems('u1', [makeItem('a', false)]);

		let markRead: Promise<void> = Promise.resolve();
		act(() => {
			markRead = result.current.handleMarkRead('a');
		});
		await waitFor(() => expect(isRead(result.current.items, 'a')).toBe(true));

		server.reject(new Error('boom'));
		await act(() => markRead);

		await waitFor(() => expect(isRead(result.current.items, 'a')).toBe(false));
	});

	it('does nothing for a Guest', async () => {
		const { result } = await renderWithItems(null, [makeItem('a', false)]);

		await act(() => result.current.handleMarkRead('a'));

		expect(isRead(result.current.items, 'a')).toBe(false);
		expect(markReadFn).not.toHaveBeenCalled();
	});
});

describe('handleReadToggle (explicit toggle)', () => {
	it('toggles unread → read', async () => {
		const { result } = await renderWithItems('u1', [makeItem('a', false)]);

		await act(() => result.current.handleReadToggle('a'));

		await waitFor(() => expect(isRead(result.current.items, 'a')).toBe(true));
		expect(markReadFn).toHaveBeenCalledWith({ data: { itemId: 'a' } });
	});

	it('toggles read → unread', async () => {
		const { result } = await renderWithItems('u1', [makeItem('a', true)]);

		await act(() => result.current.handleReadToggle('a'));

		await waitFor(() => expect(isRead(result.current.items, 'a')).toBe(false));
		expect(unmarkReadFn).toHaveBeenCalledWith({ data: { itemId: 'a' } });
	});
});

describe('filter switching', () => {
	it('shows cached items instantly when switching back to a visited Feed', async () => {
		getItemsFn.mockImplementation(({ data }: { data: { scope: { feedId?: string } } }) =>
			Promise.resolve({
				items: [makeItem(`${data.scope.feedId}-item`, false)],
				totalCount: 1,
				hasMore: false,
				feedInfo: null,
			}),
		);
		const { result, rerender } = renderHook(
			({ feedId }: { feedId: string }) =>
				useFeedItems({
					userId: 'u1',
					guest: null,
					feedId,
					view: 'all',
					onSidebarRefresh: () => {},
				}),
			{ wrapper: createWrapper(), initialProps: { feedId: 'f1' } },
		);
		await waitFor(() => expect(ids(result.current.items)).toEqual(['f1-item']));

		rerender({ feedId: 'f2' });
		await waitFor(() => expect(ids(result.current.items)).toEqual(['f2-item']));

		rerender({ feedId: 'f1' });
		expect(result.current.loading).toBe(false);
		expect(ids(result.current.items)).toEqual(['f1-item']);
	});
});

describe('optimistic updates and background refetches', () => {
	// Switching back to a visited Feed shows its cache and refetches it in the
	// background; a response read before the mark read must not undo it.
	it('keeps an item read when a refetch started before the mark read lands after it', async () => {
		let refetchResponse: (result: unknown) => void = () => {};
		getItemsFn.mockImplementation(({ data }: { data: { scope: { feedId?: string } } }) =>
			Promise.resolve({
				items: [makeItem(`${data.scope.feedId}-item`, false)],
				totalCount: 1,
				hasMore: false,
				feedInfo: null,
			}),
		);
		const { result, rerender } = renderHook(
			({ feedId }: { feedId: string }) =>
				useFeedItems({
					userId: 'u1',
					guest: null,
					feedId,
					view: 'all',
					onSidebarRefresh: () => {},
				}),
			{ wrapper: createWrapper(), initialProps: { feedId: 'f1' } },
		);
		await waitFor(() => expect(ids(result.current.items)).toEqual(['f1-item']));
		rerender({ feedId: 'f2' });
		await waitFor(() => expect(ids(result.current.items)).toEqual(['f2-item']));

		getItemsFn.mockImplementation(
			() =>
				new Promise((resolve) => {
					refetchResponse = resolve;
				}),
		);
		rerender({ feedId: 'f1' });
		await act(() => result.current.handleMarkRead('f1-item'));
		await waitFor(() => expect(isRead(result.current.items, 'f1-item')).toBe(true));

		await act(async () => {
			refetchResponse({
				items: [makeItem('f1-item', false)],
				totalCount: 1,
				hasMore: false,
				feedInfo: null,
			});
			await Promise.resolve();
		});

		await new Promise((resolve) => setTimeout(resolve, 20));
		expect(isRead(result.current.items, 'f1-item')).toBe(true);
	});
});

describe.each(['read', 'bookmark'] as const)('%s mutations and invalidation', (mutation) => {
	it.each([
		{ wasInvalidated: true, fails: false },
		{ wasInvalidated: true, fails: true },
		{ wasInvalidated: false, fails: false },
		{ wasInvalidated: false, fails: true },
	])(
		'settles with invalidated=$wasInvalidated, fails=$fails',
		async ({ wasInvalidated, fails }) => {
			const queryClient = new QueryClient({
				defaultOptions: { queries: { retry: false, staleTime: Infinity } },
			});
			const server = deferred();
			const serverFn = mutation === 'read' ? markReadFn : toggleBookmarkFn;
			serverFn.mockReturnValue(server.promise);
			const initialItems = [makeItem('a', false, true), makeItem('b', false, true)];
			getItemsFn.mockResolvedValue({
				items: initialItems,
				totalCount: 2,
				hasMore: false,
				feedInfo: null,
			});
			const { result } = renderHook(
				() =>
					useFeedItems({
						userId: 'u1',
						guest: null,
						view: mutation === 'read' ? 'all' : 'bookmarks',
						onSidebarRefresh: () => {},
					}),
				{ wrapper: createWrapper(queryClient) },
			);
			await waitFor(() => expect(ids(result.current.items)).toEqual(['a', 'b']));

			if (wasInvalidated) {
				// Hold the refresh that brings in a newly added Feed Item until the mutation cancels it.
				getItemsFn.mockImplementationOnce(() => new Promise(() => {}));
				act(() => {
					void queryClient.invalidateQueries({ queryKey: feedItemsQueryKey });
				});
				await waitFor(() => expect(getItemsFn).toHaveBeenCalledTimes(2));
			}

			let change: Promise<void> = Promise.resolve();
			act(() => {
				change =
					mutation === 'read'
						? result.current.handleMarkRead('a')
						: result.current.handleBookmarkToggle('a');
			});
			await waitFor(() => {
				if (mutation === 'read') expect(isRead(result.current.items, 'a')).toBe(true);
				else expect(ids(result.current.items)).toEqual(['b']);
			});
			expect(getItemsFn).toHaveBeenCalledTimes(wasInvalidated ? 2 : 1);

			const settledItems =
				mutation === 'read'
					? [makeItem('a', !fails, true), initialItems[1]]
					: fails
						? initialItems
						: [initialItems[1]];
			getItemsFn.mockResolvedValue({
				items: [...settledItems, makeItem('new', false, true)],
				totalCount: settledItems.length + 1,
				hasMore: false,
				feedInfo: null,
			});
			if (fails) server.reject(new Error('boom'));
			else server.resolve();
			await act(() => change);

			await waitFor(() =>
				expect(ids(result.current.items)).toEqual([
					...ids(settledItems),
					...(wasInvalidated ? ['new'] : []),
				]),
			);
			if (mutation === 'read') expect(isRead(result.current.items, 'a')).toBe(!fails);
			expect(getItemsFn).toHaveBeenCalledTimes(wasInvalidated ? 3 : 1);
		},
	);
});

describe('pagination', () => {
	it('appends the next page on load more until the server has no more', async () => {
		getItemsFn.mockImplementation(({ data }: { data: { page: number } }) =>
			Promise.resolve(
				data.page === 1
					? { items: [makeItem('a', false)], totalCount: 2, hasMore: true, feedInfo: null }
					: { items: [makeItem('b', false)], totalCount: 2, hasMore: false, feedInfo: null },
			),
		);
		const { result } = renderHook(
			() => useFeedItems({ userId: 'u1', guest: null, view: 'all', onSidebarRefresh: () => {} }),
			{ wrapper: createWrapper() },
		);
		await waitFor(() => expect(result.current.hasMore).toBe(true));

		await act(() => result.current.handleLoadMore());

		await waitFor(() => expect(ids(result.current.items)).toEqual(['a', 'b']));
		expect(result.current.hasMore).toBe(false);
		expect(result.current.totalCount).toBe(2);
	});
});

describe('error and retry', () => {
	it('shows an error, then the items after a retry', async () => {
		getItemsFn.mockRejectedValueOnce(new Error('boom'));
		getItemsFn.mockResolvedValue({
			items: [makeItem('a', false)],
			totalCount: 1,
			hasMore: false,
			feedInfo: null,
		});
		const { result } = renderHook(
			() => useFeedItems({ userId: 'u1', guest: null, view: 'all', onSidebarRefresh: () => {} }),
			{ wrapper: createWrapper() },
		);
		await waitFor(() => expect(result.current.error).not.toBeNull());

		act(() => result.current.handleRetry());

		await waitFor(() => expect(ids(result.current.items)).toEqual(['a']));
		expect(result.current.error).toBeNull();
	});
});

describe('handleBookmarkToggle', () => {
	function renderBookmarks(onBookmarkCountChange: (delta: number) => void) {
		getItemsFn.mockResolvedValue({
			items: [makeItem('a', false, true), makeItem('b', false, true)],
			totalCount: 2,
			hasMore: false,
			feedInfo: null,
		});
		return renderHook(
			() =>
				useFeedItems({
					userId: 'u1',
					guest: null,
					view: 'bookmarks',
					onSidebarRefresh: () => {},
					onBookmarkCountChange,
				}),
			{ wrapper: createWrapper() },
		);
	}

	it('bookmarks an item in the all view', async () => {
		const onBookmarkCountChange = vi.fn();
		getItemsFn.mockResolvedValue({
			items: [makeItem('a', false)],
			totalCount: 1,
			hasMore: false,
			feedInfo: null,
		});
		const { result } = renderHook(
			() =>
				useFeedItems({
					userId: 'u1',
					guest: null,
					view: 'all',
					onSidebarRefresh: () => {},
					onBookmarkCountChange,
				}),
			{ wrapper: createWrapper() },
		);
		await waitFor(() => expect(result.current.loading).toBe(false));

		await act(() => result.current.handleBookmarkToggle('a'));

		await waitFor(() => expect(result.current.items[0]?.isBookmarked).toBe(true));
		expect(onBookmarkCountChange).toHaveBeenCalledWith(1);
	});

	it('removes the item from the Bookmarks view', async () => {
		const onBookmarkCountChange = vi.fn();
		const { result } = renderBookmarks(onBookmarkCountChange);
		await waitFor(() => expect(result.current.loading).toBe(false));

		await act(() => result.current.handleBookmarkToggle('a'));

		await waitFor(() => expect(ids(result.current.items)).toEqual(['b']));
		expect(toggleBookmarkFn).toHaveBeenCalledWith({ data: { itemId: 'a' } });
		expect(onBookmarkCountChange).toHaveBeenCalledWith(-1);
	});

	it('puts the item back in place and restores the count when the server call fails', async () => {
		const server = deferred();
		toggleBookmarkFn.mockReturnValue(server.promise);
		const onBookmarkCountChange = vi.fn();
		const { result } = renderBookmarks(onBookmarkCountChange);
		await waitFor(() => expect(result.current.loading).toBe(false));

		let toggle: Promise<void> = Promise.resolve();
		act(() => {
			toggle = result.current.handleBookmarkToggle('a');
		});
		await waitFor(() => expect(ids(result.current.items)).toEqual(['b']));

		server.reject(new Error('boom'));
		await act(() => toggle);

		await waitFor(() => expect(ids(result.current.items)).toEqual(['a', 'b']));
		expect(onBookmarkCountChange.mock.calls).toEqual([[-1], [1]]);
	});
});

describe('handleMarkAllRead', () => {
	it('marks every listed item read and refreshes the sidebar', async () => {
		const onSidebarRefresh = vi.fn();
		getItemsFn.mockResolvedValue({
			items: [makeItem('a', false), makeItem('b', false)],
			totalCount: 2,
			hasMore: false,
			feedInfo: null,
		});
		const { result } = renderHook(
			() =>
				useFeedItems({ userId: 'u1', guest: null, feedId: 'f1', view: 'all', onSidebarRefresh }),
			{ wrapper: createWrapper() },
		);
		await waitFor(() => expect(result.current.loading).toBe(false));

		await act(() => result.current.handleMarkAllRead());

		await waitFor(() => expect(result.current.items.every((i) => i.isRead)).toBe(true));
		expect(markAllReadFn).toHaveBeenCalledWith({ data: { feedId: 'f1', categoryId: undefined } });
		expect(onSidebarRefresh).toHaveBeenCalled();
		expect(result.current.markingAllRead).toBe(false);
	});
});

describe('Item Scope', () => {
	it.each([
		[{ view: 'all' as const }, { kind: 'all' }],
		[
			{ view: 'all' as const, feedId: 'f1' },
			{ kind: 'feed', feedId: 'f1' },
		],
		[
			{ view: 'all' as const, categoryId: 'c1' },
			{ kind: 'category', categoryId: 'c1' },
		],
		[{ view: 'bookmarks' as const, feedId: 'f1' }, { kind: 'bookmarks' }],
	])('lists %o as scope %o', async (filter, scope) => {
		getItemsFn.mockResolvedValue({ items: [], totalCount: 0, hasMore: false, feedInfo: null });

		renderHook(
			() => useFeedItems({ userId: 'u1', guest: null, onSidebarRefresh: () => {}, ...filter }),
			{ wrapper: createWrapper() },
		);

		await waitFor(() =>
			expect(getItemsFn).toHaveBeenCalledWith({
				data: { scope, unreadOnly: false, page: 1, pageSize: 50 },
			}),
		);
	});

	it('asks for unread Feed Items only when filtered', async () => {
		getItemsFn.mockResolvedValue({ items: [], totalCount: 0, hasMore: false, feedInfo: null });

		renderHook(
			() =>
				useFeedItems({
					userId: 'u1',
					guest: null,
					view: 'all',
					unreadOnly: true,
					onSidebarRefresh: () => {},
				}),
			{ wrapper: createWrapper() },
		);

		await waitFor(() =>
			expect(getItemsFn).toHaveBeenCalledWith({
				data: { scope: { kind: 'all' }, unreadOnly: true, page: 1, pageSize: 50 },
			}),
		);
	});
});
