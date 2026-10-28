import { queryOptions, useQuery } from '@tanstack/react-query';
import { Loader2, RefreshCw, Sparkles } from 'lucide-react';
import { getWeeklyDigestFn } from '@/lib/ai-service';
import { formatRelativeTime } from '@/lib/time';
import { stripHtml } from '@/lib/utils';

const weeklyDigestQueryOptions = (userId: string | null) =>
	queryOptions({
		queryKey: ['weekly-digest', userId],
		queryFn: () => getWeeklyDigestFn(),
		enabled: userId !== null,
		// Each run is a Gemini call: reopening the digest reuses it for a while,
		// and a failure is shown at once instead of being retried.
		staleTime: 10 * 60 * 1000,
		retry: false,
		refetchOnWindowFocus: false,
	});

interface DigestViewProps {
	userId: string | null;
}

export function DigestView({ userId }: DigestViewProps) {
	const { data, isPending, isFetching, isError, refetch } = useQuery(
		weeklyDigestQueryOptions(userId),
	);

	if (!userId) {
		return (
			<div className="flex flex-1 items-center justify-center p-8">
				<p className="text-muted-foreground text-sm">Sign in to view your weekly digest.</p>
			</div>
		);
	}

	// A retry after an error keeps the error status until it settles: show the spinner meanwhile.
	if (isPending || (isError && isFetching)) {
		return (
			<div className="flex flex-1 items-center justify-center gap-2 p-8">
				<Loader2 size={16} className="animate-spin" aria-hidden />
				<span className="text-muted-foreground text-sm">Generating your weekly digest…</span>
			</div>
		);
	}

	if (isError) {
		return (
			<div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
				<p className="text-destructive text-sm">Failed to generate digest. Please try again.</p>
				<button
					type="button"
					onClick={() => {
						void refetch();
					}}
					className="text-muted-foreground hover:text-foreground flex items-center gap-1.5 text-sm transition-colors"
				>
					<RefreshCw size={14} aria-hidden />
					Try again
				</button>
			</div>
		);
	}

	const { briefing, items } = data;

	if (items.length === 0) {
		return (
			<div className="flex flex-1 items-center justify-center p-8">
				<p className="text-muted-foreground text-sm">No unread articles from the past 7 days.</p>
			</div>
		);
	}

	return (
		<div className="flex-1 overflow-y-auto">
			<div className="mx-auto max-w-2xl p-6">
				<div className="mb-6">
					<div className="mb-3 flex items-center gap-2">
						<Sparkles size={16} className="text-primary" aria-hidden />
						<h2 className="text-base font-semibold">Weekly Digest</h2>
						<span className="text-muted-foreground ml-auto text-xs">Last 7 days</span>
					</div>
					{briefing ? (
						<div className="bg-accent/30 rounded-xl border p-4">
							<p className="text-sm leading-relaxed">{briefing}</p>
						</div>
					) : (
						<div className="text-muted-foreground bg-muted/40 rounded-xl border border-dashed p-4 text-sm">
							AI briefing unavailable — showing your unread articles below.
						</div>
					)}
				</div>

				<div className="space-y-3">
					{items.map((item) => (
						<article key={item.id} className="group flex gap-3 border-b py-3 last:border-0">
							<div className="min-w-0 flex-1">
								<p className="text-muted-foreground mb-0.5 text-xs">
									{item.feedTitle} · {formatRelativeTime(item.publishedAt)}
								</p>
								<a
									href={item.url}
									target="_blank"
									rel="noopener noreferrer"
									className="hover:text-primary text-sm font-semibold transition-colors"
								>
									{item.title}
								</a>
								{item.aiSummary ? (
									<p className="text-muted-foreground mt-1 line-clamp-2 text-xs leading-relaxed italic">
										{item.aiSummary}
									</p>
								) : (
									item.description && (
										<p className="text-muted-foreground mt-1 line-clamp-2 text-xs leading-relaxed">
											{stripHtml(item.description)}
										</p>
									)
								)}
							</div>
						</article>
					))}
				</div>
			</div>
		</div>
	);
}
