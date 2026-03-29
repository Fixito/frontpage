import { useState } from 'react';
import { Globe } from 'lucide-react';
import { ItemActions } from './item-actions';
import { ReaderViewDrawer } from './reader-view-drawer';
import type { FeedItemRow } from './types';
import { formatAbsoluteDate, formatRelativeTime } from '@/lib/time';
import { cn, stripHtml } from '@/lib/utils';

interface FeedItemListProps {
	items: Array<FeedItemRow>;
	layout: 'list' | 'compact' | 'cards';
	onMarkRead: (itemId: string) => void;
	onMarkBookmark: (itemId: string) => void;
}

function FeedFavicon({ url }: { url: string | null }) {
	if (url) {
		return (
			<img
				src={url}
				alt=""
				width={16}
				height={16}
				className="h-4 w-4 rounded-sm object-contain"
				aria-hidden
			/>
		);
	}
	return <Globe size={14} className="text-muted-foreground shrink-0" aria-hidden />;
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

	function handleTitleClick() {
		onMarkRead(item.id);
	}

	return (
		<article
			className={cn(
				'group relative',
				isCompact && 'flex items-center gap-2 px-4 py-2',
				!isCompact && !isCards && 'flex items-start gap-3 px-4 py-3',
				isCards && 'flex flex-col gap-2 rounded-lg border p-4',
				item.isRead && 'opacity-60',
			)}
		>
			{/* Unread dot */}
			{!item.isRead && !isCompact && (
				<span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-blue-500" aria-label="Unread" />
			)}

			{/* Favicon + feed name */}
			<div
				className={cn(
					'flex items-center gap-1.5',
					isCompact ? 'shrink-0' : isCards ? '' : 'mt-0.5 shrink-0',
				)}
			>
				<FeedFavicon url={item.feedFaviconUrl} />
				{!isCompact && (
					<span className="text-muted-foreground max-w-30 truncate text-xs">{item.feedTitle}</span>
				)}
			</div>

			{/* Content */}
			<div className={cn('min-w-0 flex-1', isCompact && 'flex items-center gap-2')}>
				{isCompact && (
					<span className="text-muted-foreground mr-1 shrink-0 text-xs">{item.feedTitle}</span>
				)}

				<div className={cn('flex items-start gap-1.5', isCompact && 'flex-1 items-center')}>
					{!item.isRead && isCompact && (
						<span
							className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500"
							aria-label="Unread"
						/>
					)}
					<a
						href={item.url}
						target="_blank"
						rel="noopener noreferrer"
						onClick={handleTitleClick}
						className={cn(
							'hover:text-primary min-w-0 leading-snug font-medium transition-colors',
							isCompact ? 'truncate text-sm' : 'text-sm',
						)}
					>
						{item.title}
					</a>
				</div>

				{/* Description — list layout only */}
				{!isCompact && !isCards && item.description && (
					<p className="text-muted-foreground mt-1 line-clamp-2 text-sm leading-relaxed">
						{stripHtml(item.description)}
					</p>
				)}

				{/* Description — cards layout only (3 lines) */}
				{isCards && item.description && (
					<p className="text-muted-foreground mt-1 line-clamp-3 text-sm leading-relaxed">
						{stripHtml(item.description)}
					</p>
				)}
			</div>

			{/* Date + actions */}
			<div className={cn('flex shrink-0 items-center gap-2', !isCompact && 'ml-auto')}>
				<time
					className="text-muted-foreground text-xs"
					title={formatAbsoluteDate(item.publishedAt)}
					dateTime={item.publishedAt?.toISOString()}
				>
					{formatRelativeTime(item.publishedAt ?? item.fetchedAt)}
				</time>

				<div className="invisible flex group-hover:visible">
					<ItemActions
						item={item}
						onReadToggle={() => onMarkRead(item.id)}
						onBookmarkToggle={() => onMarkBookmark(item.id)}
					/>
					{item.contentHtml && (
						<button
							type="button"
							onClick={() => onOpenReader(item)}
							className="text-muted-foreground hover:text-foreground hover:bg-accent ml-1 rounded px-1.5 py-0.5 text-xs transition-colors"
						>
							Reader
						</button>
					)}
				</div>
			</div>
		</article>
	);
}

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
