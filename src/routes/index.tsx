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
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { enterGuestMode } from '@/lib/session';

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
		const { authClient } = await import('@/lib/auth-client');
		await authClient.signOut();
		await enterGuestMode();
		await router.navigate({ to: '/dashboard' });
	}

	return (
		<div className="text-foreground bg-background min-h-screen">
			{/* ── Nav ── */}
			<header className="border-border bg-background sticky top-0 z-50 border-b backdrop-blur-sm">
				<nav className="mx-auto flex h-14 max-w-(--container-page) items-center justify-between px-6">
					<span className="text-base font-bold">Frontpage</span>

					<div className="flex items-center gap-2">
						<Button asChild variant="ghost">
							<Link to="/sign-in">Sign in</Link>
						</Button>
						<Button asChild>
							<Link to="/sign-up">Sign up</Link>
						</Button>
					</div>
				</nav>
			</header>

			{/* ── Hero ── */}
			<section className="mx-auto max-w-(--container-page) px-6 pt-20 pb-16 text-center">
				<Badge variant="secondary" className="mb-4">
					RSS feed reader
				</Badge>

				<h1 className="mx-auto mb-6 max-w-2xl text-2xl leading-tight font-bold sm:text-3xl">
					Your personalized front page for tech content
				</h1>

				<p className="text-muted-foreground mx-auto mb-10 max-w-lg text-base leading-loose">
					One calm, organized dashboard for all the blogs, newsletters, and publications you follow.
					No more scattered tabs and forgotten links.
				</p>

				<div className="flex flex-wrap justify-center gap-3">
					<Button asChild size="lg">
						<Link to="/sign-up">
							Get started free
							<ArrowRight aria-hidden />
						</Link>
					</Button>

					<Button variant="outline" size="lg" onClick={handleGuestMode}>
						Try as guest
					</Button>
				</div>
			</section>

			{/* ── Features ── */}
			<section className="mx-auto max-w-(--container-page) px-6 pb-20">
				<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
					{FEATURES.map(({ icon: Icon, title, description }) => (
						<article key={title} className="border-border bg-muted rounded-lg border p-6">
							<div className="bg-accent text-accent-foreground mb-3 inline-flex rounded-md p-2">
								<Icon size={18} aria-hidden />
							</div>

							<h2 className="mb-2 text-base font-semibold">{title}</h2>

							<p className="text-muted-foreground text-sm leading-relaxed">{description}</p>
						</article>
					))}
				</div>
			</section>

			{/* ── Footer ── */}
			<footer className="border-border text-muted-foreground border-t px-6 py-8 text-center text-xs">
				<p>&copy; {new Date().getFullYear()} Frontpage.</p>
			</footer>
		</div>
	);
}
