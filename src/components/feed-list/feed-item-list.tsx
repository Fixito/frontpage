import { useCallback, useEffect, useState } from 'react';
import { ItemActions } from './item-actions';
import { KeyboardShortcutsHelp } from './keyboard-shortcuts-help';
import { ReaderViewDrawer } from './reader-view-drawer';
import type { FeedItemRow } from './types';
import { formatAbsoluteDate, formatRelativeTime } from '@/lib/time';
import { cn, hashToHex, hashToIndex, stripHtml } from '@/lib/utils';

// ── Avatar ───────────────────────────────────────────────────────────────────
// Uses CSS custom property --avatar-{n} which switches between light/dark mode.
// All --avatar-{n} values are -700/-600 shades → white text ≥ 4.5:1 contrast.

function FeedAvatar({ feedId, feedTitle }: { feedId: string; feedTitle: string }) {
	const idx = hashToIndex(feedId, 8);
	return (
		<div
			className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-[11px] font-bold text-white"
			style={{ backgroundColor: `var(--avatar-${idx})` }}
			aria-hidden
		>
			{feedTitle.charAt(0).toUpperCase()}
		</div>
	);
}

// ── Category badge ────────────────────────────────────────────────────────────
// Uses CSS custom properties --badge-{n}-{bg|text|border} that swap in dark mode.
// All pairs pass WCAG AA (≥ 4.5:1). Explicit DB color overrides the palette slot.

function CategoryBadge({
	name,
	categoryId,
	color,
}: {
	name: string;
	categoryId?: string | null;
	color?: string | null;
}) {
	const style = color
		? { backgroundColor: `${color}22`, color, border: `1px solid ${color}44` }
		: (() => {
				const idx = hashToIndex(categoryId ?? name, 8);
				return {
					backgroundColor: `var(--badge-${idx}-bg)`,
					color: `var(--badge-${idx}-text)`,
					border: `1px solid var(--badge-${idx}-border)`,
				};
			})();
	return (
		<span className="inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium" style={style}>
			{name}
		</span>
	);
}

// ── Shared source+time row ────────────────────────────────────────────────────

function SourceRow({ item }: { item: FeedItemRow }) {
	return (
		<p className="text-muted-foreground flex items-center gap-1 text-xs">
			<span className="text-foreground/70 max-w-40 truncate font-medium">{item.feedTitle}</span>
			<span aria-hidden>·</span>
			<time title={formatAbsoluteDate(item.publishedAt)} dateTime={item.publishedAt?.toISOString()}>
				{formatRelativeTime(item.publishedAt ?? item.fetchedAt)}
			</time>
		</p>
	);
}

// ── Title element ─────────────────────────────────────────────────────────────
// Opens the reader when full HTML content is available, otherwise external URL.

const TITLE_BASE = 'hover:text-primary transition-colors cursor-pointer';

interface TitleElProps {
	item: FeedItemRow;
	className: string;
	onOpenReader: (item: FeedItemRow) => void;
	onMarkRead: (itemId: string) => void;
}

function TitleEl({ item, className, onOpenReader, onMarkRead }: TitleElProps) {
	if (item.contentHtml) {
		return (
			<button
				type="button"
				onClick={() => onOpenReader(item)}
				className={cn('text-left', TITLE_BASE, className)}
			>
				{item.title}
			</button>
		);
	}
	return (
		<a
			href={item.url}
			target="_blank"
			rel="noopener noreferrer"
			onClick={() => onMarkRead(item.id)}
			className={cn(TITLE_BASE, className)}
		>
			{item.title}
		</a>
	);
}

// ── Card ──────────────────────────────────────────────────────────────────────

interface FeedItemListProps {
	items: Array<FeedItemRow>;
	layout: 'list' | 'compact' | 'cards';
	onMarkRead: (itemId: string) => void;
	onMarkBookmark: (itemId: string) => void;
	userId: string | null;
}

interface FeedItemCardProps {
	item: FeedItemRow;
	layout: 'list' | 'compact' | 'cards';
	index: number;
	isFocused?: boolean;
	onMarkRead: (itemId: string) => void;
	onMarkBookmark: (itemId: string) => void;
	onOpenReader: (item: FeedItemRow) => void;
}

function FeedItemCard({
	item,
	layout,
	index,
	isFocused,
	onMarkRead,
	onMarkBookmark,
	onOpenReader,
}: FeedItemCardProps) {
	const isCompact = layout === 'compact';
	const isCards = layout === 'cards';

	// ── Cards layout ──────────────────────────────────────────────────────────
	if (isCards) {
		const accentHex = hashToHex(item.categoryId ?? item.feedId);
		return (
			<article
				data-item-index={index}
				className={cn(
					'group bg-card flex flex-col overflow-hidden rounded-xl shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md',
					item.isRead && 'opacity-60',
					isFocused && 'ring-primary ring-2 ring-inset',
				)}
			>
				{/* Colored top accent bar */}
				<div className="h-1 w-full shrink-0" style={{ backgroundColor: accentHex }} />

				<div className="flex flex-1 flex-col gap-2.5 p-4">
					{/* Header */}
					<div className="flex items-center gap-2">
						<FeedAvatar feedId={item.feedId} feedTitle={item.feedTitle} />
						<SourceRow item={item} />
						{!item.isRead && (
							<span className="h-2 w-2 shrink-0 rounded-full bg-blue-500" aria-label="Unread" />
						)}
					</div>

					{/* Title */}
					<TitleEl
						item={item}
						className="line-clamp-2 text-base leading-snug font-semibold"
						onOpenReader={onOpenReader}
						onMarkRead={onMarkRead}
					/>

					{/* Description */}
					{item.description && (
						<p className="text-muted-foreground line-clamp-3 flex-1 text-sm leading-relaxed">
							{stripHtml(item.description)}
						</p>
					)}

					{/* Footer */}
					<div className="border-border/50 mt-auto flex items-center gap-2 border-t pt-2.5">
						{item.categoryName && (
							<CategoryBadge
								name={item.categoryName}
								categoryId={item.categoryId}
								color={item.categoryColor}
							/>
						)}
						<div className="invisible ml-auto flex group-hover:visible">
							<ItemActions
								item={item}
								onReadToggle={() => onMarkRead(item.id)}
								onBookmarkToggle={() => onMarkBookmark(item.id)}
							/>
						</div>
					</div>
				</div>
			</article>
		);
	}

	// ── Compact layout ────────────────────────────────────────────────────────
	if (isCompact) {
		return (
			<article
				data-item-index={index}
				className={cn(
					'group hover:bg-accent/30 flex items-center gap-2 px-4 py-2 transition-colors',
					item.isRead && 'opacity-60',
					isFocused && 'ring-primary ring-2 ring-inset',
				)}
			>
				<div className="flex w-3 shrink-0 justify-center">
					{!item.isRead && (
						<span className="bg-unread h-1.5 w-1.5 rounded-full" aria-label="Unread" />
					)}
				</div>

				<FeedAvatar feedId={item.feedId} feedTitle={item.feedTitle} />

				<span className="text-muted-foreground w-28 shrink-0 truncate text-xs">
					{item.feedTitle}
				</span>

				<TitleEl
					item={item}
					className="min-w-0 flex-1 truncate text-sm font-medium"
					onOpenReader={onOpenReader}
					onMarkRead={onMarkRead}
				/>

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
				</div>
			</article>
		);
	}

	// ── List layout (default) ─────────────────────────────────────────────────
	return (
		<article
			data-item-index={index}
			className={cn(
				'group hover:bg-accent/30 flex gap-3 px-4 py-3 transition-colors',
				item.isRead && 'opacity-60',
				isFocused && 'ring-primary ring-2 ring-inset',
			)}
		>
			{/* Unread indicator */}
			<div className="flex w-3 shrink-0 items-start justify-center pt-2">
				{!item.isRead && <span className="bg-unread h-2 w-2 rounded-full" aria-label="Unread" />}
			</div>

			<div className="shrink-0 pt-0.5">
				<FeedAvatar feedId={item.feedId} feedTitle={item.feedTitle} />
			</div>

			<div className="min-w-0 flex-1">
				<div className="mb-0.5">
					<SourceRow item={item} />
				</div>

				<TitleEl
					item={item}
					className="text-sm leading-snug font-semibold"
					onOpenReader={onOpenReader}
					onMarkRead={onMarkRead}
				/>

				{item.description && (
					<p className="text-muted-foreground mt-1 line-clamp-2 text-sm leading-relaxed">
						{stripHtml(item.description)}
					</p>
				)}

				{item.categoryName && (
					<div className="mt-2">
						<CategoryBadge
							name={item.categoryName}
							categoryId={item.categoryId}
							color={item.categoryColor}
						/>
					</div>
				)}
			</div>

			<div className="invisible flex shrink-0 items-start pt-0.5 group-hover:visible">
				<ItemActions
					item={item}
					onReadToggle={() => onMarkRead(item.id)}
					onBookmarkToggle={() => onMarkBookmark(item.id)}
				/>
			</div>
		</article>
	);
}

// ── List container ────────────────────────────────────────────────────────────

export function FeedItemList({
	items,
	layout,
	onMarkRead,
	onMarkBookmark,
	userId,
}: FeedItemListProps) {
	const [readerItem, setReaderItem] = useState<FeedItemRow | null>(null);
	const [readerOpen, setReaderOpen] = useState(false);
	const [readerIndex, setReaderIndex] = useState<number | null>(null);
	const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
	const [helpOpen, setHelpOpen] = useState(false);

	const handleOpenReader = useCallback(
		(item: FeedItemRow) => {
			const idx = items.indexOf(item);
			setReaderItem(item);
			setReaderOpen(true);
			setReaderIndex(idx !== -1 ? idx : null);
			onMarkRead(item.id);
		},
		[items, onMarkRead],
	);

	function handlePrev() {
		if (readerIndex === null || readerIndex <= 0) return;
		const prevItem = items[readerIndex - 1];
		setReaderItem(prevItem);
		setReaderIndex(readerIndex - 1);
		onMarkRead(prevItem.id);
	}

	function handleNext() {
		if (readerIndex === null || readerIndex >= items.length - 1) return;
		const nextItem = items[readerIndex + 1];
		setReaderItem(nextItem);
		setReaderIndex(readerIndex + 1);
		onMarkRead(nextItem.id);
	}

	useEffect(() => {
		function handleKey(e: KeyboardEvent) {
			const tag = (e.target as HTMLElement).tagName;
			if (tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement).isContentEditable)
				return;
			if (readerOpen) return;

			if (e.key === '?') {
				e.preventDefault();
				setHelpOpen(true);
				return;
			}
			if (e.key === 'Escape') {
				setFocusedIndex(null);
				return;
			}
			if (e.key === 'j' || e.key === 'ArrowDown') {
				e.preventDefault();
				const nextIndex = focusedIndex === null ? 0 : Math.min(focusedIndex + 1, items.length - 1);
				setFocusedIndex(nextIndex);
				document
					.querySelector(`[data-item-index="${nextIndex}"]`)
					?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
				return;
			}
			if (e.key === 'k' || e.key === 'ArrowUp') {
				e.preventDefault();
				const prevIndex = focusedIndex === null ? 0 : Math.max(focusedIndex - 1, 0);
				setFocusedIndex(prevIndex);
				document
					.querySelector(`[data-item-index="${prevIndex}"]`)
					?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
				return;
			}
			if (focusedIndex === null) return;
			const item = items[focusedIndex];
			if (e.key === 'o' || e.key === 'Enter') {
				e.preventDefault();
				handleOpenReader(item);
				return;
			}
			if (e.key === 'm') {
				e.preventDefault();
				onMarkRead(item.id);
				return;
			}
			if (e.key === 's') {
				e.preventDefault();
				onMarkBookmark(item.id);
				return;
			}
		}
		document.addEventListener('keydown', handleKey);
		return () => document.removeEventListener('keydown', handleKey);
	}, [items, focusedIndex, readerOpen, handleOpenReader, onMarkRead, onMarkBookmark]);

	if (layout === 'cards') {
		return (
			<>
				<div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 lg:grid-cols-3">
					{items.map((item, index) => (
						<FeedItemCard
							key={item.id}
							item={item}
							layout="cards"
							index={index}
							isFocused={focusedIndex === index}
							onMarkRead={onMarkRead}
							onMarkBookmark={onMarkBookmark}
							onOpenReader={handleOpenReader}
						/>
					))}
				</div>
				<ReaderViewDrawer
					item={readerItem}
					open={readerOpen}
					onOpenChange={setReaderOpen}
					userId={userId}
					hasPrev={readerIndex !== null && readerIndex > 0}
					hasNext={readerIndex !== null && readerIndex < items.length - 1}
					onPrev={handlePrev}
					onNext={handleNext}
				/>
				<KeyboardShortcutsHelp open={helpOpen} onOpenChange={setHelpOpen} />
			</>
		);
	}

	return (
		<>
			<div className={cn('divide-y', layout === 'compact' && 'divide-y-0')}>
				{items.map((item, index) => (
					<FeedItemCard
						key={item.id}
						item={item}
						layout={layout}
						index={index}
						isFocused={focusedIndex === index}
						onMarkRead={onMarkRead}
						onMarkBookmark={onMarkBookmark}
						onOpenReader={handleOpenReader}
					/>
				))}
			</div>
			<ReaderViewDrawer
				item={readerItem}
				open={readerOpen}
				onOpenChange={setReaderOpen}
				userId={userId}
				hasPrev={readerIndex !== null && readerIndex > 0}
				hasNext={readerIndex !== null && readerIndex < items.length - 1}
				onPrev={handlePrev}
				onNext={handleNext}
			/>
			<KeyboardShortcutsHelp open={helpOpen} onOpenChange={setHelpOpen} />
		</>
	);
}
