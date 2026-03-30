import { Bookmark, BookmarkCheck, Circle, CircleCheck, ExternalLink } from 'lucide-react';
import type { FeedItemRow } from './types';
import { Button } from '@/components/ui/button';

interface ItemActionsProps {
	item: FeedItemRow;
	onReadToggle: () => void;
	onBookmarkToggle: () => void;
}

export function ItemActions({ item, onReadToggle, onBookmarkToggle }: ItemActionsProps) {
	return (
		<div className="flex items-center gap-0.5">
			<Button
				variant="ghost"
				size="icon"
				className="h-7 w-7"
				aria-label={item.isRead ? 'Mark as unread' : 'Mark as read'}
				onClick={(e) => {
					e.preventDefault();
					e.stopPropagation();
					onReadToggle();
				}}
			>
				{item.isRead ? <CircleCheck size={14} aria-hidden /> : <Circle size={14} aria-hidden />}
			</Button>

			<Button
				variant="ghost"
				size="icon"
				className="h-7 w-7"
				aria-label={item.isBookmarked ? 'Remove bookmark' : 'Bookmark'}
				onClick={(e) => {
					e.preventDefault();
					e.stopPropagation();
					onBookmarkToggle();
				}}
			>
				{item.isBookmarked ? (
					<BookmarkCheck size={14} aria-hidden />
				) : (
					<Bookmark size={14} aria-hidden />
				)}
			</Button>

			<a
				href={item.url}
				target="_blank"
				rel="noopener noreferrer"
				aria-label="Open in new tab"
				onClick={(e) => e.stopPropagation()}
			>
				<Button variant="ghost" size="icon" className="h-7 w-7" tabIndex={-1}>
					<ExternalLink size={14} aria-hidden />
				</Button>
			</a>
		</div>
	);
}
