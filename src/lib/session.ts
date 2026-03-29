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
	guestDemoUserId: string | null;
};

export const getAuthContext = createServerFn().handler(async (): Promise<AuthContext> => {
	const request = getRequest();
	const session = await auth.api.getSession({ headers: request.headers });
	const guestDemoUserId = process.env['GUEST_DEMO_USER_ID'] ?? null;
	if (session?.user) {
		return {
			user: { id: session.user.id, name: session.user.name, email: session.user.email },
			isGuest: false,
			guestDemoUserId,
		};
	}
	const isGuest = getCookie('frontpage-guest') === '1';
	return { user: null, isGuest, guestDemoUserId };
});

export const enterGuestMode = createServerFn({ method: 'POST' }).handler(() => {
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
