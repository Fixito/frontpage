import { BlockedUrlError, assertPublicUrl } from './url-guard';
import type { ResolveHost } from './url-guard';

// ── Types ──────────────────────────────────────────────────────────────────────

export interface FetchFeedResult {
	xml: string;
	finalUrl: string;
	wasRedirected: boolean;
	etag: string | null;
	lastModified: string | null;
}

export interface FetchFeedOptions {
	timeoutMs?: number;
	/** DNS resolver used by the private-network guard. Injectable for tests. */
	resolveHost?: ResolveHost;
}

export class FeedFetchError extends Error {
	constructor(
		message: string,
		public readonly status?: number,
	) {
		super(message);
		this.name = 'FeedFetchError';
	}
}

export class FeedNotModifiedError extends Error {
	constructor() {
		super('Feed not modified');
		this.name = 'FeedNotModifiedError';
	}
}

// ── Fetcher ────────────────────────────────────────────────────────────────────

const RETRY_DELAYS_MS = [0, 1_000, 3_000];
const MAX_REDIRECTS = 5;

function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

async function attemptFetch(
	url: string,
	timeoutMs: number,
	resolveHost: ResolveHost | undefined,
): Promise<FetchFeedResult> {
	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), timeoutMs);

	const headers: Record<string, string> = {
		'User-Agent': 'Frontpage/1.0 (+https://github.com/frontpage)',
		Accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml, */*',
	};

	// Redirects are followed by hand so every hop goes through the private-network guard.
	let currentUrl = url;
	let response: Response;
	try {
		for (let hop = 0; ; hop++) {
			await assertPublicUrl(currentUrl, resolveHost);
			response = await fetch(currentUrl, {
				headers,
				signal: controller.signal,
				redirect: 'manual',
			});

			const location = response.headers.get('location');
			if (response.status < 300 || response.status >= 400 || !location) break;
			if (hop >= MAX_REDIRECTS) throw new FeedFetchError('Too many redirects');
			await response.body?.cancel();
			currentUrl = new URL(location, currentUrl).href;
		}
	} catch (err) {
		if (err instanceof BlockedUrlError || err instanceof FeedFetchError) throw err;
		if (err instanceof Error && err.name === 'AbortError') {
			throw new FeedFetchError(`Request timed out after ${timeoutMs / 1000}s`);
		}
		throw new FeedFetchError(`Network error: ${err instanceof Error ? err.message : String(err)}`);
	} finally {
		clearTimeout(timer);
	}

	if (response.status === 304) throw new FeedNotModifiedError();

	if (!response.ok) {
		throw new FeedFetchError(`HTTP ${response.status} ${response.statusText}`, response.status);
	}

	const xml = await response.text();
	if (!xml.trim()) {
		throw new FeedFetchError('Feed returned an empty response');
	}

	return {
		xml,
		finalUrl: currentUrl,
		wasRedirected: currentUrl !== url,
		etag: response.headers.get('etag'),
		lastModified: response.headers.get('last-modified'),
	};
}

export async function fetchFeed(
	url: string,
	options: FetchFeedOptions = {},
): Promise<FetchFeedResult> {
	const { timeoutMs = 10_000, resolveHost } = options;
	let lastError: unknown;

	for (const delay of RETRY_DELAYS_MS) {
		if (delay > 0) await sleep(delay);

		try {
			return await attemptFetch(url, timeoutMs, resolveHost);
		} catch (err) {
			// Never retry on 304 (not modified), blocked URLs or timeouts
			if (err instanceof FeedNotModifiedError) throw err;
			if (err instanceof BlockedUrlError) throw err;
			if (err instanceof FeedFetchError && err.name === 'AbortError') throw err;

			// Never retry on 4xx HTTP errors
			if (
				err instanceof FeedFetchError &&
				err.status !== undefined &&
				err.status >= 400 &&
				err.status < 500
			) {
				throw err;
			}

			lastError = err;
			// Retry on network errors and 5xx
		}
	}

	throw lastError;
}
