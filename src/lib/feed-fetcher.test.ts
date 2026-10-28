import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchFeed } from './feed-fetcher';
import { BlockedUrlError } from './url-guard';
import type { ResolveHost } from './url-guard';

const RSS = '<rss version="2.0"><channel><title>Blog</title></channel></rss>';

const publicDns: ResolveHost = () => Promise.resolve(['93.184.215.14']);

function redirectTo(location: string): Response {
	return new Response(null, { status: 302, headers: { location } });
}

function stubFetch(...responses: Array<Response>) {
	const fetchMock = vi.fn<typeof fetch>();
	for (const response of responses) fetchMock.mockResolvedValueOnce(response);
	vi.stubGlobal('fetch', fetchMock);
	return fetchMock;
}

afterEach(() => {
	vi.unstubAllGlobals();
});

describe('fetchFeed', () => {
	it('fetches a public feed', async () => {
		stubFetch(new Response(RSS, { status: 200 }));

		const result = await fetchFeed('https://blog.example/feed', { resolveHost: publicDns });

		expect(result.xml).toBe(RSS);
		expect(result.finalUrl).toBe('https://blog.example/feed');
		expect(result.wasRedirected).toBe(false);
	});

	it('rejects a private URL without fetching or retrying', async () => {
		const fetchMock = stubFetch();

		await expect(fetchFeed('http://127.0.0.1/feed')).rejects.toThrow(BlockedUrlError);
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it('follows a redirect between public hosts', async () => {
		const fetchMock = stubFetch(redirectTo('/new-feed.xml'), new Response(RSS, { status: 200 }));

		const result = await fetchFeed('https://blog.example/feed', { resolveHost: publicDns });

		expect(fetchMock).toHaveBeenCalledTimes(2);
		expect(fetchMock.mock.calls[1]?.[0]).toBe('https://blog.example/new-feed.xml');
		expect(result.finalUrl).toBe('https://blog.example/new-feed.xml');
		expect(result.wasRedirected).toBe(true);
	});

	it('rejects a public host that redirects to a private address', async () => {
		const fetchMock = stubFetch(redirectTo('http://169.254.169.254/latest/meta-data'));

		await expect(
			fetchFeed('https://blog.example/feed', { resolveHost: publicDns }),
		).rejects.toThrow(BlockedUrlError);
		expect(fetchMock).toHaveBeenCalledTimes(1);
	});

	it('rejects a redirect to a hostname that resolves privately', async () => {
		stubFetch(redirectTo('http://intranet.example/feed'));
		const dns: ResolveHost = (host) =>
			Promise.resolve(host === 'intranet.example' ? ['192.168.1.1'] : ['93.184.215.14']);

		await expect(fetchFeed('https://blog.example/feed', { resolveHost: dns })).rejects.toThrow(
			BlockedUrlError,
		);
	});
});
