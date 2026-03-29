import { useState } from 'react';
import { ItemActions } from './item-actions';
import { ReaderViewDrawer } from './reader-view-drawer';
import type { FeedItemRow } from './types';
import { formatAbsoluteDate, formatRelativeTime } from '@/lib/time';
import { cn, stripHtml } from '@/lib/utils';

// ── Avatar ───────────────────────────────────────────────────────────────────

const AVATAR_COLORS = [
	'bg-blue-500',
	'bg-orange-500',
	'bg-green-600',
	'bg-violet-500',
	'bg-rose-500',
	'bg-teal-500',
	'bg-amber-500',
	'bg-indigo-500',
] as const;

function hashColor(str: string): string {
	let hash = 0;
	for (let i = 0; i < str.length; i++) {
		hash = (hash * 31 + str.charCodeAt(i)) | 0;
	}
	return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length] ?? 'bg-blue-500';
}

function FeedAvatar({ feedId, feedTitle }: { feedId: string; feedTitle: string }) {
	return (
		<div
			className={cn(
				'flex h-6 w-6 shrink-0 items-center justify-center rounded text-[11px] font-bold text-white',
				hashColor(feedId),
			)}
			aria-hidden
		>
			{feedTitle.charAt(0).toUpperCase()}
		</div>
	);
}

// ── Category badge ───────────────────────────────────────────────────────────

function CategoryBadge({ name, color }: { name: string; color?: string | null }) {
	const style = color
		? { backgroundColor: `${color}22`, color, border: `1px solid ${color}44` }
		: undefined;

	return (
		<span
			className={cn(
				'inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium',
				!color && 'bg-muted text-muted-foreground border-border border',
			)}
			style={style}
		>
			{name}
		</span>
	);
}

// ── Card ─────────────────────────────────────────────────────────────────────

interface FeedItemListProps {
	items: Array<FeedItemRow>;
	layout: 'list' | 'compact' | 'cards';
	onMarkRead: (itemId: string) => void;
	onMarkBookmark: (itemId: string) => void;
}

interface FeedItemCardProps {
	item: FeedItemRow;
	layout: 'list' | 'compact' | 'cards';
	onMarkRead: (itemId: string) => void;
	onMarkBookmark: (itemId: string) => void;
	onOpenReader: (item: FeedItemRow) => void;
}

function FeedItemCard({
	item,
	layout,
	onMarkRead,
	onMarkBookmark,
	onOpenReader,
}: FeedItemCardProps) {
	const isCompact = layout === 'compact';
	const isCards = layout === 'cards';

	function handleClick() {
		onMarkRead(item.id);
	}

	const readerButton = item.contentHtml ? (
		<button
			type="button"
			onClick={() => onOpenReader(item)}
			className="text-muted-foreground hover:text-foreground hover:bg-accent rounded px-1.5 py-0.5 text-xs transition-colors"
		>
			Reader
		</button>
	) : null;

	// ── Cards layout ──────────────────────────────────────────────────────────
	if (isCards) {
		return (
			<article
				className={cn(
					'group hover:bg-accent/30 flex flex-col rounded-lg border p-4 transition-colors',
					item.isRead && 'opacity-60',
				)}
			>
				{/* Header */}
				<div className="mb-2 flex items-center gap-2">
					<FeedAvatar feedId={item.feedId} feedTitle={item.feedTitle} />
					<p className="text-muted-foreground flex min-w-0 flex-1 items-center gap-1 text-xs">
						<span className="text-foreground/70 truncate font-medium">{item.feedTitle}</span>
						<span>·</span>
						<time
							title={formatAbsoluteDate(item.publishedAt)}
							dateTime={item.publishedAt?.toISOString()}
						>
							{formatRelativeTime(item.publishedAt ?? item.fetchedAt)}
						</time>
					</p>
					{!item.isRead && (
						<span className="h-2 w-2 shrink-0 rounded-full bg-blue-500" aria-label="Unread" />
					)}
				</div>

				{/* Title */}
				<a
					href={item.url}
					target="_blank"
					rel="noopener noreferrer"
					onClick={handleClick}
					className="hover:text-primary text-sm leading-snug font-semibold transition-colors"
				>
					{item.title}
				</a>

				{/* Description */}
				{item.description && (
					<p className="text-muted-foreground mt-1.5 line-clamp-3 flex-1 text-sm leading-relaxed">
						{stripHtml(item.description)}
					</p>
				)}

				{/* Footer */}
				<div className="mt-3 flex items-center gap-2">
					{item.categoryName && (
						<CategoryBadge name={item.categoryName} color={item.categoryColor} />
					)}
					<div className="invisible ml-auto flex group-hover:visible">
						<ItemActions
							item={item}
							onReadToggle={() => onMarkRead(item.id)}
							onBookmarkToggle={() => onMarkBookmark(item.id)}
						/>
						{readerButton}
					</div>
				</div>
			</article>
		);
	}

	// ── Compact layout ────────────────────────────────────────────────────────
	if (isCompact) {
		return (
			<article
				className={cn(
					'group hover:bg-accent/30 flex items-center gap-2 px-4 py-2 transition-colors',
					item.isRead && 'opacity-60',
				)}
			>
				{/* Unread dot */}
				<div className="flex w-3 shrink-0 justify-center">
					{!item.isRead && (
						<span className="h-1.5 w-1.5 rounded-full bg-blue-500" aria-label="Unread" />
					)}
				</div>

				<FeedAvatar feedId={item.feedId} feedTitle={item.feedTitle} />

				<span className="text-muted-foreground w-28 shrink-0 truncate text-xs">
					{item.feedTitle}
				</span>

				<a
					href={item.url}
					target="_blank"
					rel="noopener noreferrer"
					onClick={handleClick}
					className="hover:text-primary min-w-0 flex-1 truncate text-sm font-medium transition-colors"
				>
					{item.title}
				</a>

				<time
					className="text-muted-foreground shrink-0 text-xs"
					title={formatAbsoluteDate(item.publishedAt)}
					dateTime={item.publishedAt?.toISOString()}
				>
					{formatRelativeTime(item.publishedAt ?? item.fetchedAt)}
				</time>

				<div className="invisible flex shrink-0 group-hover:visible">
					<ItemActions
						item={item}
						onReadToggle={() => onMarkRead(item.id)}
						onBookmarkToggle={() => onMarkBookmark(item.id)}
					/>
					{readerButton}
				</div>
			</article>
		);
	}

	// ── List layout (default) ─────────────────────────────────────────────────
	return (
		<article
			className={cn(
				'group hover:bg-accent/30 flex gap-3 px-4 py-3 transition-colors',
				item.isRead && 'opacity-60',
			)}
		>
			{/* Unread indicator column */}
			<div className="flex w-3 shrink-0 items-start justify-center pt-2">
				{!item.isRead && <span className="h-2 w-2 rounded-full bg-blue-500" aria-label="Unread" />}
			</div>

			{/* Avatar */}
			<div className="shrink-0 pt-0.5">
				<FeedAvatar feedId={item.feedId} feedTitle={item.feedTitle} />
			</div>

			{/* Content */}
			<div className="min-w-0 flex-1">
				{/* Source + time */}
				<p className="text-muted-foreground mb-0.5 flex items-center gap-1 text-xs">
					<span className="text-foreground/70 max-w-[10rem] truncate font-medium">
						{item.feedTitle}
					</span>
					<span aria-hidden>·</span>
					<time
						title={formatAbsoluteDate(item.publishedAt)}
						dateTime={item.publishedAt?.toISOString()}
					>
						{formatRelativeTime(item.publishedAt ?? item.fetchedAt)}
					</time>
				</p>

				{/* Title */}
				<a
					href={item.url}
					target="_blank"
					rel="noopener noreferrer"
					onClick={handleClick}
					className="hover:text-primary text-sm leading-snug font-semibold transition-colors"
				>
					{item.title}
				</a>

				{/* Description */}
				{item.description && (
					<p className="text-muted-foreground mt-1 line-clamp-2 text-sm leading-relaxed">
						{stripHtml(item.description)}
					</p>
				)}

				{/* Category badge */}
				{item.categoryName && (
					<div className="mt-2">
						<CategoryBadge name={item.categoryName} color={item.categoryColor} />
					</div>
				)}
			</div>

			{/* Actions (hover) */}
			<div className="invisible flex shrink-0 items-start pt-0.5 group-hover:visible">
				<ItemActions
					item={item}
					onReadToggle={() => onMarkRead(item.id)}
					onBookmarkToggle={() => onMarkBookmark(item.id)}
				/>
				{readerButton}
			</div>
		</article>
	);
}

// ── List container ────────────────────────────────────────────────────────────

export function FeedItemList({ items, layout, onMarkRead, onMarkBookmark }: FeedItemListProps) {
	const [readerItem, setReaderItem] = useState<FeedItemRow | null>(null);
	const [readerOpen, setReaderOpen] = useState(false);

	function handleOpenReader(item: FeedItemRow) {
		setReaderItem(item);
		setReaderOpen(true);
		onMarkRead(item.id);
	}

	if (layout === 'cards') {
		return (
			<>
				<div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 lg:grid-cols-3">
					{items.map((item) => (
						<FeedItemCard
							key={item.id}
							item={item}
							layout="cards"
							onMarkRead={onMarkRead}
							onMarkBookmark={onMarkBookmark}
							onOpenReader={handleOpenReader}
						/>
					))}
				</div>
				<ReaderViewDrawer item={readerItem} open={readerOpen} onOpenChange={setReaderOpen} />
			</>
		);
	}

	return (
		<>
			<div className={cn('divide-y', layout === 'compact' && 'divide-y-0')}>
				{items.map((item) => (
					<FeedItemCard
						key={item.id}
						item={item}
						layout={layout}
						onMarkRead={onMarkRead}
						onMarkBookmark={onMarkBookmark}
						onOpenReader={handleOpenReader}
					/>
				))}
			</div>
			<ReaderViewDrawer item={readerItem} open={readerOpen} onOpenChange={setReaderOpen} />
		</>
	);
}
