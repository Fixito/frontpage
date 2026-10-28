import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getWeeklyDigestFn } from './ai-service';

const { getSession, getCookie, select, generateWeeklyDigest } = vi.hoisted(() => ({
	getSession: vi.fn(),
	getCookie: vi.fn(),
	select: vi.fn(),
	generateWeeklyDigest: vi.fn(),
}));

// Exercise the registered server handler without Start's build-time transport transform.
vi.mock('@tanstack/react-start', () => ({
	createServerFn: () => {
		const builder = {
			validator: () => builder,
			handler: (handler: unknown) => handler,
		};
		return builder;
	},
}));
vi.mock('@tanstack/react-start/server', () => ({
	getRequest: () => new Request('http://localhost/_serverFn'),
	getCookie,
}));
vi.mock('./auth', () => ({ auth: { api: { getSession } } }));
vi.mock('./db', () => ({ db: { select } }));
vi.mock('./ai', () => ({
	generateWeeklyDigest,
	generateArticleSummary: vi.fn(),
	parseAiError: vi.fn(),
	suggestCategory: vi.fn(),
}));

beforeEach(() => {
	getSession.mockReset().mockResolvedValue({ user: { id: 'u1' } });
	getCookie.mockReset();
	select.mockReset().mockReturnValue({
		from: vi.fn().mockReturnThis(),
		innerJoin: vi.fn().mockReturnThis(),
		leftJoin: vi.fn().mockReturnThis(),
		where: vi.fn().mockReturnThis(),
		orderBy: vi.fn().mockReturnThis(),
		limit: vi.fn().mockResolvedValue([]),
	});
	generateWeeklyDigest.mockReset().mockResolvedValue('This week…');
});

describe('getWeeklyDigestFn', () => {
	it('returns a digest when the expected user matches the session', async () => {
		await expect(getWeeklyDigestFn({ data: { expectedUserId: 'u1' } })).resolves.toEqual({
			briefing: 'This week…',
			items: [],
		});
		expect(select).toHaveBeenCalledTimes(1);
		expect(generateWeeklyDigest).toHaveBeenCalledWith([]);
	});

	it('rejects a different session user before querying or generating a digest', async () => {
		getSession.mockResolvedValue({ user: { id: 'u2' } });

		await expect(getWeeklyDigestFn({ data: { expectedUserId: 'u1' } })).rejects.toThrow(
			'Unauthorized',
		);
		expect(select).not.toHaveBeenCalled();
		expect(generateWeeklyDigest).not.toHaveBeenCalled();
	});

	it.each([false, true])(
		'rejects a visitor without a session (guest cookie: %s)',
		async (guest) => {
			getSession.mockResolvedValue(null);
			getCookie.mockReturnValue(
				guest ? new Date(Date.now() + 86_400_000).toISOString() : undefined,
			);

			await expect(getWeeklyDigestFn({ data: { expectedUserId: 'u1' } })).rejects.toThrow(
				'Unauthorized',
			);
			expect(select).not.toHaveBeenCalled();
			expect(generateWeeklyDigest).not.toHaveBeenCalled();
		},
	);
});
