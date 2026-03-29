import { createRouter as createTanStackRouter } from '@tanstack/react-router';
import { routeTree } from './routeTree.gen';
import type { AuthContext } from './lib/session';

export function getRouter() {
	const router = createTanStackRouter({
		routeTree,
		context: { user: null, isGuest: false } satisfies AuthContext,
		scrollRestoration: true,
		defaultPreload: 'intent',
		defaultPreloadStaleTime: 0,
	});

	return router;
}

declare module '@tanstack/react-router' {
	interface Register {
		router: ReturnType<typeof getRouter>;
	}
}
