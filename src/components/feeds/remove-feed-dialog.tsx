import { useIsMutating, useMutation } from '@tanstack/react-query';
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

interface RemovableFeed {
	id: string;
	title: string;
}

interface RemoveFeedDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	feed: RemovableFeed;
	onSuccess: () => void;
	onCloseAutoFocus?: (event: Event) => void;
}

function removeFeedMutationKey(feedId: string) {
	return ['removeFeed', feedId];
}

export function RemoveFeedDialog({
	open,
	onOpenChange,
	feed,
	onSuccess,
	onCloseAutoFocus,
}: RemoveFeedDialogProps) {
	const isRemoving = useIsMutating({ mutationKey: removeFeedMutationKey(feed.id) }) > 0;

	return (
		<AlertDialog
			open={open}
			onOpenChange={(next) => {
				// Don't dismiss mid-request: a failure would otherwise go unseen.
				if (!isRemoving) onOpenChange(next);
			}}
		>
			<AlertDialogContent size="sm" onCloseAutoFocus={onCloseAutoFocus}>
				{/* Mounted only while open, so each opening starts without a stale error. */}
				{open && (
					<RemoveFeedConfirmation
						key={feed.id}
						feed={feed}
						onOpenChange={onOpenChange}
						onSuccess={onSuccess}
					/>
				)}
			</AlertDialogContent>
		</AlertDialog>
	);
}

interface RemoveFeedConfirmationProps {
	feed: RemovableFeed;
	onOpenChange: (open: boolean) => void;
	onSuccess: () => void;
}

function RemoveFeedConfirmation({ feed, onOpenChange, onSuccess }: RemoveFeedConfirmationProps) {
	const mutation = useMutation({
		mutationKey: removeFeedMutationKey(feed.id),
		mutationFn: () => deleteFeedFn({ data: { feedId: feed.id } }),
		onSuccess: () => {
			// onSuccess runs before close so callers know the Feed is gone when focus is restored.
			onSuccess();
			onOpenChange(false);
		},
	});

	return (
		<>
			<AlertDialogHeader>
				<AlertDialogTitle>Remove feed?</AlertDialogTitle>
				<AlertDialogDescription>
					<span>
						<strong className="text-foreground">{feed.title}</strong> and all its articles will be
						permanently removed. This cannot be undone.
					</span>
					{mutation.error && (
						<span role="alert" className="text-destructive mt-2 block text-sm">
							{mutation.error.message || 'Failed to remove feed. Please try again.'}
						</span>
					)}
				</AlertDialogDescription>
			</AlertDialogHeader>
			<AlertDialogFooter>
				<AlertDialogCancel disabled={mutation.isPending}>Cancel</AlertDialogCancel>
				<AlertDialogAction
					variant="destructive"
					onClick={(event) => {
						// Radix closes on click by default; stay open until the request settles.
						event.preventDefault();
						mutation.mutate();
					}}
					disabled={mutation.isPending}
				>
					{mutation.isPending ? 'Removing…' : 'Remove'}
				</AlertDialogAction>
			</AlertDialogFooter>
		</>
	);
}
