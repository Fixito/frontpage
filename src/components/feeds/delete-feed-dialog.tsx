import { useState } from 'react';
import { deleteFeedFn } from '@/lib/category-service';
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface DeleteFeedDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	feed: { id: string; title: string };
	onSuccess: () => void;
	onCloseAutoFocus?: (event: Event) => void;
}

export function DeleteFeedDialog({
	open,
	onOpenChange,
	feed,
	onSuccess,
	onCloseAutoFocus,
}: DeleteFeedDialogProps) {
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	// Reset dialog state during render when it opens
	const [prevOpen, setPrevOpen] = useState(open);
	if (prevOpen !== open) {
		setPrevOpen(open);
		if (open) {
			setLoading(false);
			setError(null);
		}
	}

	async function handleDelete() {
		setLoading(true);
		setError(null);
		try {
			await deleteFeedFn({ data: { feedId: feed.id } });
			// onSuccess runs before close so callers know the Feed is gone when focus is restored.
			onSuccess();
			onOpenChange(false);
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Failed to remove feed. Please try again.');
			setLoading(false);
		}
	}

	return (
		<AlertDialog
			open={open}
			onOpenChange={(next) => {
				// Don't dismiss mid-request: a failure would otherwise go unseen.
				if (!loading) onOpenChange(next);
			}}
		>
			<AlertDialogContent size="sm" onCloseAutoFocus={onCloseAutoFocus}>
				<AlertDialogHeader>
					<AlertDialogTitle>Remove feed?</AlertDialogTitle>
					<AlertDialogDescription>
						<span>
							<strong className="text-foreground">{feed.title}</strong> and all its articles will be
							permanently removed. This cannot be undone.
						</span>
						{error && (
							<span role="alert" className="text-destructive mt-2 block text-sm">
								{error}
							</span>
						)}
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
					<AlertDialogAction
						variant="destructive"
						onClick={(event) => {
							// Radix closes on click by default; stay open until the request settles.
							event.preventDefault();
							void handleDelete();
						}}
						disabled={loading}
					>
						{loading ? 'Removing…' : 'Remove'}
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}
