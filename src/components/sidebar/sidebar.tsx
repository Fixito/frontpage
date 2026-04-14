import { Link } from '@tanstack/react-router';
import { Rss, Settings2 } from 'lucide-react';

import { SidebarNav } from './sidebar-nav';
import type { SidebarData } from './types';

import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface SidebarProps {
	data: SidebarData;
	activeView?: 'all' | 'bookmarks' | 'digest';
	activeCategoryId?: string;
	activeFeedId?: string;
	onAddFeed?: () => void;
	onManageCategories?: () => void;
}

export function Sidebar({
	data,
	activeView,
	activeCategoryId,
	activeFeedId,
	onAddFeed,
	onManageCategories,
}: SidebarProps) {
	return (
		<aside
			className="border-sidebar-border bg-sidebar w-sidebar flex h-full shrink-0 flex-col border-r"
			aria-label="Application sidebar"
		>
			<div className="flex h-14 shrink-0 items-center px-4">
				<Link to="/" className="text-foreground flex items-center gap-2 text-sm font-semibold">
					<Rss size={16} className="text-primary" aria-hidden />
					Frontpage
				</Link>
			</div>

			<Separator />

			<ScrollArea className="flex-1">
				<nav aria-label="Feed navigation" className="p-2">
					<SidebarNav
						data={data}
						activeView={activeView}
						activeCategoryId={activeCategoryId}
						activeFeedId={activeFeedId}
						onAddFeed={onAddFeed}
					/>
				</nav>
			</ScrollArea>

			<Separator />

			<div className="flex h-12 shrink-0 items-center justify-between px-3">
				<Tooltip>
					<TooltipTrigger asChild>
						<Button
							variant="ghost"
							size="icon"
							className="h-7 w-7"
							onClick={onManageCategories}
							aria-label="Manage categories"
						>
							<Settings2 size={14} aria-hidden />
						</Button>
					</TooltipTrigger>
					<TooltipContent side="top">Manage categories</TooltipContent>
				</Tooltip>
				<ThemeToggle />
			</div>
		</aside>
	);
}
