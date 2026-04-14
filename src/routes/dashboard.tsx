import { Link, createFileRoute, redirect, useRouter } from '@tanstack/react-router';
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, LogOut, Menu, RefreshCw } from 'lucide-react';
import { z } from 'zod';

import type { FeedLayout } from '@/components/ui/layout-toggle';
import type { SidebarData } from '@/components/sidebar';
import { Button } from '@/components/ui/button';
import { LayoutToggle } from '@/components/ui/layout-toggle';
import { ThemeToggle, applyTheme, readStoredTheme } from '@/components/ui/theme-toggle';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Sidebar, SidebarNav } from '@/components/sidebar';
import { AddFeedDialog, ManageCategoriesDialog } from '@/components/feeds';
import { DigestView, FeedContentArea } from '@/components/feed-list';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';

import { authClient } from '@/lib/auth-client';
import { getSidebarDataFn, updateFeedFn } from '@/lib/category-service';
import { refreshAllFeedsFn } from '@/lib/feed-service';
import { getPreferenceFn, updateLayoutFn, updateThemeFn } from '@/lib/preference-service';
import { enterGuestMode, exitGuestMode } from '@/lib/session';

const dashboardSearchSchema = z.object({
	categoryId: z.string().optional(),
	feedId: z.string().optional(),
	view: z.enum(['all', 'bookmarks', 'digest']).optional(),
});

const EMPTY_SIDEBAR_DATA: SidebarData = {
	categories: [],
	uncategorized: [],
	totalUnread: 0,
	bookmarkCount: 0,
};

export const Route = createFileRoute('/dashboard')({
	validateSearch: dashboardSearchSchema,
	beforeLoad: async ({ context }) => {
		if (!context.user && !context.guest) {
			const { available } = await enterGuestMode();
			throw redirect({ to: available ? '/dashboard' : '/sign-in' });
		}

		return {
			user: context.user,
			guest: context.guest,
		};
	},
	loader: async ({ context }) => {
		if (!context.user) {
			if (context.guest?.demoUserId) {
				const sidebarData = await getSidebarDataFn({
					data: { userId: context.guest.demoUserId },
				});

				return { sidebarData, preferences: null };
			}

			return { sidebarData: EMPTY_SIDEBAR_DATA, preferences: null };
		}

		const [sidebarData, preferences] = await Promise.all([
			getSidebarDataFn({ data: { userId: context.user.id } }),
			getPreferenceFn({ data: { userId: context.user.id } }),
		]);
		return { sidebarData, preferences };
	},
	component: DashboardPage,
});

function getInitialLayout(): FeedLayout {
	if (typeof window === 'undefined') return 'list';
	const stored = localStorage.getItem('feedLayout');
	if (stored === 'compact' || stored === 'cards') return stored;
	return 'list';
}

function DashboardPage() {
	const { user, guest } = Route.useRouteContext();
	const { sidebarData: loaderSidebarData, preferences: loaderPreferences } = Route.useLoaderData();
	const { categoryId, feedId, view: rawView } = Route.useSearch();
	const view = rawView ?? 'all';
	const router = useRouter();
	const [mobileOpen, setMobileOpen] = useState(false);
	const [layout, setLayout] = useState<FeedLayout>(() => {
		const dbLayout = loaderPreferences?.defaultLayout;
		if (dbLayout === 'compact' || dbLayout === 'cards') return dbLayout;
		if (dbLayout === 'list') return 'list';
		return getInitialLayout();
	});
	const [dark, setDark] = useState(() => {
		if (loaderPreferences?.theme === 'dark') return true;
		if (loaderPreferences?.theme === 'light') return false;
		return readStoredTheme();
	});
	const [addFeedOpen, setAddFeedOpen] = useState(false);
	const [manageCategoriesOpen, setManageCategoriesOpen] = useState(false);
	const [refreshing, setRefreshing] = useState(false);
	const [feedRefreshKey, setFeedRefreshKey] = useState(0);

	const effectiveUserId = user?.id ?? guest?.demoUserId ?? null;

	const queryClient = useQueryClient();
	const { data: sidebarData = EMPTY_SIDEBAR_DATA } = useQuery({
		queryKey: ['sidebar', effectiveUserId],
		queryFn: () => getSidebarDataFn({ data: { userId: effectiveUserId! } }),
		initialData: loaderSidebarData,
		enabled: !!effectiveUserId,
	});

	const categories = sidebarData.categories.map((c) => ({ id: c.id, name: c.name }));

	function handleLayoutChange(next: FeedLayout) {
		setLayout(next);
		localStorage.setItem('feedLayout', next);
		if (user?.id) {
			void updateLayoutFn({ data: { userId: user.id, layout: next } });
		}
	}

	function handleThemeToggle() {
		const next = !dark;
		setDark(next);
		applyTheme(next);
		if (user?.id) {
			void updateThemeFn({ data: { userId: user.id, theme: next ? 'dark' : 'light' } });
		}
	}

	async function handleSignOut() {
		if (guest) {
			await exitGuestMode();
		} else {
			await authClient.signOut();
		}

		await router.navigate({ to: '/' });
	}

	async function handleRefreshSidebar() {
		await queryClient.invalidateQueries({ queryKey: ['sidebar', effectiveUserId] });
	}

	function handleBookmarkCountChange(delta: number) {
		queryClient.setQueryData<SidebarData>(['sidebar', effectiveUserId], (prev) =>
			prev ? { ...prev, bookmarkCount: Math.max(0, prev.bookmarkCount + delta) } : prev,
		);
	}

	async function handleRefreshAll() {
		if (!user) return;
		setRefreshing(true);

		try {
			await refreshAllFeedsFn({ data: { userId: user.id } });
			await queryClient.invalidateQueries({ queryKey: ['sidebar', effectiveUserId] });
		} finally {
			setFeedRefreshKey((k) => k + 1);
			setRefreshing(false);
		}
	}

	function handleMoveFeed(targetFeedId: string, targetCategoryId: string | null) {
		if (!user) return;

		queryClient.setQueryData<SidebarData>(['sidebar', effectiveUserId], (prev) => {
			if (!prev) return prev;

			const movingFeed =
				prev.uncategorized.find((f) => f.id === targetFeedId) ??
				prev.categories.flatMap((c) => c.feeds).find((f) => f.id === targetFeedId);
			if (!movingFeed) return prev;

			const newUncategorized =
				targetCategoryId === null
					? prev.uncategorized.some((f) => f.id === targetFeedId)
						? prev.uncategorized
						: [...prev.uncategorized, { ...movingFeed }]
					: prev.uncategorized.filter((f) => f.id !== targetFeedId);

			const newCategories = prev.categories.map((cat) => {
				if (cat.id === targetCategoryId) {
					if (cat.feeds.some((f) => f.id === targetFeedId)) return cat;
					return {
						...cat,
						feeds: [...cat.feeds, movingFeed],
						unreadCount: cat.unreadCount + movingFeed.unreadCount,
					};
				}
				if (cat.feeds.some((f) => f.id === targetFeedId)) {
					return {
						...cat,
						feeds: cat.feeds.filter((f) => f.id !== targetFeedId),
						unreadCount: Math.max(0, cat.unreadCount - movingFeed.unreadCount),
					};
				}
				return cat;
			});

			return { ...prev, categories: newCategories, uncategorized: newUncategorized };
		});

		updateFeedFn({
			data: { userId: user.id, feedId: targetFeedId, categoryId: targetCategoryId },
		}).catch(() => {
			void queryClient.invalidateQueries({ queryKey: ['sidebar', effectiveUserId] });
		});
	}

	function getPageTitle() {
		if (view === 'bookmarks') return 'Bookmarks';
		if (view === 'digest') return 'Weekly Digest';
		const category = sidebarData.categories.find((c) => c.id === categoryId);
		if (category) return category.name;
		const feed = [
			...sidebarData.categories.flatMap((c) => c.feeds),
			...sidebarData.uncategorized,
		].find((f) => f.id === feedId);
		if (feed) return feed.title;
		return 'All Items';
	}

	return (
		<div className="flex h-screen overflow-hidden">
			{/* Desktop sidebar */}
			<div className="hidden md:block">
				<Sidebar
					data={sidebarData}
					activeView={view}
					activeCategoryId={categoryId}
					activeFeedId={feedId}
					onAddFeed={() => setAddFeedOpen(true)}
					onManageCategories={() => setManageCategoriesOpen(true)}
					onMoveFeed={user ? handleMoveFeed : undefined}
				/>
			</div>

			{/* Mobile sheet */}
			<Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
				<SheetContent side="left" className="w-sidebar p-0" showCloseButton={false}>
					<SheetTitle className="sr-only">Navigation</SheetTitle>
					<div className="border-sidebar-border flex h-14 shrink-0 items-center border-b px-4">
						<Link to="/" className="text-foreground flex items-center gap-2 text-sm font-semibold">
							Frontpage
						</Link>
					</div>

					<nav aria-label="Feed navigation" className="overflow-y-auto p-2">
						<SidebarNav
							data={sidebarData}
							activeView={view}
							activeCategoryId={categoryId}
							activeFeedId={feedId}
							onNavigate={() => setMobileOpen(false)}
							onAddFeed={() => {
								setMobileOpen(false);
								setAddFeedOpen(true);
							}}
							onMoveFeed={user ? handleMoveFeed : undefined}
						/>
					</nav>
				</SheetContent>
			</Sheet>

			{/* Main area */}
			<div className="flex min-w-0 flex-1 flex-col overflow-hidden">
				{/* Guest banner */}
				{guest && (
					<div className="border-border bg-accent/30 flex items-center justify-between border-b px-4 py-2">
						<p className="text-accent-foreground text-sm">
							You&apos;re browsing as a guest.{' '}
							<Link to="/sign-up" className="font-medium underline underline-offset-2">
								Create an account
							</Link>{' '}
							to save your feeds and settings.
						</p>
						<Button variant="ghost" size="sm" onClick={handleSignOut} className="shrink-0">
							Exit guest
						</Button>
					</div>
				)}

				{/* Page header */}
				<header className="border-border bg-background flex h-14 shrink-0 items-center gap-3 border-b px-4">
					<Button
						variant="ghost"
						size="icon"
						className="md:hidden"
						onClick={() => setMobileOpen(true)}
						aria-label="Open navigation"
					>
						<Menu size={18} aria-hidden />
					</Button>

					<h1 className="min-w-0 flex-1 truncate text-base font-semibold">{getPageTitle()}</h1>

					<div className="flex items-center gap-1">
						<LayoutToggle value={layout} onChange={handleLayoutChange} />

						<Tooltip>
							<TooltipTrigger asChild>
								<Button
									variant="ghost"
									size="icon"
									aria-label="Refresh feeds"
									disabled={refreshing || !user}
									onClick={() => {
										void handleRefreshAll();
									}}
								>
									{refreshing ? (
										<Loader2 size={16} className="animate-spin" aria-hidden />
									) : (
										<RefreshCw size={16} aria-hidden />
									)}
								</Button>
							</TooltipTrigger>
							<TooltipContent>Refresh feeds</TooltipContent>
						</Tooltip>

						<ThemeToggle dark={dark} onToggle={handleThemeToggle} />

						{user && (
							<Button variant="ghost" size="sm" onClick={handleSignOut} className="gap-1.5">
								<LogOut size={14} aria-hidden />
								<span className="hidden sm:inline">Sign out</span>
							</Button>
						)}
					</div>
				</header>

				{/* Content */}
				<main id="main-content" className="flex flex-1 flex-col overflow-hidden">
					{view === 'digest' ? (
						<DigestView userId={user?.id ?? null} />
					) : (
						<FeedContentArea
							userId={user?.id ?? null}
							guest={guest}
							feedId={feedId}
							categoryId={categoryId}
							view={view}
							layout={layout}
							onSidebarRefresh={handleRefreshSidebar}
							onBookmarkCountChange={handleBookmarkCountChange}
							refreshKey={feedRefreshKey}
						/>
					)}
				</main>
			</div>

			{/* Dialogs */}
			<AddFeedDialog
				open={addFeedOpen}
				onOpenChange={setAddFeedOpen}
				userId={user?.id ?? ''}
				categories={categories}
				onSuccess={handleRefreshSidebar}
			/>

			<ManageCategoriesDialog
				open={manageCategoriesOpen}
				onOpenChange={setManageCategoriesOpen}
				userId={user?.id ?? ''}
				categories={categories}
				onSuccess={handleRefreshSidebar}
			/>
		</div>
	);
}
