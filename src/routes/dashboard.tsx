import { Link, createFileRoute, redirect, useRouter } from '@tanstack/react-router';
import { LogOut, Rss } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { authClient } from '@/lib/auth-client';
import { exitGuestMode } from '@/lib/session';

export const Route = createFileRoute('/dashboard')({
	beforeLoad: ({ context }) => {
		if (!context.user && !context.isGuest) {
			throw redirect({ to: '/' });
		}
		return { user: context.user, isGuest: context.isGuest };
	},
	component: DashboardPage,
});

function DashboardPage() {
	const { user, isGuest } = Route.useRouteContext();
	const router = useRouter();

	async function handleSignOut() {
		if (isGuest) {
			await exitGuestMode();
		} else {
			await authClient.signOut();
		}
		await router.navigate({ to: '/' });
	}

	return (
		<div className="flex h-screen flex-col">
			{/* ── Header ── */}
			<header className="sticky top-0 z-50 flex h-14 items-center justify-between border-b border-border bg-background px-6">
				<Link to="/" className="flex items-center gap-2 font-bold text-foreground">
					<Rss size={18} aria-hidden />
					Frontpage
				</Link>
				<div className="flex items-center gap-4">
					{isGuest && (
						<p className="text-sm text-muted-foreground">
							Browsing as guest — <Link to="/sign-up">Sign up to save your data</Link>
						</p>
					)}
					{user && <span className="text-sm text-muted-foreground">{user.email}</span>}
					<Button
						variant="outline"
						size="sm"
						onClick={handleSignOut}
						title={isGuest ? 'Exit guest mode' : 'Sign out'}
					>
						<LogOut size={14} aria-hidden />
						{isGuest ? 'Exit' : 'Sign out'}
					</Button>
				</div>
			</header>

			{/* ── Content placeholder ── */}
			<main className="flex flex-1 items-center justify-center">
				<p className="text-sm text-muted-foreground">Dashboard — coming soon</p>
			</main>
		</div>
	);
}
