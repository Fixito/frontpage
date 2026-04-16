import { Link, createFileRoute, useRouter } from '@tanstack/react-router';
import {
	ArrowRight,
	Bookmark,
	BookmarkCheck,
	FolderOpen,
	Layers,
	LayoutDashboard,
	Rss,
	Search,
	Sparkles,
	Zap,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { enterGuestMode, redirectIfAuthenticated } from '@/lib/session';

export const Route = createFileRoute('/')({
	beforeLoad: ({ context }) => redirectIfAuthenticated(context),
	component: LandingPage,
});

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

const STEPS = [
	{
		icon: Rss,
		title: 'Add your feeds',
		description: 'Paste any RSS or Atom URL. We handle the rest — parsing, caching, and updates.',
	},
	{
		icon: FolderOpen,
		title: 'Organize by topic',
		description:
			'Create categories that match how you think. Frontend, AI, Design — your structure.',
	},
	{
		icon: Zap,
		title: 'Read what matters',
		description: 'Scan your personalized feed, bookmark the best, and skip the noise.',
	},
] as const;

const MOCK_ITEMS = [
	{
		source: 'Smashing Magazine',
		initial: 'S',
		avatarClass: 'bg-orange-600',
		time: '2h ago',
		title: 'Practical Guide To Designing For Colorblind Users',
		excerpt: 'A comprehensive look at inclusive design patterns and testing tools…',
		category: 'Design',
		unread: true,
	},
	{
		source: 'Cloudflare Blog',
		initial: 'C',
		avatarClass: 'bg-amber-600',
		time: '3h ago',
		title: 'How We Reduced P99 Latency by 60%',
		excerpt: 'Deep dive into the architectural changes behind our latest performance…',
		category: 'Backend & DevOps',
		unread: true,
	},
	{
		source: 'Simon Willison',
		initial: 'S',
		avatarClass: 'bg-violet-600',
		time: '4h ago',
		title: 'Building Effective RAG Systems: What Actually Works',
		excerpt: 'Lessons learned from building retrieval-augmented generation pipelines…',
		category: 'AI & ML',
		unread: true,
	},
	{
		source: 'Josh Comeau',
		initial: 'J',
		avatarClass: 'bg-blue-600',
		time: '5h ago',
		title: 'The Surprising Truth About CSS Container Queries',
		excerpt: 'Container queries change the way we think about responsive components…',
		category: 'Frontend',
		unread: false,
	},
	{
		source: 'Kent C. Dodds',
		initial: 'K',
		avatarClass: 'bg-emerald-600',
		time: '6h ago',
		title: 'Full Stack Components Are the Future',
		excerpt: 'Server components, actions, and loaders — the lines are blurring…',
		category: 'Frontend',
		unread: false,
	},
] as const;

const MOCK_CATEGORIES = [
	{ name: 'Frontend', count: 12 },
	{ name: 'Design', count: 8 },
	{ name: 'Backend & DevOps', count: 15 },
	{ name: 'AI & ML', count: 6 },
] as const;

const SOURCES = [
	'Smashing Magazine',
	'CSS-Tricks',
	'Hacker News',
	'Vercel Blog',
	'Cloudflare',
	'A List Apart',
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
			<header className="border-border/50 bg-background/80 sticky top-0 z-50 border-b backdrop-blur-md">
				<nav className="mx-auto flex h-14 max-w-(--container-page) items-center justify-between px-6">
					<Link to="/" className="text-foreground hover:text-foreground flex items-center gap-2">
						<div className="bg-primary flex h-6 w-6 items-center justify-center rounded-md">
							<Rss size={13} className="text-primary-foreground" aria-hidden />
						</div>
						<span className="text-base font-bold tracking-tight">Frontpage</span>
					</Link>

					<div className="flex items-center gap-2">
						<Button asChild variant="ghost" size="sm">
							<Link to="/sign-in">Sign in</Link>
						</Button>
						<Button asChild size="sm">
							<Link to="/sign-up">Get started</Link>
						</Button>
					</div>
				</nav>
			</header>

			<main id="main-content" tabIndex={-1}>
				{/* ── Hero ── */}
				<section className="relative overflow-hidden">
					<div className="pointer-events-none absolute inset-0 -z-10" aria-hidden="true">
						<div className="absolute inset-x-0 top-0 h-[600px] bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,var(--color-accent-subtle),transparent)]" />
					</div>

					<div className="mx-auto max-w-(--container-page) px-6 pt-20 pb-16 text-center sm:pt-28 lg:pt-32">
						<Badge variant="secondary" className="mb-8 gap-1.5 px-3 py-1">
							<Rss size={12} aria-hidden />
							RSS feed reader for developers
						</Badge>

						<h1 className="mx-auto mb-6 max-w-3xl text-3xl font-bold tracking-tight sm:text-[2.4375rem] sm:leading-[1.2]">
							Your personalized front page
							<br />
							<span className="text-primary">for the content you care about</span>
						</h1>

						<p className="text-muted-foreground mx-auto mb-10 max-w-xl text-lg leading-relaxed">
							One calm, organized dashboard for every blog, newsletter, and publication you follow.
							No more scattered tabs and forgotten links.
						</p>

						<div className="flex flex-wrap justify-center gap-3">
							<Button asChild size="lg" className="gap-2 px-6">
								<Link to="/sign-up">
									Get started free
									<ArrowRight size={16} aria-hidden />
								</Link>
							</Button>

							<Button variant="outline" size="lg" className="px-6" onClick={handleGuestMode}>
								Try as guest
							</Button>
						</div>

						<p className="text-muted-foreground mt-5 text-sm">
							Free to use · No credit card required
						</p>
					</div>
				</section>

				{/* ── Product preview ── */}
				<section className="relative mx-auto max-w-(--container-feed) px-6 pb-24">
					<div
						className="pointer-events-none absolute inset-0 -z-10 mx-auto max-w-2xl"
						aria-hidden="true"
					>
						<div className="bg-primary/8 absolute top-1/2 left-1/2 h-[400px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl" />
					</div>
					<DashboardPreview />
				</section>

				{/* ── Trusted sources ── */}
				<section className="border-border/50 border-y py-10">
					<div className="mx-auto max-w-(--container-page) px-6 text-center">
						<p className="text-muted-foreground mb-5 text-sm font-medium">
							Works with your favorite publications
						</p>
						<div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
							{SOURCES.map((name) => (
								<span
									key={name}
									className="text-muted-foreground/60 text-sm font-medium whitespace-nowrap"
								>
									{name}
								</span>
							))}
						</div>
					</div>
				</section>

				{/* ── How it works ── */}
				<section className="mx-auto max-w-(--container-page) px-6 py-20 lg:py-24">
					<div className="mb-14 text-center">
						<h2 className="mb-3 text-2xl font-semibold tracking-tight">
							Up and running in minutes
						</h2>
						<p className="text-muted-foreground mx-auto max-w-md">
							Three simple steps to your personalized reading dashboard.
						</p>
					</div>

					<div className="mx-auto grid max-w-4xl grid-cols-1 gap-8 sm:grid-cols-3">
						{STEPS.map(({ icon: Icon, title, description }, i) => (
							<div key={title} className="relative text-center">
								<div className="mb-4 inline-flex items-center justify-center">
									<div className="bg-primary/10 text-primary relative flex h-14 w-14 items-center justify-center rounded-2xl">
										<Icon size={24} aria-hidden />
										<span className="bg-primary text-primary-foreground absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full text-xs font-semibold">
											{i + 1}
										</span>
									</div>
								</div>
								<h3 className="mb-2 text-base font-semibold">{title}</h3>
								<p className="text-muted-foreground text-sm leading-relaxed">{description}</p>
							</div>
						))}
					</div>
				</section>

				{/* ── Features ── */}
				<section className="bg-muted/40 border-border/50 border-y py-20 lg:py-24">
					<div className="mx-auto max-w-(--container-page) px-6">
						<div className="mb-14 text-center">
							<h2 className="mb-3 text-2xl font-semibold tracking-tight">
								Everything you need to stay informed
							</h2>
							<p className="text-muted-foreground mx-auto max-w-lg">
								A focused reading experience built for developers, designers, and tech
								professionals.
							</p>
						</div>

						<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
							{FEATURES.map(({ icon: Icon, title, description }) => (
								<article
									key={title}
									className="bg-card border-border/60 group rounded-xl border p-6 transition-shadow hover:shadow-md"
								>
									<div className="bg-primary/10 text-primary mb-4 inline-flex rounded-lg p-2.5">
										<Icon size={20} aria-hidden />
									</div>

									<h3 className="mb-2 text-base font-semibold">{title}</h3>

									<p className="text-muted-foreground text-sm leading-relaxed">{description}</p>
								</article>
							))}
						</div>
					</div>
				</section>

				{/* ── Final CTA ── */}
				<section className="mx-auto max-w-(--container-page) px-6 py-20 text-center lg:py-28">
					<div className="bg-muted/50 border-border/50 mx-auto max-w-2xl rounded-2xl border p-10 sm:p-14">
						<div className="bg-primary/10 mx-auto mb-6 flex h-12 w-12 items-center justify-center rounded-2xl">
							<Bookmark size={24} className="text-primary" aria-hidden />
						</div>

						<h2 className="mb-3 text-2xl font-semibold tracking-tight">
							Start reading smarter today
						</h2>
						<p className="text-muted-foreground mx-auto mb-8 max-w-md">
							Join developers who use Frontpage to keep up with the content that matters. Free
							forever for personal use.
						</p>
						<div className="flex flex-wrap justify-center gap-3">
							<Button asChild size="lg" className="gap-2 px-6">
								<Link to="/sign-up">
									Create free account
									<ArrowRight size={16} aria-hidden />
								</Link>
							</Button>

							<Button variant="outline" size="lg" className="px-6" onClick={handleGuestMode}>
								Try as guest
							</Button>
						</div>
					</div>
				</section>
			</main>

			{/* ── Footer ── */}
			<footer className="border-border/50 border-t">
				<div className="mx-auto flex max-w-(--container-page) flex-col items-center justify-between gap-4 px-6 py-8 sm:flex-row">
					<div className="flex items-center gap-2">
						<div className="bg-primary flex h-5 w-5 items-center justify-center rounded">
							<Rss size={11} className="text-primary-foreground" aria-hidden />
						</div>
						<span className="text-sm font-semibold">Frontpage</span>
					</div>
					<p className="text-muted-foreground text-xs">
						&copy; {new Date().getFullYear()} Frontpage. Built as a{' '}
						<a
							href="https://www.frontendmentor.io"
							className="text-muted-foreground hover:text-foreground underline underline-offset-2"
							target="_blank"
							rel="noopener noreferrer"
						>
							Frontend Mentor
						</a>{' '}
						product challenge.
					</p>
				</div>
			</footer>
		</div>
	);
}

function DashboardPreview() {
	return (
		<div
			className="border-border bg-card overflow-hidden rounded-xl border shadow-lg"
			aria-hidden="true"
		>
			{/* Browser chrome */}
			<div className="border-border bg-muted/60 flex items-center gap-3 border-b px-4 py-2.5">
				<div className="flex gap-1.5">
					<div className="h-2.5 w-2.5 rounded-full bg-red-400/60" />
					<div className="h-2.5 w-2.5 rounded-full bg-yellow-400/60" />
					<div className="h-2.5 w-2.5 rounded-full bg-green-400/60" />
				</div>
				<div className="bg-background/80 text-muted-foreground mx-auto rounded-md px-16 py-1 text-xs">
					frontpage.app/dashboard
				</div>
			</div>

			{/* App layout */}
			<div className="flex">
				{/* Sidebar */}
				<div className="border-border bg-muted/20 hidden w-48 shrink-0 border-r px-3 py-4 sm:block">
					<div className="space-y-0.5">
						<div className="bg-accent text-accent-foreground flex items-center gap-2 rounded-md px-2.5 py-1.5 text-xs font-medium">
							<LayoutDashboard size={13} />
							All Items
						</div>
						<div className="text-muted-foreground flex items-center gap-2 px-2.5 py-1.5 text-xs">
							<Bookmark size={13} />
							Saved
						</div>
						<div className="text-muted-foreground flex items-center gap-2 px-2.5 py-1.5 text-xs">
							<Search size={13} />
							Search
						</div>
					</div>
					<div className="mt-5">
						<div className="text-muted-foreground mb-2 px-2.5 text-[10px] font-medium tracking-wider uppercase">
							Categories
						</div>
						<div className="space-y-0.5">
							{MOCK_CATEGORIES.map((cat) => (
								<div
									key={cat.name}
									className="text-muted-foreground flex items-center justify-between px-2.5 py-1 text-xs"
								>
									<span>{cat.name}</span>
									<span className="bg-muted rounded px-1.5 py-0.5 text-[9px] font-medium tabular-nums">
										{cat.count}
									</span>
								</div>
							))}
						</div>
					</div>
				</div>

				{/* Feed content */}
				<div className="min-h-[320px] flex-1 px-4 py-4 sm:px-6">
					<div className="mb-4 flex items-center justify-between">
						<span className="text-sm font-semibold">All Items</span>
						<div className="flex items-center gap-2">
							<span className="bg-primary/10 text-primary rounded-md px-2 py-0.5 text-[10px] font-semibold">
								47 unread
							</span>
						</div>
					</div>
					<div className="divide-border divide-y">
						{MOCK_ITEMS.map((item) => (
							<div key={item.title} className="flex gap-2.5 py-3 first:pt-0">
								{item.unread ? (
									<div className="bg-primary mt-1.5 h-2 w-2 shrink-0 rounded-full" />
								) : (
									<div className="w-2 shrink-0" />
								)}
								<div className="min-w-0 flex-1">
									<div className="mb-0.5 flex items-center gap-1.5">
										<div
											className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[9px] font-medium text-white ${item.avatarClass}`}
										>
											{item.initial}
										</div>
										<span className="text-muted-foreground truncate text-[10px]">
											{item.source}
										</span>
										<span className="text-muted-foreground text-[10px]">·</span>
										<span className="text-muted-foreground shrink-0 text-[10px]">{item.time}</span>
									</div>
									<div className="mb-0.5 truncate text-xs leading-snug font-medium">
										{item.title}
									</div>
									<div className="text-muted-foreground mb-1.5 truncate text-[11px] leading-snug">
										{item.excerpt}
									</div>
									<span className="bg-muted text-muted-foreground rounded px-1.5 py-0.5 text-[9px] font-medium">
										{item.category}
									</span>
								</div>
							</div>
						))}
					</div>
				</div>
			</div>
		</div>
	);
}
