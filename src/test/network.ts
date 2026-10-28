/**
 * A fake network for Feed Ingestion tests: fetch options whose `fetch` answers
 * every request with `respond`, whose DNS resolves every host to a public
 * address, and whose retries don't wait.
 */
import type { FetchFeedOptions } from '@/lib/feed-fetcher';

/** Fetch options whose network answers every request with `respond`. */
export function network(respond: (url: string, init?: RequestInit) => Promise<Response>) {
	const calls: Array<string> = [];
	const options: FetchFeedOptions = {
		fetch: (input, init) => {
			const url = input instanceof Request ? input.url : String(input);
			calls.push(url);
			return respond(url, init);
		},
		resolveHost: () => Promise.resolve(['93.184.215.14']),
		retryDelaysMs: [0, 0, 0],
	};
	return { options, calls };
}

/** A network that serves `xml` at every URL. */
export function serving(xml: string) {
	return network(() => Promise.resolve(new Response(xml, { status: 200 })));
}
