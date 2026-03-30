import { useState } from 'react';
import { BookmarkIcon, ChevronDown, ChevronRight, Folder, Plus, Rss, Sparkles } from 'lucide-react';
import { Link } from '@tanstack/react-router';
import type { CategoryNavItem, FeedNavItem, SidebarData } from './types';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface SidebarNavProps {
	data: SidebarData;
	activeView?: 'all' | 'bookmarks' | 'digest';
	activeCategoryId?: string;
	activeFeedId?: string;
	onNavigate?: () => void;
	onAddFeed?: () => void;
}

function UnreadBadge({ count }: { count: number }) {
	if (count === 0) return null;
	return (
		<Badge
			variant="secondary"
			className="ml-auto h-4 min-w-4 shrink-0 px-1 text-[10px] tabular-nums"
		>
			{count > 99 ? '99+' : count}
		</Badge>
	);
}

function HealthDot({ status }: { status: 'active' | 'stale' | 'error' }) {
	if (status === 'active') return null;
	return (
		<span
			role="img"
			aria-label={status === 'error' ? 'Feed error' : 'Feed stale'}
			className={cn(
				'inline-block h-1.5 w-1.5 shrink-0 rounded-full',
				status === 'error' ? 'bg-destructive' : 'bg-yellow-500',
			)}
		/>
	);
}

function FavIcon({ url }: { url: string | null }) {
	const [failed, setFailed] = useState(false);
	if (!url || failed) {
		return <Rss size={12} className="text-muted-foreground shrink-0" aria-hidden />;
	}
	return (
		<img
			src={url}
			alt=""
			width={12}
			height={12}
			loading="lazy"
			className="shrink-0 rounded-sm"
			onError={() => setFailed(true)}
			aria-hidden
		/>
	);
}

function FeedItem({
	feed,
	isActive,
	onNavigate,
}: {
	feed: FeedNavItem;
	isActive: boolean;
	onNavigate?: () => void;
}) {
	return (
		<Link
			to="/dashboard"
			search={{ feedId: feed.id, view: 'all' }}
			onClick={onNavigate}
			aria-current={isActive ? 'page' : undefined}
			className={cn(
				'flex w-full items-center gap-1.5 rounded-md px-2 py-1 text-xs transition-colors',
				isActive
					? 'bg-accent text-accent-foreground font-medium'
					: 'text-muted-foreground hover:bg-muted hover:text-foreground',
			)}
		>
			<FavIcon url={feed.faviconUrl} />
			<span className="min-w-0 flex-1 truncate">{feed.title}</span>
			<HealthDot status={feed.healthStatus} />
			<UnreadBadge count={feed.unreadCount} />
		</Link>
	);
}

function CategorySection({
	category,
	activeCategoryId,
	activeFeedId,
	onNavigate,
}: {
	category: CategoryNavItem;
	activeCategoryId?: string;
	activeFeedId?: string;
	onNavigate?: () => void;
}) {
	const isActive = activeCategoryId === category.id;
	const [expanded, setExpanded] = useState(true);

	return (
		<div>
			<div className="flex items-center gap-0.5">
				<Link
					to="/dashboard"
					search={{ categoryId: category.id, view: 'all' }}
					onClick={onNavigate}
					aria-current={isActive ? 'page' : undefined}
					className={cn(
						'flex min-w-0 flex-1 items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors',
						isActive
							? 'bg-accent text-accent-foreground font-medium'
							: 'text-foreground hover:bg-muted',
					)}
				>
					<Folder size={14} className="text-muted-foreground shrink-0" aria-hidden />
					<span className="min-w-0 flex-1 truncate">{category.name}</span>
					<UnreadBadge count={category.unreadCount} />
				</Link>
				<button
					type="button"
					onClick={() => setExpanded((v) => !v)}
					aria-expanded={expanded}
					aria-label={expanded ? `Collapse ${category.name}` : `Expand ${category.name}`}
					className="text-muted-foreground hover:bg-muted hover:text-foreground flex h-6 w-6 shrink-0 items-center justify-center rounded-md transition-colors"
				>
					{expanded ? (
						<ChevronDown size={12} aria-hidden />
					) : (
						<ChevronRight size={12} aria-hidden />
					)}
				</button>
			</div>
			{expanded && category.feeds.length > 0 && (
				<div className="border-border/50 mt-0.5 ml-4 space-y-0.5 border-l pl-2">
					{category.feeds.map((feed) => (
						<FeedItem
							key={feed.id}
							feed={feed}
							isActive={activeFeedId === feed.id}
							onNavigate={onNavigate}
						/>
					))}
				</div>
			)}
		</div>
	);
}

export function SidebarNav({
	data,
	activeView = 'all',
	activeCategoryId,
	activeFeedId,
	onNavigate,
	onAddFeed,
}: SidebarNavProps) {
	const isAllActive = activeView === 'all' && !activeCategoryId && !activeFeedId;
	const isBookmarksActive = activeView === 'bookmarks';
	const isDigestActive = activeView === 'digest';

	return (
		<div className="flex flex-col gap-0.5">
			<div className="pb-2">
				<Button size="sm" className="w-full justify-start gap-2" onClick={onAddFeed}>
					<Plus size={14} aria-hidden />
					Add Feed
				</Button>
			</div>

			<Link
				to="/dashboard"
				search={{ view: 'all' }}
				onClick={onNavigate}
				aria-current={isAllActive ? 'page' : undefined}
				className={cn(
					'flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors',
					isAllActive
						? 'bg-accent text-accent-foreground font-medium'
						: 'text-foreground hover:bg-muted',
				)}
			>
				<Rss size={14} className="shrink-0" aria-hidden />
				<span className="flex-1">All Items</span>
				<UnreadBadge count={data.totalUnread} />
			</Link>

			<Link
				to="/dashboard"
				search={{ view: 'bookmarks' }}
				onClick={onNavigate}
				aria-current={isBookmarksActive ? 'page' : undefined}
				className={cn(
					'flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors',
					isBookmarksActive
						? 'bg-accent text-accent-foreground font-medium'
						: 'text-foreground hover:bg-muted',
				)}
			>
				<BookmarkIcon size={14} className="shrink-0" aria-hidden />
				<span className="flex-1">Bookmarks</span>
				<UnreadBadge count={data.bookmarkCount} />
			</Link>

			<Link
				to="/dashboard"
				search={{ view: 'digest' }}
				onClick={onNavigate}
				aria-current={isDigestActive ? 'page' : undefined}
				className={cn(
					'flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors',
					isDigestActive
						? 'bg-accent text-accent-foreground font-medium'
						: 'text-foreground hover:bg-muted',
				)}
			>
				<Sparkles size={14} className="shrink-0" aria-hidden />
				<span className="flex-1">Weekly Digest</span>
			</Link>

			{(data.categories.length > 0 || data.uncategorized.length > 0) && (
				<div className="mt-3">
					<p className="text-muted-foreground px-2 pb-1.5 text-xs font-semibold tracking-wider uppercase">
						Feeds
					</p>
					<div className="space-y-0.5">
						{data.categories.map((cat) => (
							<CategorySection
								key={cat.id}
								category={cat}
								activeCategoryId={activeCategoryId}
								activeFeedId={activeFeedId}
								onNavigate={onNavigate}
							/>
						))}
						{data.uncategorized.length > 0 && (
							<div className="mt-1">
								<p className="text-muted-foreground px-2 pb-1 text-xs font-medium">Uncategorized</p>
								<div className="space-y-0.5">
									{data.uncategorized.map((feed) => (
										<FeedItem
											key={feed.id}
											feed={feed}
											isActive={activeFeedId === feed.id}
											onNavigate={onNavigate}
										/>
									))}
								</div>
							</div>
						)}
					</div>
				</div>
			)}
		</div>
	);
}
