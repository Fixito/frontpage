// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { FeedItemList } from './feed-item-list';
import type { FeedItemRow } from './types';

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
		contentHtml: '<p>Full article</p>',
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

afterEach(cleanup);

describe('FeedItemList external link action', () => {
	it.each(['list', 'compact', 'cards'] as const)(
		'expresses mark-read intent, not a toggle, in the %s layout',
		(layout) => {
			const onMarkRead = vi.fn();
			const onReadToggle = vi.fn();
			render(
				<FeedItemList
					items={[makeItem('a', false)]}
					layout={layout}
					onMarkRead={onMarkRead}
					onReadToggle={onReadToggle}
					onBookmarkToggle={vi.fn()}
					userId="u1"
				/>,
			);

			fireEvent.click(screen.getByRole('link', { name: 'Open in new tab' }));

			expect(onMarkRead).toHaveBeenCalledWith('a');
			expect(onReadToggle).not.toHaveBeenCalled();
		},
	);
});
