import { createServerFn } from '@tanstack/react-start';
import { getCookie, getRequest, setCookie } from '@tanstack/react-start/server';
import { auth } from './auth';

export type AuthUser = {
	id: string;
	name: string;
	email: string;
};

export type GuestSession = {
	demoUserId: string;
	expiresAt: Date;
};

export type AuthContext = {
	user: AuthUser | null;
	guest: GuestSession | null;
};

export const getAuthContext = createServerFn().handler(async (): Promise<AuthContext> => {
	const request = getRequest();
	const session = await auth.api.getSession({ headers: request.headers });
	if (session?.user) {
		return {
			user: { id: session.user.id, name: session.user.name, email: session.user.email },
			guest: null,
		};
	}
	const rawCookie = getCookie('frontpage-guest');
	if (rawCookie) {
		const expiresAt = new Date(rawCookie);
		const demoUserId = process.env['GUEST_DEMO_USER_ID'];
		if (demoUserId && !isNaN(expiresAt.getTime()) && expiresAt > new Date()) {
			return { user: null, guest: { demoUserId, expiresAt } };
		}
	}
	return { user: null, guest: null };
});

export const enterGuestMode = createServerFn({ method: 'POST' }).handler(
	(): { expiresAt: string; available: boolean } => {
		if (!process.env['GUEST_DEMO_USER_ID']) {
			return { expiresAt: '', available: false };
		}
		const expiresAt = new Date(Date.now() + 60 * 60 * 24 * 1000);
		setCookie('frontpage-guest', expiresAt.toISOString(), {
			httpOnly: true,
			sameSite: 'lax',
			path: '/',
			maxAge: 60 * 60 * 24,
			secure: process.env['NODE_ENV'] === 'production',
		});
		return { expiresAt: expiresAt.toISOString(), available: true };
	},
);

export const exitGuestMode = createServerFn({ method: 'POST' }).handler(() => {
	setCookie('frontpage-guest', '', { maxAge: 0, path: '/' });
});
