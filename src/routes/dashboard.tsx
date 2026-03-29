import { useState } from 'react';
import { Link, createFileRoute, redirect, useRouter } from '@tanstack/react-router';
import { z } from 'zod';
import { LogOut, Menu, RefreshCw } from 'lucide-react';
import type { SidebarData } from '@/components/sidebar';
import type { FeedLayout } from '@/components/ui/layout-toggle';
import { authClient } from '@/lib/auth-client';
import { exitGuestMode } from '@/lib/session';
import { getSidebarDataFn } from '@/lib/category-service';
import { Sidebar, SidebarNav } from '@/components/sidebar';
import { AddFeedDialog, ManageCategoriesDialog } from '@/components/feeds';
import { FeedContentArea } from '@/components/feed-list';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { LayoutToggle } from '@/components/ui/layout-toggle';
import { ThemeToggle } from '@/components/ui/theme-toggle';

const dashboardSearchSchema = z.object({
	categoryId: z.string().optional(),
	feedId: z.string().optional(),
	view: z.enum(['all', 'bookmarks']).optional(),
});

const EMPTY_SIDEBAR_DATA: SidebarData = {
	categories: [],
	uncategorized: [],
	totalUnread: 0,
};

export const Route = createFileRoute('/dashboard')({
	validateSearch: dashboardSearchSchema,
	beforeLoad: ({ context }) => {
		if (!context.user && !context.isGuest) {
			throw redirect({ to: '/' });
		}
		return { user: context.user, isGuest: context.isGuest };
	},
	loader: async ({ context }) => {
		if (!context.user) return { sidebarData: EMPTY_SIDEBAR_DATA };
		const sidebarData = await getSidebarDataFn({ data: { userId: context.user.id } });
		return { sidebarData };
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
	const { user, isGuest } = Route.useRouteContext();
	const { sidebarData } = Route.useLoaderData();
	const { categoryId, feedId, view: rawView } = Route.useSearch();
	const view = rawView ?? 'all';
	const router = useRouter();
	const [mobileOpen, setMobileOpen] = useState(false);
	const [layout, setLayout] = useState<FeedLayout>(getInitialLayout);
	const [addFeedOpen, setAddFeedOpen] = useState(false);
	const [manageCategoriesOpen, setManageCategoriesOpen] = useState(false);

	const categories = sidebarData.categories.map((c) => ({ id: c.id, name: c.name }));

	function handleLayoutChange(next: FeedLayout) {
		setLayout(next);
		localStorage.setItem('feedLayout', next);
	}

	async function handleSignOut() {
		if (isGuest) {
			await exitGuestMode();
		} else {
			await authClient.signOut();
		}
		await router.navigate({ to: '/' });
	}

	function handleRefreshSidebar() {
		void router.invalidate();
	}

	function getPageTitle() {
		if (view === 'bookmarks') return 'Bookmarks';
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
						/>
					</nav>
				</SheetContent>
			</Sheet>

			{/* Main area */}
			<div className="flex min-w-0 flex-1 flex-col overflow-hidden">
				{/* Guest banner */}
				{isGuest && (
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

						<Button
							variant="ghost"
							size="icon"
							aria-label="Refresh feeds"
							onClick={handleRefreshSidebar}
						>
							<RefreshCw size={16} aria-hidden />
						</Button>

						<ThemeToggle />

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
					<FeedContentArea
						userId={user?.id ?? null}
						isGuest={isGuest}
						feedId={feedId}
						categoryId={categoryId}
						view={view}
						layout={layout}
						onSidebarRefresh={handleRefreshSidebar}
					/>
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
