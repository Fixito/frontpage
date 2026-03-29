import { useState } from 'react';
import { BookmarkCheck, Globe, Rss } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface EmptyStateProps {
	view: string;
	isGuest?: boolean;
	feedId?: string;
	categoryId?: string;
}

const STARTER_FEEDS = [
	{ name: 'CSS-Tricks', url: 'https://css-tricks.com/feed/' },
	{ name: 'web.dev', url: 'https://web.dev/feed.xml' },
	{ name: 'The GitHub Blog', url: 'https://github.blog/feed/' },
	{ name: "Simon Willison's Weblog", url: 'https://simonwillison.net/atom/everything/' },
];

function StarterPackRow({ name, url }: { name: string; url: string }) {
	const [copied, setCopied] = useState(false);

	function handleCopy() {
		void navigator.clipboard.writeText(url).then(() => {
			setCopied(true);
			setTimeout(() => setCopied(false), 2000);
		});
	}

	return (
		<div className="flex items-center justify-between gap-3 rounded-md border px-3 py-2">
			<div className="min-w-0">
				<p className="truncate text-sm font-medium">{name}</p>
				<p className="text-muted-foreground truncate text-xs">{url}</p>
			</div>
			<Button variant="outline" size="sm" className="shrink-0 text-xs" onClick={handleCopy}>
				{copied ? 'Copied!' : 'Copy URL'}
			</Button>
		</div>
	);
}

export function EmptyState({ view, isGuest, feedId, categoryId }: EmptyStateProps) {
	if (view === 'bookmarks') {
		return (
			<div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
				<BookmarkCheck size={36} className="text-muted-foreground/40" aria-hidden />
				<p className="font-medium">No bookmarks yet</p>
				<p className="text-muted-foreground max-w-xs text-sm">
					Bookmark articles to save them for later.
				</p>
			</div>
		);
	}

	if (isGuest) {
		return (
			<div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
				<Rss size={36} className="text-muted-foreground/40" aria-hidden />
				<p className="font-medium">Demo feed loading…</p>
				<p className="text-muted-foreground max-w-xs text-sm">
					The demo feed is loading or unavailable — try refreshing.
				</p>
			</div>
		);
	}

	// Filtered view with no results (specific feed or category)
	if (feedId ?? categoryId) {
		return (
			<div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
				<Globe size={36} className="text-muted-foreground/40" aria-hidden />
				<p className="font-medium">No articles yet</p>
				<p className="text-muted-foreground max-w-xs text-sm">
					{feedId ? 'No articles in this feed yet.' : 'No articles in this category yet.'}
				</p>
			</div>
		);
	}

	// Authenticated user with no feeds — onboarding panel
	return (
		<div className="flex h-full flex-col items-center justify-center p-8">
			<div className="w-full max-w-md space-y-6 text-center">
				<div className="space-y-2">
					<Rss size={40} className="text-muted-foreground/40 mx-auto" aria-hidden />
					<h2 className="text-xl font-semibold">Welcome to Frontpage!</h2>
					<p className="text-muted-foreground text-sm">
						Add your first feed to start reading. Use the{' '}
						<strong className="text-foreground">Add feed</strong> button in the sidebar to subscribe
						to any RSS or Atom feed.
					</p>
				</div>

				<div className="space-y-3 text-left">
					<p className="text-muted-foreground text-center text-xs font-medium tracking-wide uppercase">
						Not sure where to start? Try these popular feeds:
					</p>
					<div className="space-y-2">
						{STARTER_FEEDS.map((f) => (
							<StarterPackRow key={f.url} name={f.name} url={f.url} />
						))}
					</div>
					<p className="text-muted-foreground text-center text-xs">
						Copy a URL, then paste it into the Add feed dialog.
					</p>
				</div>
			</div>
		</div>
	);
}
