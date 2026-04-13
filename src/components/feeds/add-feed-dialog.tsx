import { useRef, useState } from 'react';
import { Loader2, Sparkles } from 'lucide-react';
import { useForm } from '@tanstack/react-form';
import { useMutation } from '@tanstack/react-query';
import { z } from 'zod';
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
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import { toErrors } from '@/lib/form-utils';

interface AddFeedDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	userId: string;
	categories: Array<{ id: string; name: string }>;
	onSuccess: () => void;
}

type Step = 'url' | 'preview';

const urlSchema = z.object({
	url: z.string().url('Please enter a valid URL'),
});

export function AddFeedDialog({
	open,
	onOpenChange,
	userId,
	categories,
	onSuccess,
}: AddFeedDialogProps) {
	const [step, setStep] = useState<Step>('url');
	const [preview, setPreview] = useState<FeedPreview | null>(null);
	const [selectedCategoryId, setSelectedCategoryId] = useState('__none__');
	const [suggestedCategory, setSuggestedCategory] = useState<string | null>(null);
	const [suggestionDismissed, setSuggestionDismissed] = useState(false);
	const suggestionRequestId = useRef(0);

	const checkFeedMutation = useMutation({
		mutationFn: (url: string) => validateFeedUrlFn({ data: { url } }),
		onSuccess: (result) => {
			setPreview(result);
			setStep('preview');
			if (categories.length > 0) {
				const requestId = ++suggestionRequestId.current;
				void suggestCategoryFn({
					data: {
						feedTitle: result.title,
						feedDescription: result.description ?? null,
						categoryNames: categories.map((c) => c.name),
					},
				})
					.then((suggestion) => {
						if (suggestion && requestId === suggestionRequestId.current) {
							setSuggestedCategory(suggestion);
						}
					})
					.catch(() => {
						// ignore suggestion errors
					});
			}
		},
	});

	const addFeedMutation = useMutation({
		mutationFn: (categoryId: string) => {
			if (!preview) throw new Error('No feed preview available');
			return addFeedFn({
				data: {
					userId,
					url: preview.finalUrl,
					categoryId: categoryId === '__none__' ? null : categoryId,
				},
			});
		},
		onSuccess: () => {
			handleOpenChange(false);
			setTimeout(() => onSuccess(), 0);
		},
	});

	function resetState() {
		suggestionRequestId.current++;
		setStep('url');
		setPreview(null);
		setSelectedCategoryId('__none__');
		setSuggestedCategory(null);
		setSuggestionDismissed(false);
		checkFeedMutation.reset();
		addFeedMutation.reset();
		urlForm.reset();
	}

	function handleOpenChange(nextOpen: boolean) {
		if (!nextOpen) resetState();
		onOpenChange(nextOpen);
	}

	const urlForm = useForm({
		defaultValues: { url: '' },
		validators: { onSubmit: urlSchema },
		onSubmit: async ({ value }) => {
			await checkFeedMutation.mutateAsync(value.url.trim());
		},
	});

	return (
		<Dialog open={open} onOpenChange={handleOpenChange}>
			<DialogContent className="sm:max-w-md">
				{step === 'url' ? (
					<>
						<DialogHeader>
							<DialogTitle>Add Feed</DialogTitle>
							<DialogDescription>Enter the URL of an RSS or Atom feed to add.</DialogDescription>
						</DialogHeader>

						<form
							onSubmit={(e) => {
								e.preventDefault();
								urlForm.handleSubmit();
							}}
							className="flex flex-col gap-3"
						>
							<urlForm.Field name="url">
								{(field) => {
									const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;
									return (
										<Field data-invalid={isInvalid}>
											<FieldLabel htmlFor={field.name}>Feed URL</FieldLabel>
											<Input
												id={field.name}
												name={field.name}
												type="url"
												placeholder="https://example.com/feed.xml"
												value={field.state.value}
												onBlur={field.handleBlur}
												onChange={(e) => field.handleChange(e.target.value)}
												aria-invalid={isInvalid}
											/>
											{isInvalid && <FieldError errors={toErrors(field.state.meta.errors)} />}
										</Field>
									);
								}}
							</urlForm.Field>

							{checkFeedMutation.error && (
								<p role="alert" className="text-destructive text-sm">
									{checkFeedMutation.error.message}
								</p>
							)}

							<DialogFooter>
								<urlForm.Subscribe selector={(s) => s.isSubmitting}>
									{(isSubmitting) => (
										<Button type="submit" disabled={isSubmitting}>
											{isSubmitting && <Loader2 size={14} className="animate-spin" aria-hidden />}
											{isSubmitting ? 'Checking…' : 'Check Feed'}
										</Button>
									)}
								</urlForm.Subscribe>
							</DialogFooter>
						</form>
					</>
				) : (
					<>
						<DialogHeader>
							<DialogTitle>Feed Preview</DialogTitle>
							<DialogDescription>Review the feed details before adding.</DialogDescription>
						</DialogHeader>

						{preview && (
							<div className="flex flex-col gap-4">
								<div className="bg-muted/50 flex items-start gap-3 rounded-md p-3">
									{preview.faviconUrl && (
										<img
											src={preview.faviconUrl}
											alt=""
											width={20}
											height={20}
											loading="lazy"
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

								{suggestedCategory && !suggestionDismissed && selectedCategoryId === '__none__' && (
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

								<div className="flex flex-col gap-1.5">
									<label htmlFor="feed-category" className="text-sm leading-none font-medium">
										Category
									</label>
									<Select value={selectedCategoryId} onValueChange={setSelectedCategoryId}>
										<SelectTrigger id="feed-category" className="w-full">
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

								{addFeedMutation.error && (
									<p role="alert" className="text-destructive text-sm">
										{addFeedMutation.error.message}
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
									checkFeedMutation.reset();
								}}
								disabled={addFeedMutation.isPending}
							>
								← Back
							</Button>
							<Button
								onClick={() => addFeedMutation.mutate(selectedCategoryId)}
								disabled={addFeedMutation.isPending}
							>
								{addFeedMutation.isPending && (
									<Loader2 size={14} className="animate-spin" aria-hidden />
								)}
								{addFeedMutation.isPending ? 'Adding…' : 'Add Feed'}
							</Button>
						</DialogFooter>
					</>
				)}
			</DialogContent>
		</Dialog>
	);
}
