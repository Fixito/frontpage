import { Link, createFileRoute, redirect, useRouter } from '@tanstack/react-router';
import { LogOut, Rss } from 'lucide-react';
import { authClient } from '#/lib/auth-client';
import { exitGuestMode } from '#/lib/session';

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
		<div
			style={{
				display: 'flex',
				flexDirection: 'column',
				height: '100vh',
				backgroundColor: 'var(--color-bg-primary)',
				color: 'var(--color-text-primary)',
			}}
		>
			{/* ── Header ── */}
			<header
				style={{
					position: 'sticky',
					top: 0,
					zIndex: 50,
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'space-between',
					height: '3.5rem',
					padding: '0 var(--space-6)',
					borderBottom: '1px solid var(--color-border-subtle)',
					backgroundColor: 'var(--color-bg-primary)',
				}}
			>
				<Link
					to="/"
					style={{
						fontWeight: 'var(--font-bold)',
						fontSize: 'var(--text-base)',
						color: 'var(--color-text-primary)',
						display: 'flex',
						alignItems: 'center',
						gap: 'var(--space-2)',
					}}
				>
					<Rss size={18} aria-hidden />
					Frontpage
				</Link>

				<div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
					{isGuest && (
						<p
							style={{
								fontSize: 'var(--text-sm)',
								color: 'var(--color-text-secondary)',
							}}
						>
							Browsing as guest —{' '}
							<Link to="/sign-up" style={{ color: 'var(--color-accent)' }}>
								Sign up to save your data
							</Link>
						</p>
					)}
					{user && (
						<span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)' }}>
							{user.email}
						</span>
					)}
					<button
						onClick={handleSignOut}
						title={isGuest ? 'Exit guest mode' : 'Sign out'}
						style={{
							display: 'flex',
							alignItems: 'center',
							gap: 'var(--space-1)',
							padding: 'var(--space-2) var(--space-3)',
							fontSize: 'var(--text-sm)',
							color: 'var(--color-text-secondary)',
							background: 'none',
							border: '1px solid var(--color-border)',
							borderRadius: 'var(--radius-md)',
							cursor: 'pointer',
						}}
					>
						<LogOut size={14} aria-hidden />
						{isGuest ? 'Exit' : 'Sign out'}
					</button>
				</div>
			</header>

			{/* ── Content placeholder ── */}
			<main
				style={{
					flex: 1,
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'center',
				}}
			>
				<p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--text-sm)' }}>
					Dashboard — coming soon
				</p>
			</main>
		</div>
	);
}
