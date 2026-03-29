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
	userId: string;
	onSuccess: () => void;
}

export function DeleteFeedDialog({
	open,
	onOpenChange,
	feed,
	userId,
	onSuccess,
}: DeleteFeedDialogProps) {
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	async function handleDelete() {
		setLoading(true);
		setError(null);
		try {
			await deleteFeedFn({ data: { userId, feedId: feed.id } });
			onOpenChange(false);
			setTimeout(() => onSuccess(), 0);
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Failed to delete feed. Please try again.');
			setLoading(false);
		}
	}

	return (
		<AlertDialog open={open} onOpenChange={onOpenChange}>
			<AlertDialogContent size="sm">
				<AlertDialogHeader>
					<AlertDialogTitle>Delete feed?</AlertDialogTitle>
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
					<AlertDialogAction variant="destructive" onClick={handleDelete} disabled={loading}>
						{loading ? 'Deleting…' : 'Delete'}
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}
