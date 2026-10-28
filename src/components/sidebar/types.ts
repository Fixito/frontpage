import type { FeedHealth } from '@/db/schema';

export interface FeedNavItem {
	id: string;
	title: string;
	url: string;
	faviconUrl: string | null;
	unreadCount: number;
	healthStatus: FeedHealth;
}

export interface CategoryNavItem {
	id: string;
	name: string;
	unreadCount: number;
	feeds: Array<FeedNavItem>;
}

export interface SidebarData {
	categories: Array<CategoryNavItem>;
	uncategorized: Array<FeedNavItem>;
	totalUnread: number;
	bookmarkCount: number;
}
