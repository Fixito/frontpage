import { createServerFn } from '@tanstack/react-start';
import { getCookie, getRequest, setCookie } from '@tanstack/react-start/server';
import { auth } from './auth';

export type AuthUser = {
	id: string;
	name: string;
	email: string;
};

export type AuthContext = {
	user: AuthUser | null;
	isGuest: boolean;
};

export const getAuthContext = createServerFn().handler(async (): Promise<AuthContext> => {
	const request = getRequest();
	const session = await auth.api.getSession({ headers: request.headers });
	if (session?.user) {
		return {
			user: { id: session.user.id, name: session.user.name, email: session.user.email },
			isGuest: false,
		};
	}
	const isGuest = getCookie('frontpage-guest') === '1';
	return { user: null, isGuest };
});

export const enterGuestMode = createServerFn({ method: 'POST' }).handler(async () => {
	// Sign out any authenticated user first so their identity doesn't bleed into guest mode.
	const request = getRequest();
	const session = await auth.api.getSession({ headers: request.headers });
	if (session) {
		await auth.api.signOut({ headers: request.headers });
	}
	setCookie('frontpage-guest', '1', {
		httpOnly: true,
		sameSite: 'lax',
		path: '/',
		maxAge: 60 * 60 * 24, // 1 day
		secure: process.env['NODE_ENV'] === 'production',
	});
});

export const exitGuestMode = createServerFn({ method: 'POST' }).handler(() => {
	setCookie('frontpage-guest', '', { maxAge: 0, path: '/' });
});
