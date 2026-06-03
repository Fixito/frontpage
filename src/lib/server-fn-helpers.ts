import { getCookie, getRequest } from '@tanstack/react-start/server';
import { auth } from './auth';

async function resolveUserId(allowGuest: boolean): Promise<string> {
	const request = getRequest();
	const session = await auth.api.getSession({ headers: request.headers });

	if (session?.user) return session.user.id;

	if (allowGuest) {
		const rawCookie = getCookie('frontpage-guest');
		if (rawCookie) {
			const expiresAt = new Date(rawCookie);
			const demoUserId = process.env['GUEST_DEMO_USER_ID'];
			if (demoUserId && !isNaN(expiresAt.getTime()) && expiresAt > new Date()) {
				return demoUserId;
			}
		}
	}

	throw new Error('Unauthorized');
}

// HOF for reads — guests allowed
export function withAuth<TResult>(fn: (userId: string) => Promise<TResult>): () => Promise<TResult>;
export function withAuth<TData, TResult>(
	fn: (userId: string, data: TData) => Promise<TResult>,
): (ctx: { data: TData }) => Promise<TResult>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function withAuth(fn: any): any {
	return async (ctx?: { data: unknown }) => {
		const userId = await resolveUserId(true);
		return fn(userId, ctx?.data);
	};
}

// HOF for mutations — guests blocked
export function withMutation<TResult>(
	fn: (userId: string) => Promise<TResult>,
): () => Promise<TResult>;
export function withMutation<TData, TResult>(
	fn: (userId: string, data: TData) => Promise<TResult>,
): (ctx: { data: TData }) => Promise<TResult>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function withMutation(fn: any): any {
	return async (ctx?: { data: unknown }) => {
		const userId = await resolveUserId(false);
		return fn(userId, ctx?.data);
	};
}
