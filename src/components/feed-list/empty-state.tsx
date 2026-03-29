import { Bookmark, Globe, Rss } from 'lucide-react';

interface EmptyStateProps {
	view: string;
	isGuest?: boolean;
}

export function EmptyState({ view, isGuest }: EmptyStateProps) {
	if (view === 'bookmarks') {
		return (
			<div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
				<Bookmark size={36} className="text-muted-foreground/40" aria-hidden />
				<p className="font-medium">No bookmarks yet</p>
				<p className="text-muted-foreground max-w-xs text-sm">
					Hover over any article and click the bookmark icon to save it here.
				</p>
			</div>
		);
	}

	if (isGuest) {
		return (
			<div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
				<Rss size={36} className="text-muted-foreground/40" aria-hidden />
				<p className="font-medium">Add your first feed</p>
				<p className="text-muted-foreground max-w-xs text-sm">
					Click <strong>Add feed</strong> in the sidebar to subscribe to any RSS or Atom feed.
				</p>
			</div>
		);
	}

	return (
		<div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
			<Globe size={36} className="text-muted-foreground/40" aria-hidden />
			<p className="font-medium">No items to show</p>
			<p className="text-muted-foreground max-w-xs text-sm">
				{view === 'all'
					? 'Add feeds to see articles here, or try refreshing.'
					: 'No articles in this feed yet.'}
			</p>
		</div>
	);
}
