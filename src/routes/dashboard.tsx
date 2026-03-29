import { createFileRoute, redirect, useRouter } from '@tanstack/react-router';
import { DashboardHeader } from '@/components/dashboard-header';
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
			<DashboardHeader user={user} isGuest={isGuest} onSignOut={handleSignOut} />
			<main className="flex flex-1 items-center justify-center">
				<p className="text-sm text-muted-foreground">Dashboard — coming soon</p>
			</main>
		</div>
	);
}
