import { Suspense, lazy } from 'react';
import { HeadContent, Scripts, createRootRouteWithContext } from '@tanstack/react-router';

import interFontUrl from '@fontsource-variable/inter/files/inter-latin-wght-normal.woff2?url';
import appCss from '../styles.css?url';
import type { AuthContext } from '@/lib/session';
import { getAuthContext } from '@/lib/session';

// Lazy-load devtools only in development — the dead branch is tree-shaken in production,
// so neither package appears in the prod bundle.
const TanStackDevtools = import.meta.env.PROD
	? () => null
	: lazy(() => import('@tanstack/react-devtools').then((m) => ({ default: m.TanStackDevtools })));

const TanStackRouterDevtoolsPanel = import.meta.env.PROD
	? () => null
	: lazy(() =>
			import('@tanstack/react-router-devtools').then((m) => ({
				default: m.TanStackRouterDevtoolsPanel,
			})),
		);

// Inline script to apply theme before first paint (no flash)
const THEME_INIT_SCRIPT = `(function(){try{var stored=localStorage.getItem('theme');var prefersDark=matchMedia('(prefers-color-scheme: dark)').matches;var resolved=stored==='dark'||(!stored&&prefersDark)?'dark':'light';document.documentElement.setAttribute('data-theme',resolved);document.documentElement.style.colorScheme=resolved;}catch(e){}})();`;

export const Route = createRootRouteWithContext<AuthContext>()({
	beforeLoad: async () => {
		return await getAuthContext();
	},
	head: () => ({
		meta: [
			{ charSet: 'utf-8' },
			{ name: 'viewport', content: 'width=device-width, initial-scale=1' },
			{ title: 'Frontpage — Your personalized front page for tech content' },
			{
				name: 'description',
				content:
					'A customizable RSS/Atom feed reader for developers, designers, and tech professionals.',
			},
		],
		links: [
			{
				rel: 'preload',
				href: interFontUrl,
				as: 'font',
				type: 'font/woff2',
				crossOrigin: 'anonymous',
			},
			{ rel: 'stylesheet', href: appCss },
		],
	}),
	shellComponent: RootDocument,
});

function RootDocument({ children }: { children: React.ReactNode }) {
	return (
		<html lang="en" suppressHydrationWarning>
			<head>
				{/* eslint-disable-next-line react/no-danger -- intentional: static theme init script, no user input */}
				<script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
				<HeadContent />
			</head>
			<body>
				<a
					href="#main-content"
					className="focus:bg-background focus:ring-ring sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-100 focus:rounded-md focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:shadow-md focus:ring-2"
				>
					Skip to main content
				</a>
				{children}
				{import.meta.env.DEV && (
					<Suspense fallback={null}>
						<TanStackDevtools
							config={{ position: 'bottom-right' }}
							plugins={[{ name: 'Tanstack Router', render: <TanStackRouterDevtoolsPanel /> }]}
						/>
					</Suspense>
				)}
				<Scripts />
			</body>
		</html>
	);
}
