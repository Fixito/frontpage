import { useEffect, useState } from 'react';
import { Loader2, Sparkles, X } from 'lucide-react';
import DOMPurify from 'isomorphic-dompurify';
import type { FeedItemRow } from './types';
import {
	Drawer,
	DrawerClose,
	DrawerContent,
	DrawerHeader,
	DrawerTitle,
} from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { generateSummaryFn } from '@/lib/ai-service';
import { formatAbsoluteDate } from '@/lib/time';

interface ReaderViewDrawerProps {
	item: FeedItemRow | null;
	open: boolean;
	onOpenChange: (v: boolean) => void;
	userId: string | null;
}

function sanitize(html: string): string {
	return DOMPurify.sanitize(html, { USE_PROFILES: { html: true } });
}

export function ReaderViewDrawer({ item, open, onOpenChange, userId }: ReaderViewDrawerProps) {
	const safeHtml = item?.contentHtml ? sanitize(item.contentHtml) : '';
	const [summary, setSummary] = useState<string | null>(item?.aiSummary ?? null);
	const [summarizing, setSummarizing] = useState(false);
	const [summaryError, setSummaryError] = useState<string | null>(null);

	useEffect(() => {
		setSummary(item?.aiSummary ?? null);
		setSummaryError(null);
	}, [item?.id, item?.aiSummary]);

	async function handleSummarize() {
		if (!item || !userId) return;
		setSummarizing(true);
		setSummaryError(null);
		try {
			const result = await generateSummaryFn({ data: { userId, itemId: item.id } });
			if (result.summary) {
				setSummary(result.summary);
			} else {
				const error = 'error' in result ? result.error : undefined;
				setSummaryError(error ?? 'Could not generate summary. Try again.');
			}
		} catch (err) {
			console.error('[AI] summarize error:', err);
			setSummaryError('Could not generate summary. Try again.');
		} finally {
			setSummarizing(false);
		}
	}

	return (
		<Drawer open={open} onOpenChange={onOpenChange} direction="right">
			<DrawerContent className="flex h-full w-full flex-col sm:max-w-2xl">
				<DrawerHeader className="flex shrink-0 items-start justify-between gap-4 border-b pb-4">
					<DrawerTitle className="line-clamp-2 text-base leading-snug">
						{item?.title ?? ''}
					</DrawerTitle>
					<DrawerClose asChild>
						<Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" aria-label="Close">
							<X size={16} aria-hidden />
						</Button>
					</DrawerClose>
				</DrawerHeader>

				<ScrollArea className="flex-1">
					<div className="p-4 select-text md:p-6">
						{item && (
							<>
								<div className="text-muted-foreground mb-5 flex flex-wrap gap-x-3 gap-y-1 text-sm">
									{item.author && <span>{item.author}</span>}
									{item.publishedAt && (
										<time dateTime={item.publishedAt.toISOString()}>
											{formatAbsoluteDate(item.publishedAt)}
										</time>
									)}
									<a
										href={item.url}
										target="_blank"
										rel="noopener noreferrer"
										className="hover:text-foreground ml-auto underline underline-offset-2 transition-colors"
									>
										Original article ↗
									</a>
								</div>

								{/* AI Summary section */}
								<div className="mb-5">
									{summary ? (
										<div className="bg-accent/40 border-border rounded-lg border p-3">
											<div className="mb-1.5 flex items-center gap-1.5">
												<Sparkles size={13} className="text-primary" aria-hidden />
												<span className="text-primary text-xs font-semibold">AI Summary</span>
											</div>
											<p className="text-muted-foreground text-sm leading-relaxed">{summary}</p>
										</div>
									) : (
										userId && (
											<button
												type="button"
												onClick={() => {
													void handleSummarize();
												}}
												disabled={summarizing}
												className="border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground flex items-center gap-1.5 rounded-md border border-dashed px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50"
											>
												{summarizing ? (
													<Loader2 size={12} className="animate-spin" aria-hidden />
												) : (
													<Sparkles size={12} aria-hidden />
												)}
												{summarizing ? 'Generating summary...' : 'Summarize with AI'}
											</button>
										)
									)}
									{summaryError && (
										<p className="text-destructive mt-1.5 text-xs">{summaryError}</p>
									)}
								</div>

								{safeHtml ? (
									<div
										className="prose prose-sm dark:prose-invert max-w-none"
										// eslint-disable-next-line react/no-danger
										dangerouslySetInnerHTML={{ __html: safeHtml }}
									/>
								) : (
									<p className="text-muted-foreground text-sm">No content available.</p>
								)}
							</>
						)}
					</div>
				</ScrollArea>
			</DrawerContent>
		</Drawer>
	);
}
