// @vitest-environment jsdom
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useFeedItems } from './use-feed-items';
import type { FeedItemRow } from '@/lib/items-service';

const { getItemsFn, markReadFn, unmarkReadFn } = vi.hoisted(() => ({
	getItemsFn: vi.fn(),
	markReadFn: vi.fn(),
	unmarkReadFn: vi.fn(),
}));

vi.mock('@/lib/items-service', () => ({
	getItemsFn,
	markReadFn,
	unmarkReadFn,
	markAllReadFn: vi.fn(),
	markAllUnreadFn: vi.fn(),
	toggleBookmarkFn: vi.fn(),
}));

function makeItem(id: string, isRead: boolean): FeedItemRow {
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
		isBookmarked: false,
		categoryId: null,
		categoryName: null,
		categoryColor: null,
	};
}

async function renderWithItems(userId: string | null, items: Array<FeedItemRow>) {
	getItemsFn.mockResolvedValue({ items, totalCount: items.length, hasMore: false, feedInfo: null });
	const hook = renderHook(() =>
		useFeedItems({
			userId,
			guest: userId ? null : { demoUserId: 'demo', expiresAt: new Date(0) },
			view: 'all',
			onSidebarRefresh: () => {},
		}),
	);
	await waitFor(() => expect(hook.result.current.loading).toBe(false));
	return hook;
}

const isRead = (items: Array<FeedItemRow>, id: string) => items.find((i) => i.id === id)?.isRead;

beforeEach(() => {
	getItemsFn.mockReset();
	markReadFn.mockReset().mockResolvedValue(undefined);
	unmarkReadFn.mockReset().mockResolvedValue(undefined);
});

describe('handleMarkRead (mark-read intent)', () => {
	it('marks an unread item read', async () => {
		const { result } = await renderWithItems('u1', [makeItem('a', false)]);

		act(() => result.current.handleMarkRead('a'));

		expect(isRead(result.current.items, 'a')).toBe(true);
		expect(markReadFn).toHaveBeenCalledWith({ data: { itemId: 'a' } });
	});

	it('leaves an already-read item read and calls no server fn', async () => {
		const { result } = await renderWithItems('u1', [makeItem('a', true)]);

		act(() => result.current.handleMarkRead('a'));

		expect(isRead(result.current.items, 'a')).toBe(true);
		expect(markReadFn).not.toHaveBeenCalled();
		expect(unmarkReadFn).not.toHaveBeenCalled();
	});

	it('rolls back to unread when the server call fails', async () => {
		markReadFn.mockRejectedValue(new Error('boom'));
		const { result } = await renderWithItems('u1', [makeItem('a', false)]);

		act(() => result.current.handleMarkRead('a'));

		await waitFor(() => expect(isRead(result.current.items, 'a')).toBe(false));
	});

	it('does nothing for a Guest', async () => {
		const { result } = await renderWithItems(null, [makeItem('a', false)]);

		act(() => result.current.handleMarkRead('a'));

		expect(isRead(result.current.items, 'a')).toBe(false);
		expect(markReadFn).not.toHaveBeenCalled();
	});
});

describe('handleToggleRead (explicit toggle)', () => {
	it('toggles unread → read', async () => {
		const { result } = await renderWithItems('u1', [makeItem('a', false)]);

		act(() => result.current.handleToggleRead('a'));

		expect(isRead(result.current.items, 'a')).toBe(true);
		expect(markReadFn).toHaveBeenCalledWith({ data: { itemId: 'a' } });
	});

	it('toggles read → unread', async () => {
		const { result } = await renderWithItems('u1', [makeItem('a', true)]);

		act(() => result.current.handleToggleRead('a'));

		expect(isRead(result.current.items, 'a')).toBe(false);
		expect(unmarkReadFn).toHaveBeenCalledWith({ data: { itemId: 'a' } });
	});
});
