import { beforeEach, describe, expect, it, vi } from 'vitest';
import { withAuth, withMutation } from './server-fn-helpers';

const { getSession, getCookie } = vi.hoisted(() => ({
	getSession: vi.fn(),
	getCookie: vi.fn(),
}));

vi.mock('./auth', () => ({ auth: { api: { getSession } } }));
vi.mock('@tanstack/react-start/server', () => ({
	getRequest: () => new Request('http://localhost/_serverFn'),
	getCookie,
}));

const DEMO_USER_ID = 'demo-user';
const tomorrow = () => new Date(Date.now() + 86_400_000).toISOString();

function asGuest() {
	getSession.mockResolvedValue(null);
	getCookie.mockReturnValue(tomorrow());
}

function asUser(id: string) {
	getSession.mockResolvedValue({ user: { id } });
	getCookie.mockReturnValue(undefined);
}

beforeEach(() => {
	vi.stubEnv('GUEST_DEMO_USER_ID', DEMO_USER_ID);
	getSession.mockReset();
	getCookie.mockReset();
});

describe('withMutation', () => {
	it('rejects a Guest with Unauthorized and never runs the handler', async () => {
		asGuest();
		const handler = vi.fn<(userId: string, data: { feedId: string }) => Promise<void>>();

		await expect(withMutation(handler)({ data: { feedId: 'f1' } })).rejects.toThrow('Unauthorized');
		expect(handler).not.toHaveBeenCalled();
	});

	it('rejects an anonymous visitor with Unauthorized', async () => {
		getSession.mockResolvedValue(null);
		getCookie.mockReturnValue(undefined);
		const handler = vi.fn();

		await expect(withMutation(handler)()).rejects.toThrow('Unauthorized');
		expect(handler).not.toHaveBeenCalled();
	});

	it('runs the handler with the signed-in User id and payload', async () => {
		asUser('user-1');
		const handler = vi.fn((userId: string, data: { feedId: string }) =>
			Promise.resolve(`${userId}:${data.feedId}`),
		);

		await expect(withMutation(handler)({ data: { feedId: 'f1' } })).resolves.toBe('user-1:f1');
	});
});

describe('withAuth', () => {
	it('runs the handler as the shared demo user for a Guest', async () => {
		asGuest();
		const handler = vi.fn((userId: string) => Promise.resolve(userId));

		await expect(withAuth(handler)()).resolves.toBe(DEMO_USER_ID);
	});
});
