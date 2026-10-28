import { Suspense, lazy, useRef } from 'react';
import type { RefObject } from 'react';
import type { FeedActionsState } from './use-feed-actions';
import type { CategoryNavItem } from './types';

const EditFeedDialog = lazy(() =>
	import('@/components/feeds/edit-feed-dialog').then((m) => ({ default: m.EditFeedDialog })),
);
const RemoveFeedDialog = lazy(() =>
	import('@/components/feeds/remove-feed-dialog').then((m) => ({ default: m.RemoveFeedDialog })),
);

interface FeedActionDialogsProps {
	actions: FeedActionsState;
	categories: Array<CategoryNavItem>;
	/** Receives focus when the Feed whose menu opened the dialog was removed. */
	fallbackFocusRef: RefObject<HTMLElement | null>;
	onFeedUpdated: () => Promise<void>;
	onFeedRemoved: (feedId: string) => Promise<void>;
}

/** The Edit or Remove dialog for the action chosen in a Feed row's menu. */
export function FeedActionDialogs({
	actions,
	categories,
	fallbackFocusRef,
	onFeedUpdated,
	onFeedRemoved,
}: FeedActionDialogsProps) {
	const { pending, dialogOpen, setDialogOpen, triggerFor } = actions;
	const removedFeedId = useRef<string | null>(null);

	if (!pending) return null;
	const { feed } = pending;

	// Radix only restores focus to a <DialogTrigger>, so return it to the Feed's menu
	// trigger by hand. A removed Feed has no trigger left; use the fallback.
	function restoreFocus(event: Event) {
		event.preventDefault();
		if (removedFeedId.current === feed.id) {
			fallbackFocusRef.current?.focus();
		} else {
			triggerFor(feed.id)?.focus();
		}
	}

	async function handleUpdated() {
		await onFeedUpdated();
		// Moving a Feed to another Category remounts its row, dropping focus to <body>.
		if (document.activeElement === document.body) {
			triggerFor(feed.id)?.focus();
		}
	}

	function handleRemoved() {
		removedFeedId.current = feed.id;
		void onFeedRemoved(feed.id);
	}

	return (
		<Suspense fallback={null}>
			{pending.action === 'edit' ? (
				<EditFeedDialog
					open={dialogOpen}
					onOpenChange={setDialogOpen}
					feed={{ id: feed.id, title: feed.title, url: feed.url, categoryId: pending.categoryId }}
					categories={categories.map((c) => ({ id: c.id, name: c.name }))}
					onSuccess={() => void handleUpdated()}
					onCloseAutoFocus={restoreFocus}
				/>
			) : (
				<RemoveFeedDialog
					open={dialogOpen}
					onOpenChange={setDialogOpen}
					feed={feed}
					onSuccess={handleRemoved}
					onCloseAutoFocus={restoreFocus}
				/>
			)}
		</Suspense>
	);
}
