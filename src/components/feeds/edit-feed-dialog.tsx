import { useEffect, useState } from 'react';
import { updateFeedFn } from '@/lib/category-service';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';

interface EditFeedDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	feed: { id: string; title: string; categoryId: string | null; url: string };
	userId: string;
	categories: Array<{ id: string; name: string }>;
	onSuccess: () => void;
}

export function EditFeedDialog({
	open,
	onOpenChange,
	feed,
	userId,
	categories,
	onSuccess,
}: EditFeedDialogProps) {
	const [title, setTitle] = useState(feed.title);
	const [selectedCategoryId, setSelectedCategoryId] = useState(feed.categoryId ?? '__none__');
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		if (open) {
			setTitle(feed.title);
			setSelectedCategoryId(feed.categoryId ?? '__none__');
			setError(null);
		}
	}, [open, feed.title, feed.categoryId]);

	async function handleSave() {
		const trimmedTitle = title.trim();
		if (!trimmedTitle) {
			setError('Title cannot be empty');
			return;
		}
		setLoading(true);
		setError(null);
		try {
			await updateFeedFn({
				data: {
					userId,
					feedId: feed.id,
					customTitle: trimmedTitle,
					categoryId: selectedCategoryId === '__none__' ? null : selectedCategoryId,
				},
			});
			onOpenChange(false);
			setTimeout(() => onSuccess(), 0);
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Failed to save changes. Please try again.');
		} finally {
			setLoading(false);
		}
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>Edit Feed</DialogTitle>
					<DialogDescription>Update the display name and category for this feed.</DialogDescription>
				</DialogHeader>

				<div className="flex flex-col gap-4">
					<div className="flex flex-col gap-1.5">
						<Label htmlFor="edit-feed-title">Display name</Label>
						<Input
							id="edit-feed-title"
							value={title}
							onChange={(e) => setTitle(e.target.value)}
							onKeyDown={(e) => {
								if (e.key === 'Enter' && !loading) handleSave();
							}}
							disabled={loading}
							aria-describedby={error ? 'edit-feed-error' : undefined}
							aria-invalid={error ? true : undefined}
						/>
					</div>

					<div className="flex flex-col gap-1.5">
						<Label htmlFor="edit-feed-category">Category</Label>
						<Select value={selectedCategoryId} onValueChange={setSelectedCategoryId}>
							<SelectTrigger id="edit-feed-category" className="w-full">
								<SelectValue placeholder="No category" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="__none__">No category</SelectItem>
								{categories.map((cat) => (
									<SelectItem key={cat.id} value={cat.id}>
										{cat.name}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>

					<div className="flex flex-col gap-1">
						<p className="text-muted-foreground text-xs font-medium">Feed URL</p>
						<p className="text-muted-foreground truncate text-xs" title={feed.url}>
							{feed.url}
						</p>
					</div>

					{error && (
						<p id="edit-feed-error" role="alert" className="text-destructive text-sm">
							{error}
						</p>
					)}
				</div>

				<DialogFooter>
					<Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
						Cancel
					</Button>
					<Button onClick={handleSave} disabled={loading || !title.trim()}>
						{loading ? 'Saving…' : 'Save'}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
