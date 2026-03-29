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

export async function fetchFeed(
	url: string,
	options: FetchFeedOptions = {},
): Promise<FetchFeedResult> {
	const { timeoutMs = 10_000 } = options;

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
