import { useState } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { refreshFeedFn } from '@/lib/feed-service';

interface FeedErrorBannerProps {
	feedId: string;
	errorMessage: string;
	onRetry: () => void;
}

export function FeedErrorBanner({ feedId, errorMessage, onRetry }: FeedErrorBannerProps) {
	const [retrying, setRetrying] = useState(false);

	async function handleRetry() {
		setRetrying(true);
		try {
			await refreshFeedFn({ data: { feedId } });
			onRetry();
		} catch (err) {
			console.error('Feed refresh failed', err);
		} finally {
			setRetrying(false);
		}
	}

	return (
		<div
			role="alert"
			className="bg-destructive/10 border-destructive/30 text-destructive flex items-start gap-3 rounded-lg border px-4 py-3 text-sm"
		>
			<AlertTriangle size={16} className="mt-0.5 shrink-0" aria-hidden />
			<div className="flex-1">
				<p className="font-medium">Failed to fetch feed</p>
				<p className="text-destructive/80 mt-0.5">{errorMessage}</p>
			</div>
			<Button
				variant="outline"
				size="sm"
				className="shrink-0"
				disabled={retrying}
				onClick={() => {
					void handleRetry();
				}}
			>
				<RefreshCw size={13} className={retrying ? 'animate-spin' : ''} aria-hidden />
				{retrying ? 'Retrying…' : 'Retry'}
			</Button>
		</div>
	);
}
