import { Suspense, lazy, useCallback, useEffect, useState } from 'react';
import { ItemActions } from './item-actions';
import { KeyboardShortcutsHelp } from './keyboard-shortcuts-help';
import type { FeedItemRow } from './types';
import { formatAbsoluteDate, formatRelativeTime } from '@/lib/time';
import { cn, hashToIndex, stripHtml } from '@/lib/utils';

const ReaderViewDrawer = lazy(() =>
	import('./reader-view-drawer').then((m) => ({ default: m.ReaderViewDrawer })),
);

// ── Avatar ───────────────────────────────────────────────────────────────────
// Uses CSS custom property --avatar-{n} which switches between light/dark mode.
// All --avatar-{n} values are -700/-600 shades → white text ≥ 4.5:1 contrast.

function FeedAvatar({ feedId, feedTitle }: { feedId: string; feedTitle: string }) {
	const idx = hashToIndex(feedId, 8);
	return (
		<div
			className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[11px] font-bold text-white"
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
		<span
			className="inline-flex rounded-full px-2 py-0.5 text-[10px] leading-tight font-medium"
			style={style}
		>
			{name}
		</span>
	);
}

// ── Shared source+time row ────────────────────────────────────────────────────

function SourceRow({ item, showCategory }: { item: FeedItemRow; showCategory?: boolean }) {
	return (
		<div className="text-muted-foreground flex items-center gap-1.5 text-xs">
			<span className="text-foreground/80 max-w-44 truncate font-medium">{item.feedTitle}</span>
			<span className="text-text-tertiary" aria-hidden>
				·
			</span>
			<time title={formatAbsoluteDate(item.publishedAt)} dateTime={item.publishedAt?.toISOString()}>
				{formatRelativeTime(item.publishedAt ?? item.fetchedAt)}
			</time>
			{showCategory && item.categoryName && (
				<>
					<span className="text-text-tertiary" aria-hidden>
						·
					</span>
					<CategoryBadge
						name={item.categoryName}
						categoryId={item.categoryId}
						color={item.categoryColor}
					/>
				</>
			)}
		</div>
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
		return (
			<article
				data-item-index={index}
				className={cn(
					'group bg-card border-border-subtle/60 hover:border-border-base flex flex-col overflow-hidden rounded-xl border transition-all duration-200 hover:shadow-md',
					item.isRead && 'opacity-55 hover:opacity-80',
					isFocused && 'ring-primary ring-2 ring-inset',
				)}
			>
				<div className="flex flex-1 flex-col gap-2.5 p-4">
					{/* Header */}
					<div className="flex items-center gap-2">
						<FeedAvatar feedId={item.feedId} feedTitle={item.feedTitle} />
						<SourceRow item={item} />
						{!item.isRead && (
							<span
								className="bg-unread h-2 w-2 shrink-0 rounded-full"
								role="img"
								aria-label="Unread"
							/>
						)}
					</div>

					{/* Title */}
					<TitleEl
						item={item}
						className={cn(
							'line-clamp-2 text-base leading-snug',
							item.isRead ? 'font-medium' : 'font-semibold',
						)}
						onOpenReader={onOpenReader}
						onMarkRead={onMarkRead}
					/>

					{/* Description */}
					{item.description && (
						<p className="text-muted-foreground line-clamp-2 flex-1 text-[13px] leading-relaxed">
							{stripHtml(item.description)}
						</p>
					)}
				</div>

				{/* Footer */}
				<div className="border-border-subtle/50 flex items-center gap-2 border-t px-4 py-2.5">
					{item.categoryName ? (
						<CategoryBadge
							name={item.categoryName}
							categoryId={item.categoryId}
							color={item.categoryColor}
						/>
					) : (
						<span />
					)}
					<div className="ml-auto flex opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100">
						<ItemActions
							item={item}
							onReadToggle={() => onMarkRead(item.id)}
							onBookmarkToggle={() => onMarkBookmark(item.id)}
						/>
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
					'group hover:bg-accent/30 flex items-center gap-2 border-l-[3px] px-4 py-2 transition-colors',
					item.isRead
						? 'border-l-transparent opacity-55 hover:opacity-80'
						: 'border-l-[var(--color-unread-indicator)]',
					isFocused && 'ring-primary ring-2 ring-inset',
				)}
			>
				<FeedAvatar feedId={item.feedId} feedTitle={item.feedTitle} />

				<span className="text-muted-foreground w-32 shrink-0 truncate text-xs font-medium">
					{item.feedTitle}
				</span>

				<TitleEl
					item={item}
					className={cn(
						'min-w-0 flex-1 truncate text-sm',
						item.isRead ? 'font-medium' : 'font-semibold',
					)}
					onOpenReader={onOpenReader}
					onMarkRead={onMarkRead}
				/>

				{item.categoryName && (
					<span className="hidden shrink-0 sm:block">
						<CategoryBadge
							name={item.categoryName}
							categoryId={item.categoryId}
							color={item.categoryColor}
						/>
					</span>
				)}

				<time
					className="text-muted-foreground shrink-0 text-xs"
					title={formatAbsoluteDate(item.publishedAt)}
					dateTime={item.publishedAt?.toISOString()}
				>
					{formatRelativeTime(item.publishedAt ?? item.fetchedAt)}
				</time>

				<div className="flex shrink-0 opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100">
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
				'group hover:bg-accent/30 flex gap-3 border-l-[3px] px-5 py-4 transition-colors',
				item.isRead
					? 'border-l-transparent opacity-55 hover:opacity-80'
					: 'border-l-[var(--color-unread-indicator)]',
				isFocused && 'ring-primary ring-2 ring-inset',
			)}
		>
			<div className="shrink-0 pt-0.5">
				<FeedAvatar feedId={item.feedId} feedTitle={item.feedTitle} />
			</div>

			<div className="min-w-0 flex-1">
				<div className="mb-0.5">
					<SourceRow item={item} showCategory />
				</div>

				<TitleEl
					item={item}
					className={cn('text-sm leading-snug', item.isRead ? 'font-medium' : 'font-semibold')}
					onOpenReader={onOpenReader}
					onMarkRead={onMarkRead}
				/>

				{item.description && (
					<p className="text-muted-foreground mt-1 line-clamp-2 text-[13px] leading-relaxed">
						{stripHtml(item.description)}
					</p>
				)}
			</div>

			<div className="flex shrink-0 items-start pt-0.5 opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100">
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
				<div className="grid grid-cols-1 gap-5 p-5 sm:grid-cols-2 lg:grid-cols-3">
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
				<Suspense>
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
				</Suspense>
				<KeyboardShortcutsHelp open={helpOpen} onOpenChange={setHelpOpen} />
			</>
		);
	}

	return (
		<>
			<div className="divide-border-subtle/50 divide-y">
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
			<Suspense>
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
			</Suspense>
			<KeyboardShortcutsHelp open={helpOpen} onOpenChange={setHelpOpen} />
		</>
	);
}
