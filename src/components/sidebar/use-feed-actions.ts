import { useRef, useState } from 'react';
import type { RefCallback } from 'react';
import type { FeedAction } from './feed-actions-menu';
import type { FeedNavItem } from './types';

/** An Edit or Remove chosen from a Feed row's menu. */
export interface PendingFeedAction {
	action: FeedAction;
	feed: FeedNavItem;
	categoryId: string | null;
}

/** What a Feed row needs to offer Edit and Remove. */
export interface FeedRowActions {
	onAction: (pending: PendingFeedAction) => void;
	registerTrigger: (feedId: string) => RefCallback<HTMLButtonElement>;
}

export interface FeedActionsState {
	rowActions: FeedRowActions;
	/** The last chosen action. Kept after its dialog closes, so focus can be restored. */
	pending: PendingFeedAction | null;
	dialogOpen: boolean;
	setDialogOpen: (open: boolean) => void;
	/** The menu trigger of a Feed row, if that row is mounted. */
	triggerFor: (feedId: string) => HTMLButtonElement | undefined;
}

/**
 * State shared by the Feed rows (which open an action) and `FeedActionDialogs`
 * (which shows it): the chosen action, whether its dialog is open, and each
 * row's menu trigger so focus can return to it.
 */
export function useFeedActions(): FeedActionsState {
	const [pending, setPending] = useState<PendingFeedAction | null>(null);
	const [dialogOpen, setDialogOpen] = useState(false);
	const triggers = useRef(new Map<string, HTMLButtonElement>());

	const rowActions: FeedRowActions = {
		onAction: (next) => {
			setPending(next);
			setDialogOpen(true);
		},
		registerTrigger: (feedId) => (el) => {
			if (!el) return;
			triggers.current.set(feedId, el);
			return () => {
				if (triggers.current.get(feedId) === el) triggers.current.delete(feedId);
			};
		},
	};

	return {
		rowActions,
		pending,
		dialogOpen,
		setDialogOpen,
		triggerFor: (feedId) => triggers.current.get(feedId),
	};
}
