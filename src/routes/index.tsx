import { Link, createFileRoute, useRouter } from '@tanstack/react-router';
import {
	ArrowRight,
	BookmarkCheck,
	Layers,
	LayoutDashboard,
	Rss,
	Search,
	Sparkles,
} from 'lucide-react';
import { enterGuestMode } from '#/lib/session';

export const Route = createFileRoute('/')({ component: LandingPage });

const FEATURES = [
	{
		icon: Rss,
		title: 'All your feeds, one place',
		description:
			'Add any RSS or Atom feed. Blogs, changelogs, newsletters, design publications — all in one organized dashboard.',
	},
	{
		icon: Layers,
		title: 'Organized by category',
		description:
			'Group feeds into custom categories like Frontend, Design, or AI. Browse everything at once or focus on one topic.',
	},
	{
		icon: BookmarkCheck,
		title: 'Read at your pace',
		description:
			"Track what you've read, bookmark articles for later, and always know what's new since your last visit.",
	},
	{
		icon: Search,
		title: 'Find anything instantly',
		description:
			'Full-text search across all your feeds. Filter by source, category, or date range to find exactly what you need.',
	},
	{
		icon: Sparkles,
		title: 'AI-powered summaries',
		description:
			"Get a concise summary of any article in seconds. Cut through the noise and decide what's worth reading.",
	},
	{
		icon: LayoutDashboard,
		title: 'Your layout, your way',
		description:
			'Switch between compact list, standard feed, and card grid layouts. Adapt the interface to how you like to read.',
	},
] as const;

function LandingPage() {
	const router = useRouter();

	async function handleGuestMode() {
		await enterGuestMode();
		await router.navigate({ to: '/dashboard' });
	}

	return (
		<div
			style={{
				backgroundColor: 'var(--color-bg-primary)',
				color: 'var(--color-text-primary)',
				minHeight: '100vh',
			}}
		>
			{/* ── Nav ── */}
			<header
				style={{
					position: 'sticky',
					top: 0,
					zIndex: 50,
					borderBottom: '1px solid var(--color-border-subtle)',
					backgroundColor: 'var(--color-bg-primary)',
					backdropFilter: 'blur(8px)',
				}}
			>
				<nav
					style={{
						maxWidth: 'var(--page-max-width)',
						margin: '0 auto',
						padding: '0 var(--space-6)',
						height: '3.5rem',
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'space-between',
					}}
				>
					<span
						style={{
							fontWeight: 'var(--font-bold)',
							fontSize: 'var(--text-base)',
							color: 'var(--color-text-primary)',
						}}
					>
						Frontpage
					</span>
					<div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
						<Link
							to="/sign-in"
							style={{
								padding: 'var(--space-2) var(--space-4)',
								fontSize: 'var(--text-sm)',
								fontWeight: 'var(--font-medium)',
								color: 'var(--color-text-secondary)',
								borderRadius: 'var(--radius-md)',
							}}
						>
							Sign in
						</Link>
						<Link
							to="/sign-up"
							style={{
								padding: 'var(--space-2) var(--space-4)',
								fontSize: 'var(--text-sm)',
								fontWeight: 'var(--font-semibold)',
								color: '#fff',
								backgroundColor: 'var(--color-accent)',
								borderRadius: 'var(--radius-md)',
							}}
						>
							Sign up
						</Link>
					</div>
				</nav>
			</header>

			{/* ── Hero ── */}
			<section
				style={{
					maxWidth: 'var(--page-max-width)',
					margin: '0 auto',
					padding: 'var(--space-20) var(--space-6) var(--space-16)',
					textAlign: 'center',
				}}
			>
				<p
					style={{
						display: 'inline-block',
						marginBottom: 'var(--space-4)',
						padding: 'var(--space-1) var(--space-3)',
						fontSize: 'var(--text-xs)',
						fontWeight: 'var(--font-semibold)',
						letterSpacing: '0.08em',
						textTransform: 'uppercase',
						color: 'var(--color-accent)',
						backgroundColor: 'var(--color-accent-subtle)',
						borderRadius: 'var(--radius-full)',
					}}
				>
					RSS feed reader
				</p>
				<h1
					style={{
						margin: '0 auto var(--space-6)',
						maxWidth: '42rem',
						fontSize: 'clamp(var(--text-2xl), 5vw, var(--text-3xl))',
						fontWeight: 'var(--font-bold)',
						lineHeight: 'var(--leading-tight)',
						color: 'var(--color-text-primary)',
					}}
				>
					Your personalized front page for tech content
				</h1>
				<p
					style={{
						margin: '0 auto var(--space-10)',
						maxWidth: '32rem',
						fontSize: 'var(--text-base)',
						lineHeight: 'var(--leading-loose)',
						color: 'var(--color-text-secondary)',
					}}
				>
					One calm, organized dashboard for all the blogs, newsletters, and publications you follow.
					No more scattered tabs and forgotten links.
				</p>
				<div
					style={{
						display: 'flex',
						gap: 'var(--space-3)',
						justifyContent: 'center',
						flexWrap: 'wrap',
					}}
				>
					<Link
						to="/sign-up"
						style={{
							display: 'inline-flex',
							alignItems: 'center',
							gap: 'var(--space-2)',
							padding: 'var(--space-3) var(--space-6)',
							fontSize: 'var(--text-sm)',
							fontWeight: 'var(--font-semibold)',
							color: '#fff',
							backgroundColor: 'var(--color-accent)',
							borderRadius: 'var(--radius-md)',
							boxShadow: 'var(--shadow-sm)',
						}}
					>
						Get started free
						<ArrowRight size={16} aria-hidden />
					</Link>
					<button
						onClick={handleGuestMode}
						style={{
							display: 'inline-flex',
							alignItems: 'center',
							gap: 'var(--space-2)',
							padding: 'var(--space-3) var(--space-6)',
							fontSize: 'var(--text-sm)',
							fontWeight: 'var(--font-semibold)',
							color: 'var(--color-text-primary)',
							backgroundColor: 'var(--color-bg-tertiary)',
							border: '1px solid var(--color-border)',
							borderRadius: 'var(--radius-md)',
							cursor: 'pointer',
						}}
					>
						Try as guest
					</button>
				</div>
			</section>

			{/* ── Features ── */}
			<section
				style={{
					maxWidth: 'var(--page-max-width)',
					margin: '0 auto',
					padding: '0 var(--space-6) var(--space-20)',
				}}
			>
				<div
					style={{
						display: 'grid',
						gridTemplateColumns: 'repeat(auto-fill, minmax(17rem, 1fr))',
						gap: 'var(--space-4)',
					}}
				>
					{FEATURES.map(({ icon: Icon, title, description }) => (
						<article
							key={title}
							style={{
								padding: 'var(--space-6)',
								backgroundColor: 'var(--color-bg-secondary)',
								border: '1px solid var(--color-border-subtle)',
								borderRadius: 'var(--radius-lg)',
							}}
						>
							<div
								style={{
									display: 'inline-flex',
									padding: 'var(--space-2)',
									marginBottom: 'var(--space-3)',
									backgroundColor: 'var(--color-accent-subtle)',
									borderRadius: 'var(--radius-md)',
									color: 'var(--color-accent)',
								}}
							>
								<Icon size={18} aria-hidden />
							</div>
							<h2
								style={{
									margin: '0 0 var(--space-2)',
									fontSize: 'var(--text-base)',
									fontWeight: 'var(--font-semibold)',
									color: 'var(--color-text-primary)',
								}}
							>
								{title}
							</h2>
							<p
								style={{
									margin: 0,
									fontSize: 'var(--text-sm)',
									lineHeight: 'var(--leading-relaxed)',
									color: 'var(--color-text-secondary)',
								}}
							>
								{description}
							</p>
						</article>
					))}
				</div>
			</section>

			{/* ── Footer ── */}
			<footer
				style={{
					borderTop: '1px solid var(--color-border-subtle)',
					padding: 'var(--space-8) var(--space-6)',
					textAlign: 'center',
					fontSize: 'var(--text-sm)',
					color: 'var(--color-text-tertiary)',
				}}
			>
				<p style={{ margin: 0 }}>
					Built for{' '}
					<a href="https://www.frontendmentor.io" target="_blank" rel="noopener noreferrer">
						Frontend Mentor
					</a>
				</p>
			</footer>
		</div>
	);
}
