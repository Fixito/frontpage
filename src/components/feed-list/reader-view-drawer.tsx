import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Loader2, Sparkles, X } from 'lucide-react';
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
import { generateSummaryFn } from '@/lib/ai-service';
import { formatAbsoluteDate } from '@/lib/time';

interface ReaderViewDrawerProps {
	item: FeedItemRow | null;
	open: boolean;
	onOpenChange: (v: boolean) => void;
	userId: string | null;
	hasPrev?: boolean;
	hasNext?: boolean;
	onPrev?: () => void;
	onNext?: () => void;
}

function sanitize(html: string): string {
	return DOMPurify.sanitize(html, { USE_PROFILES: { html: true } });
}

interface ParsedSummary {
	mainPoint: string;
	keyPoints: Array<string>;
}

function parseSummary(text: string): ParsedSummary {
	const lines = text
		.split('\n')
		.map((l) => l.trim())
		.filter(Boolean);
	const keyPoints = lines.filter((l) => /^[•\-*]/.test(l)).map((l) => l.replace(/^[•\-*]\s*/, ''));
	const mainPoint = lines.filter((l) => !/^[•\-*]/.test(l)).join(' ');
	return { mainPoint, keyPoints };
}

export function ReaderViewDrawer({
	item,
	open,
	onOpenChange,
	userId,
	hasPrev,
	hasNext,
	onPrev,
	onNext,
}: ReaderViewDrawerProps) {
	const safeHtml = item?.contentHtml ? sanitize(item.contentHtml) : '';
	const [prevItemId, setPrevItemId] = useState(item?.id);
	const [generatedSummary, setGeneratedSummary] = useState<string | null>(null);
	const [summarizing, setSummarizing] = useState(false);
	const [summaryError, setSummaryError] = useState<string | null>(null);
	const [retryIn, setRetryIn] = useState(0);

	// Reset generated summary and errors during render when the item changes
	if (prevItemId !== item?.id) {
		setPrevItemId(item?.id);
		setGeneratedSummary(null);
		setSummaryError(null);
		setRetryIn(0);
	}

	// Compute summary: prefer user-triggered generated summary, fall back to stored AI summary
	const summary = generatedSummary ?? item?.aiSummary ?? null;

	// Countdown timer for rate-limited retry
	useEffect(() => {
		if (retryIn <= 0) return;
		const t = setTimeout(() => setRetryIn((s) => s - 1), 1000);
		return () => clearTimeout(t);
	}, [retryIn]);

	async function handleSummarize() {
		if (!item || !userId || retryIn > 0) return;
		setSummarizing(true);
		setSummaryError(null);
		try {
			const result = await generateSummaryFn({ data: { userId, itemId: item.id } });
			if (result.summary) {
				setGeneratedSummary(result.summary);
			} else {
				const error = 'error' in result ? result.error : undefined;
				setSummaryError(error ?? 'Could not generate summary. Try again.');
				if ('retryIn' in result && result.retryIn) setRetryIn(result.retryIn);
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
			<DrawerContent className="flex h-full w-full flex-col sm:max-w-3xl">
				<DrawerHeader className="flex shrink-0 items-start justify-between gap-4 border-b pb-4">
					<DrawerTitle className="line-clamp-2 text-base leading-snug">
						{item?.title ?? ''}
					</DrawerTitle>
					<div className="flex items-center gap-1">
						<Button
							variant="ghost"
							size="icon"
							className="h-8 w-8"
							onClick={onPrev}
							disabled={!hasPrev}
							aria-label="Previous article"
						>
							<ChevronLeft size={16} aria-hidden />
						</Button>
						<Button
							variant="ghost"
							size="icon"
							className="h-8 w-8"
							onClick={onNext}
							disabled={!hasNext}
							aria-label="Next article"
						>
							<ChevronRight size={16} aria-hidden />
						</Button>
					</div>
					<DrawerClose asChild>
						<Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" aria-label="Close">
							<X size={16} aria-hidden />
						</Button>
					</DrawerClose>
				</DrawerHeader>

				<div className="min-h-0 flex-1 overflow-y-auto">
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
											{(() => {
												const { mainPoint, keyPoints } = parseSummary(summary);
												return (
													<>
														{mainPoint && (
															<p className="text-foreground text-sm leading-relaxed">{mainPoint}</p>
														)}
														{keyPoints.length > 0 && (
															<ul className="mt-2 space-y-1">
																{keyPoints.map((point, i) => (
																	<li
																		key={i}
																		className="text-foreground flex gap-2 text-sm leading-relaxed"
																	>
																		<span className="text-primary mt-0.5 shrink-0" aria-hidden>
																			•
																		</span>
																		{point}
																	</li>
																))}
															</ul>
														)}
													</>
												);
											})()}
										</div>
									) : (
										userId && (
											<button
												type="button"
												onClick={() => {
													void handleSummarize();
												}}
												disabled={summarizing || retryIn > 0}
												className="border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground flex items-center gap-1.5 rounded-md border border-dashed px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50"
											>
												{summarizing ? (
													<Loader2 size={12} className="animate-spin" aria-hidden />
												) : (
													<Sparkles size={12} aria-hidden />
												)}
												{summarizing
													? 'Generating summary...'
													: retryIn > 0
														? `Retry in ${retryIn}s`
														: 'Summarize with AI'}
											</button>
										)
									)}
									{summaryError && (
										<p className="text-muted-foreground mt-1.5 text-xs">{summaryError}</p>
									)}
								</div>

								{safeHtml ? (
									<div
										className="prose prose-sm max-w-none"
										// eslint-disable-next-line react/no-danger
										dangerouslySetInnerHTML={{ __html: safeHtml }}
									/>
								) : (
									<p className="text-muted-foreground text-sm">No content available.</p>
								)}
							</>
						)}
					</div>
				</div>
			</DrawerContent>
		</Drawer>
	);
}
