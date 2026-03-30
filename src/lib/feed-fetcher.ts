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

function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

async function attemptFetch(url: string, timeoutMs: number): Promise<FetchFeedResult> {
	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), timeoutMs);

	const headers: Record<string, string> = {
		'User-Agent': 'Frontpage/1.0 (+https://github.com/frontpage)',
		Accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml, */*',
	};

	let response: Response;
	try {
		response = await fetch(url, {
			headers,
			signal: controller.signal,
			redirect: 'follow',
		});
	} catch (err) {
		clearTimeout(timer);
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

	const finalUrl = response.url || url;

	return {
		xml,
		finalUrl,
		wasRedirected: finalUrl !== url,
		etag: response.headers.get('etag'),
		lastModified: response.headers.get('last-modified'),
	};
}

export async function fetchFeed(
	url: string,
	options: FetchFeedOptions = {},
): Promise<FetchFeedResult> {
	const { timeoutMs = 10_000 } = options;
	let lastError: unknown;

	for (const delay of RETRY_DELAYS_MS) {
		if (delay > 0) await sleep(delay);

		try {
			return await attemptFetch(url, timeoutMs);
		} catch (err) {
			// Never retry on 304 (not modified) or timeouts
			if (err instanceof FeedNotModifiedError) throw err;
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
