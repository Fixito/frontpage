import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/dashboard')({
	component: DashboardPage,
});

function DashboardPage() {
	return (
		<div
			style={{
				display: 'flex',
				height: '100vh',
				backgroundColor: 'var(--color-bg-primary)',
				color: 'var(--color-text-primary)',
				alignItems: 'center',
				justifyContent: 'center',
			}}
		>
			<p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--text-sm)' }}>
				Dashboard — coming soon
			</p>
		</div>
	);
}
