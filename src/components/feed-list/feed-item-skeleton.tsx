import { Skeleton } from '@/components/ui/skeleton';

export function FeedItemSkeleton() {
	return (
		<div className="space-y-1 py-2">
			{Array.from({ length: 5 }).map((_, i) => (
				<div key={i} className="flex items-start gap-3 px-4 py-3">
					<Skeleton className="mt-0.5 h-4 w-4 shrink-0 rounded-full" />
					<div className="min-w-0 flex-1 space-y-2">
						<Skeleton className="h-4 w-3/4" />
						<Skeleton className="h-3 w-full" />
						<Skeleton className="h-3 w-1/2" />
					</div>
					<Skeleton className="h-3 w-12 shrink-0" />
				</div>
			))}
		</div>
	);
}
