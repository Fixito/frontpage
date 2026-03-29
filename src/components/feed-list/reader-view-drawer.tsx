import { X } from 'lucide-react';
import DOMPurify from 'isomorphic-dompurify';
import type { FeedItemRow } from './types';
import {
	Drawer,
	DrawerClose,
	DrawerContent,
	DrawerHeader,
	DrawerTitle,
} from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatAbsoluteDate } from '@/lib/time';

interface ReaderViewDrawerProps {
	item: FeedItemRow | null;
	open: boolean;
	onOpenChange: (v: boolean) => void;
}

function sanitize(html: string): string {
	return DOMPurify.sanitize(html, { USE_PROFILES: { html: true } });
}

export function ReaderViewDrawer({ item, open, onOpenChange }: ReaderViewDrawerProps) {
	const safeHtml = item?.contentHtml ? sanitize(item.contentHtml) : '';

	return (
		<Drawer open={open} onOpenChange={onOpenChange} direction="right">
			<DrawerContent className="flex h-full w-full flex-col sm:max-w-2xl">
				<DrawerHeader className="flex shrink-0 items-start justify-between gap-4 border-b pb-4">
					<DrawerTitle className="line-clamp-2 text-base leading-snug">
						{item?.title ?? ''}
					</DrawerTitle>
					<DrawerClose asChild>
						<Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" aria-label="Close">
							<X size={16} aria-hidden />
						</Button>
					</DrawerClose>
				</DrawerHeader>

				<ScrollArea className="flex-1">
					<div className="p-4 md:p-6">
						{item && (
							<>
								<div className="text-muted-foreground mb-6 flex flex-wrap gap-x-3 gap-y-1 text-sm">
									{item.author && <span>{item.author}</span>}
									{item.publishedAt && (
										<time dateTime={item.publishedAt.toISOString()}>
											{formatAbsoluteDate(item.publishedAt)}
										</time>
									)}
									<a
										href={item.url}
										target="_blank"
										rel="noopener noreferrer"
										className="hover:text-foreground ml-auto underline underline-offset-2 transition-colors"
									>
										Original article ↗
									</a>
								</div>

								{safeHtml ? (
									<div
										className="prose prose-sm dark:prose-invert max-w-none"
										// eslint-disable-next-line react/no-danger
										dangerouslySetInnerHTML={{ __html: safeHtml }}
									/>
								) : (
									<p className="text-muted-foreground text-sm">No content available.</p>
								)}
							</>
						)}
					</div>
				</ScrollArea>
			</DrawerContent>
		</Drawer>
	);
}
