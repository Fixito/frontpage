// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DigestView } from './digest-view';
import type { DigestItem } from '@/lib/ai-service';

const { getWeeklyDigestFn } = vi.hoisted(() => ({ getWeeklyDigestFn: vi.fn() }));

vi.mock('@/lib/ai-service', () => ({ getWeeklyDigestFn }));

const item: DigestItem = {
	id: 'a',
	title: 'An unread article',
	url: 'https://example.com/a',
	description: null,
	aiSummary: null,
	feedTitle: 'Feed',
	publishedAt: null,
};

function renderDigest(userId: string | null, queryClient = new QueryClient()) {
	return render(
		<QueryClientProvider client={queryClient}>
			<DigestView userId={userId} />
		</QueryClientProvider>,
	);
}

beforeEach(() => {
	getWeeklyDigestFn.mockReset().mockResolvedValue({ briefing: 'This week…', items: [item] });
});

afterEach(cleanup);

describe('DigestView', () => {
	it('asks a signed-out visitor to sign in and generates nothing', () => {
		renderDigest(null);

		expect(screen.getByText('Sign in to view your weekly digest.')).toBeTruthy();
		expect(getWeeklyDigestFn).not.toHaveBeenCalled();
	});

	it('shows the briefing and the unread articles', async () => {
		renderDigest('u1');

		expect(await screen.findByText('This week…')).toBeTruthy();
		expect(screen.getByRole('link', { name: 'An unread article' })).toBeTruthy();
	});

	it('shows an error, then the digest after Try again', async () => {
		getWeeklyDigestFn.mockRejectedValueOnce(new Error('boom'));
		renderDigest('u1');

		fireEvent.click(await screen.findByRole('button', { name: 'Try again' }));

		expect(await screen.findByText('This week…')).toBeTruthy();
	});

	it('shows the previous digest again without generating a new one when reopened', async () => {
		const queryClient = new QueryClient();
		const first = renderDigest('u1', queryClient);
		await screen.findByText('This week…');
		first.unmount();

		renderDigest('u1', queryClient);

		expect(screen.getByText('This week…')).toBeTruthy();
		expect(getWeeklyDigestFn).toHaveBeenCalledTimes(1);
	});
});
