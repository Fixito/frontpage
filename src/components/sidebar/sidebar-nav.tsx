import { Link } from '@tanstack/react-router';
import { useState } from 'react';
import { BookmarkIcon, ChevronDown, ChevronRight, Folder, Plus, Rss, Sparkles } from 'lucide-react';
import {
	DndContext,
	DragOverlay,
	KeyboardSensor,
	PointerSensor,
	useDraggable,
	useDroppable,
	useSensor,
	useSensors,
} from '@dnd-kit/core';
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core';

import type { CategoryNavItem, FeedNavItem, SidebarData } from './types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

import { cn } from '@/lib/utils';

interface SidebarNavProps {
	data: SidebarData;
	activeView?: 'all' | 'bookmarks' | 'digest';
	activeCategoryId?: string;
	activeFeedId?: string;
	onNavigate?: () => void;
	onAddFeed?: () => void;
	onMoveFeed?: (feedId: string, categoryId: string | null) => void;
}

function UnreadBadge({ count }: { count: number }) {
	if (count === 0) return null;

	return (
		<Badge
			variant="secondary"
			className="ml-auto h-4 min-w-4 shrink-0 justify-center px-1 text-[10px]"
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

function DraggableFeedItem({
	feed,
	isActive,
	onNavigate,
}: {
	feed: FeedNavItem;
	isActive: boolean;
	onNavigate?: () => void;
}) {
	const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
		id: feed.id,
		data: { feed },
	});

	return (
		<div
			ref={setNodeRef}
			{...listeners}
			{...attributes}
			className={cn('cursor-grab touch-none active:cursor-grabbing', isDragging && 'opacity-40')}
		>
			<FeedItem feed={feed} isActive={isActive} onNavigate={onNavigate} />
		</div>
	);
}

function FeedDragOverlay({ feed }: { feed: FeedNavItem }) {
	return (
		<div className="bg-background border-border flex cursor-grabbing items-center gap-1.5 rounded-md border px-2 py-1 text-xs shadow-lg">
			<FavIcon url={feed.faviconUrl} />
			<span className="max-w-40 truncate">{feed.title}</span>
		</div>
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
	const { setNodeRef, isOver } = useDroppable({ id: category.id });

	return (
		<div
			ref={setNodeRef}
			className={cn('rounded-md transition-colors', isOver && 'ring-accent/50 ring-2')}
		>
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
						isOver && !isActive && 'bg-accent/20',
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
						<DraggableFeedItem
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

function UncategorizedSection({
	feeds,
	activeFeedId,
	onNavigate,
}: {
	feeds: Array<FeedNavItem>;
	activeFeedId?: string;
	onNavigate?: () => void;
}) {
	const { setNodeRef, isOver } = useDroppable({ id: '__uncategorized__' });

	return (
		<div
			ref={setNodeRef}
			className={cn('mt-1 rounded-md transition-colors', isOver && 'ring-accent/50 ring-2')}
		>
			{(feeds.length > 0 || isOver) && (
				<p
					className={cn(
						'text-muted-foreground px-2 pb-1 text-xs font-medium',
						isOver && 'text-foreground',
					)}
				>
					Uncategorized
				</p>
			)}
			<div className="space-y-0.5">
				{feeds.map((feed) => (
					<DraggableFeedItem
						key={feed.id}
						feed={feed}
						isActive={activeFeedId === feed.id}
						onNavigate={onNavigate}
					/>
				))}
			</div>
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
	onMoveFeed,
}: SidebarNavProps) {
	const isAllActive = activeView === 'all' && !activeCategoryId && !activeFeedId;
	const isBookmarksActive = activeView === 'bookmarks';
	const isDigestActive = activeView === 'digest';

	const [activeDrag, setActiveDrag] = useState<FeedNavItem | null>(null);

	const sensors = useSensors(
		useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
		useSensor(KeyboardSensor),
	);

	function handleDragStart(event: DragStartEvent) {
		const feed = event.active.data.current?.['feed'] as FeedNavItem | undefined;
		setActiveDrag(feed ?? null);
	}

	function handleDragEnd(event: DragEndEvent) {
		setActiveDrag(null);
		const { active, over } = event;
		if (!over || !onMoveFeed) return;

		const feedId = String(active.id);
		const targetCategoryId = over.id === '__uncategorized__' ? null : String(over.id);

		if (targetCategoryId === null && data.uncategorized.some((f) => f.id === feedId)) return;
		if (
			targetCategoryId !== null &&
			data.categories.find((c) => c.id === targetCategoryId)?.feeds.some((f) => f.id === feedId)
		)
			return;

		onMoveFeed(feedId, targetCategoryId);
	}

	const hasCategoriesOrFeeds = data.categories.length > 0 || data.uncategorized.length > 0;

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

			{hasCategoriesOrFeeds && (
				<div className="mt-3">
					<p className="text-muted-foreground px-2 pb-1.5 text-xs font-semibold tracking-wider uppercase">
						Feeds
					</p>
					{data.categories.length > 0 ? (
						<DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
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
								<UncategorizedSection
									feeds={data.uncategorized}
									activeFeedId={activeFeedId}
									onNavigate={onNavigate}
								/>
							</div>
							<DragOverlay>{activeDrag && <FeedDragOverlay feed={activeDrag} />}</DragOverlay>
						</DndContext>
					) : (
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
					)}
				</div>
			)}
		</div>
	);
}
