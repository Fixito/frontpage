import { HeadContent, Scripts, createRootRoute } from '@tanstack/react-router';
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools';
import { TanStackDevtools } from '@tanstack/react-devtools';

import appCss from '../styles.css?url';

// Inline script to apply theme before first paint (no flash)
const THEME_INIT_SCRIPT = `(function(){try{var stored=localStorage.getItem('theme');var prefersDark=matchMedia('(prefers-color-scheme: dark)').matches;var resolved=stored==='dark'||(!stored&&prefersDark)?'dark':'light';document.documentElement.setAttribute('data-theme',resolved);document.documentElement.style.colorScheme=resolved;}catch(e){}})();`;

export const Route = createRootRoute({
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
		links: [{ rel: 'stylesheet', href: appCss }],
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
				{children}
				<TanStackDevtools
					config={{ position: 'bottom-right' }}
					plugins={[{ name: 'Tanstack Router', render: <TanStackRouterDevtoolsPanel /> }]}
				/>
				<Scripts />
			</body>
		</html>
	);
}
