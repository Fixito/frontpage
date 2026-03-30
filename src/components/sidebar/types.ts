export interface FeedNavItem {
	id: string;
	title: string;
	faviconUrl: string | null;
	unreadCount: number;
	healthStatus: 'active' | 'stale' | 'error';
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
