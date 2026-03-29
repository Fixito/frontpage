import { useState } from 'react';
import { Loader2, Sparkles } from 'lucide-react';
import type { FeedPreview } from '@/lib/feed-service';
import { addFeedFn, validateFeedUrlFn } from '@/lib/feed-service';
import { suggestCategoryFn } from '@/lib/ai-service';
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

interface AddFeedDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	userId: string;
	categories: Array<{ id: string; name: string }>;
	onSuccess: () => void;
}

type Step = 'url' | 'preview';

export function AddFeedDialog({
	open,
	onOpenChange,
	userId,
	categories,
	onSuccess,
}: AddFeedDialogProps) {
	const [step, setStep] = useState<Step>('url');
	const [url, setUrl] = useState('');
	const [preview, setPreview] = useState<FeedPreview | null>(null);
	const [selectedCategoryId, setSelectedCategoryId] = useState('');
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [suggestedCategory, setSuggestedCategory] = useState<string | null>(null);
	const [suggestionDismissed, setSuggestionDismissed] = useState(false);

	function resetState() {
		setStep('url');
		setUrl('');
		setPreview(null);
		setSelectedCategoryId('');
		setLoading(false);
		setError(null);
		setSuggestedCategory(null);
		setSuggestionDismissed(false);
	}

	function handleOpenChange(nextOpen: boolean) {
		if (!nextOpen) resetState();
		onOpenChange(nextOpen);
	}

	async function handleCheckFeed() {
		const trimmed = url.trim();
		if (!trimmed) {
			setError('Please enter a URL');
			return;
		}
		setLoading(true);
		setError(null);
		try {
			const result = await validateFeedUrlFn({ data: { url: trimmed } });
			setPreview(result);
			setStep('preview');
			if (categories.length > 0) {
				void suggestCategoryFn({
					data: {
						feedTitle: result.title,
						feedDescription: result.description ?? null,
						categoryNames: categories.map((c) => c.name),
					},
				})
					.then((suggestion) => {
						if (suggestion) setSuggestedCategory(suggestion);
					})
					.catch(() => {
						// ignore suggestion errors
					});
			}
		} catch (err) {
			setError(
				err instanceof Error
					? err.message
					: 'Failed to validate feed. Check the URL and try again.',
			);
		} finally {
			setLoading(false);
		}
	}

	async function handleAddFeed() {
		if (!preview) return;
		setLoading(true);
		setError(null);
		try {
			await addFeedFn({
				data: {
					userId,
					url: preview.finalUrl,
					categoryId: selectedCategoryId || null,
				},
			});
			onSuccess();
			handleOpenChange(false);
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Failed to add feed. Please try again.');
		} finally {
			setLoading(false);
		}
	}

	return (
		<Dialog open={open} onOpenChange={handleOpenChange}>
			<DialogContent className="sm:max-w-md">
				{step === 'url' ? (
					<>
						<DialogHeader>
							<DialogTitle>Add Feed</DialogTitle>
							<DialogDescription>Enter the URL of an RSS or Atom feed to add.</DialogDescription>
						</DialogHeader>

						<div className="flex flex-col gap-3">
							<div className="flex flex-col gap-1.5">
								<Label htmlFor="feed-url">Feed URL</Label>
								<Input
									id="feed-url"
									type="url"
									placeholder="https://example.com/feed.xml"
									value={url}
									onChange={(e) => setUrl(e.target.value)}
									onKeyDown={(e) => {
										if (e.key === 'Enter' && !loading) handleCheckFeed();
									}}
									disabled={loading}
									aria-describedby={error ? 'feed-url-error' : undefined}
									aria-invalid={error ? true : undefined}
								/>
								{error && (
									<p id="feed-url-error" role="alert" className="text-destructive text-sm">
										{error}
									</p>
								)}
							</div>
						</div>

						<DialogFooter>
							<Button onClick={handleCheckFeed} disabled={loading || !url.trim()}>
								{loading && <Loader2 size={14} className="animate-spin" aria-hidden />}
								{loading ? 'Checking…' : 'Check Feed'}
							</Button>
						</DialogFooter>
					</>
				) : (
					<>
						<DialogHeader>
							<DialogTitle>Feed Preview</DialogTitle>
							<DialogDescription>Review the feed details before adding.</DialogDescription>
						</DialogHeader>

						{preview && (
							<div className="flex flex-col gap-4">
								{/* Feed preview card */}
								<div className="bg-muted/50 flex items-start gap-3 rounded-md p-3">
									{preview.faviconUrl && (
										<img
											src={preview.faviconUrl}
											alt=""
											width={20}
											height={20}
											className="mt-0.5 shrink-0 rounded-sm"
											aria-hidden
										/>
									)}
									<div className="min-w-0 flex-1">
										<p className="truncate text-sm font-medium">{preview.title}</p>
										{preview.description && (
											<p className="text-muted-foreground mt-0.5 line-clamp-2 text-xs">
												{preview.description}
											</p>
										)}
										<p className="text-muted-foreground mt-1 text-xs">
											{preview.itemCount} article{preview.itemCount !== 1 ? 's' : ''} found
										</p>
									</div>
								</div>

								{/* AI category suggestion */}
								{suggestedCategory && !suggestionDismissed && !selectedCategoryId && (
									<div className="bg-accent/40 flex items-center gap-2 rounded-md px-3 py-2 text-xs">
										<Sparkles size={12} className="text-primary shrink-0" aria-hidden />
										<span className="text-muted-foreground flex-1">
											AI suggests: <strong className="text-foreground">{suggestedCategory}</strong>
										</span>
										<button
											type="button"
											className="text-primary font-medium hover:underline"
											onClick={() => {
												const cat = categories.find((c) => c.name === suggestedCategory);
												if (cat) setSelectedCategoryId(cat.id);
												setSuggestionDismissed(true);
											}}
										>
											Apply
										</button>
										<button
											type="button"
											className="text-muted-foreground hover:text-foreground ml-1"
											onClick={() => setSuggestionDismissed(true)}
											aria-label="Dismiss suggestion"
										>
											✕
										</button>
									</div>
								)}

								{/* Category selector */}
								<div className="flex flex-col gap-1.5">
									<Label htmlFor="feed-category">Category</Label>
									<Select value={selectedCategoryId} onValueChange={setSelectedCategoryId}>
										<SelectTrigger id="feed-category" className="w-full">
											<SelectValue placeholder="No category" />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="">No category</SelectItem>
											{categories.map((cat) => (
												<SelectItem key={cat.id} value={cat.id}>
													{cat.name}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>

								{error && (
									<p role="alert" className="text-destructive text-sm">
										{error}
									</p>
								)}
							</div>
						)}

						<DialogFooter className="flex-row items-center justify-between sm:justify-between">
							<Button
								variant="ghost"
								size="sm"
								onClick={() => {
									setStep('url');
									setError(null);
								}}
								disabled={loading}
							>
								← Back
							</Button>
							<Button onClick={handleAddFeed} disabled={loading}>
								{loading && <Loader2 size={14} className="animate-spin" aria-hidden />}
								{loading ? 'Adding…' : 'Add Feed'}
							</Button>
						</DialogFooter>
					</>
				)}
			</DialogContent>
		</Dialog>
	);
}
