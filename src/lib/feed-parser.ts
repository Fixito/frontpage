import { XMLParser } from 'fast-xml-parser';

const xmlParser = new XMLParser({
	ignoreAttributes: false,
	attributeNamePrefix: '@_',
	processEntities: { enabled: true, maxTotalExpansions: 50_000 },
	htmlEntities: true,
	allowBooleanAttributes: true,
	trimValues: true,
	cdataPropName: '#cdata',
	parseAttributeValue: false,
});

// ── Public types ───────────────────────────────────────────────────────────────

export interface ParsedFeedItem {
	guid: string;
	url: string;
	title: string;
	description: string | null;
	contentHtml: string | null;
	author: string | null;
	publishedAt: Date | null;
}

export interface ParsedFeed {
	title: string;
	description: string | null;
	siteUrl: string | null;
	items: Array<ParsedFeedItem>;
	format: 'rss2' | 'atom' | 'rss1' | 'unknown';
}

export class FeedParseError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'FeedParseError';
	}
}

// ── Internal helpers ───────────────────────────────────────────────────────────

type XmlNode = Record<string, unknown>;

function getText(value: unknown): string | null {
	if (value === null || value === undefined) return null;
	if (typeof value === 'string') return value.trim() || null;
	if (typeof value === 'number') return String(value);
	if (typeof value === 'object') {
		const v = value as XmlNode;
		if (typeof v['#cdata'] === 'string') return v['#cdata'].trim() || null;
		if (typeof v['#text'] === 'string') return v['#text'].trim() || null;
	}
	return null;
}

function getAtomLink(linkValue: unknown): string | null {
	if (!linkValue) return null;
	if (typeof linkValue === 'string') return linkValue;
	if (Array.isArray(linkValue)) {
		const entries = linkValue as Array<XmlNode>;
		const alternate = entries.find((l) => !l['@_rel'] || l['@_rel'] === 'alternate');
		return (alternate?.['@_href'] ?? null) as string | null;
	}
	if (typeof linkValue === 'object') {
		return ((linkValue as XmlNode)['@_href'] ?? null) as string | null;
	}
	return null;
}

function parseDate(value: unknown): Date | null {
	if (!value) return null;
	const str =
		typeof value === 'string' ? value.trim() : typeof value === 'number' ? String(value) : null;
	if (!str) return null;
	const d = new Date(str);
	return isNaN(d.getTime()) ? null : d;
}

function toArray<T>(value: T | Array<T> | undefined | null): Array<T> {
	if (value == null) return [];
	return Array.isArray(value) ? value : [value];
}

function extractRssGuid(item: XmlNode): string | null {
	const guid = item['guid'];
	if (typeof guid === 'string') return guid.trim() || null;
	if (typeof guid === 'object' && guid !== null) {
		const g = guid as XmlNode;
		if (typeof g['#text'] === 'string') return g['#text'].trim() || null;
	}
	return null;
}

/** cyrb53: a fast, well-distributed 53-bit string hash. Not cryptographic. */
function hash53(str: string): string {
	let h1 = 0xdeadbeef;
	let h2 = 0x41c6ce57;
	for (let i = 0; i < str.length; i++) {
		const ch = str.charCodeAt(i);
		h1 = Math.imul(h1 ^ ch, 2654435761);
		h2 = Math.imul(h2 ^ ch, 1597334677);
	}
	h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
	h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
	return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
}

/**
 * A Feed Item's identity within its Feed: the guid the Feed declares, else its
 * link, else a hash of its title and published date. Never time-dependent, so
 * re-ingesting the same document yields the same identities.
 */
function itemIdentity(
	declaredGuid: string | null,
	url: string,
	title: string,
	publishedAt: Date | null,
): string {
	if (declaredGuid) return declaredGuid;
	if (url) return url;
	return `content:${hash53(`${title}\n${publishedAt?.toISOString() ?? ''}`)}`;
}

function extractRssAuthor(item: XmlNode): string | null {
	return getText(item['author']) ?? getText(item['dc:creator']) ?? null;
}

// ── RSS 2.0 ────────────────────────────────────────────────────────────────────

function parseRss2(channel: XmlNode): ParsedFeed {
	const title = getText(channel['title']) ?? 'Untitled Feed';
	const description = getText(channel['description']);
	const siteUrl = getText(channel['link']);

	const items: Array<ParsedFeedItem> = toArray(channel['item']).map((raw) => {
		const item = raw as XmlNode;
		const url = getText(item['link']) ?? '';
		const itemTitle = getText(item['title']) ?? 'Untitled';
		const publishedAt = parseDate(item['pubDate']) ?? parseDate(item['dc:date']);
		const itemDescription = getText(item['description']);
		const contentHtml =
			getText(item['content:encoded']) ??
			getText(item['encoded']) ??
			(itemDescription?.includes('<') ? itemDescription : null);

		return {
			guid: itemIdentity(extractRssGuid(item), url, itemTitle, publishedAt),
			url,
			title: itemTitle,
			description: itemDescription,
			contentHtml,
			author: extractRssAuthor(item),
			publishedAt,
		};
	});

	return { title, description, siteUrl, items, format: 'rss2' };
}

// ── Atom 1.0 ───────────────────────────────────────────────────────────────────

function parseAtom(feedNode: XmlNode): ParsedFeed {
	const title = getText(feedNode['title']) ?? 'Untitled Feed';
	const description = getText(feedNode['subtitle']);
	const siteUrl = getAtomLink(feedNode['link']);

	const items: Array<ParsedFeedItem> = toArray(feedNode['entry']).map((raw) => {
		const entry = raw as XmlNode;
		const url = getAtomLink(entry['link']) ?? '';
		const itemTitle = getText(entry['title']) ?? 'Untitled';
		const publishedAt = parseDate(entry['published']) ?? parseDate(entry['updated']);

		// Fall back to <summary> when <content> is absent (e.g. xkcd)
		const contentNode = entry['content'] ?? entry['summary'];
		const contentText = getText(contentNode);
		const contentType =
			typeof contentNode === 'object' && contentNode !== null
				? ((contentNode as XmlNode)['@_type'] as string | undefined)
				: undefined;
		const isHtml =
			contentType === 'html' ||
			contentType === 'xhtml' ||
			(!contentType && contentText !== null && contentText.includes('<'));

		// Fall back to feed-level <author> when entry has none (e.g. xkcd)
		const authorNode = entry['author'] ?? feedNode['author'];
		const author = getText(
			typeof authorNode === 'object' && authorNode !== null
				? (authorNode as XmlNode)['name']
				: authorNode,
		);

		return {
			guid: itemIdentity(getText(entry['id']), url, itemTitle, publishedAt),
			url,
			title: itemTitle,
			description: getText(entry['summary']),
			contentHtml: isHtml ? contentText : null,
			author,
			publishedAt,
		};
	});

	return { title, description, siteUrl, items, format: 'atom' };
}

// ── RSS 1.0 / RDF ──────────────────────────────────────────────────────────────

function parseRss1(rdf: XmlNode): ParsedFeed {
	const channel = (rdf['channel'] ?? rdf['rss:channel']) as XmlNode | undefined;
	const title = getText(channel?.['title']) ?? getText(channel?.['rss:title']) ?? 'Untitled Feed';
	const description =
		getText(channel?.['description']) ?? getText(channel?.['rss:description']) ?? null;
	const siteUrl = getText(channel?.['link']) ?? getText(channel?.['rss:link']) ?? null;

	const rawItems = rdf['item'] ?? rdf['rss:item'];
	const items: Array<ParsedFeedItem> = toArray(rawItems).map((raw) => {
		const item = raw as XmlNode;
		const url = getText(item['link']) ?? getText(item['rss:link']) ?? '';
		const itemTitle = getText(item['title']) ?? getText(item['rss:title']) ?? 'Untitled';
		const publishedAt = parseDate(item['dc:date']) ?? parseDate(item['pubDate']);

		return {
			guid: itemIdentity(getText(item['dc:identifier']), url, itemTitle, publishedAt),
			url,
			title: itemTitle,
			description: getText(item['description']) ?? getText(item['rss:description']),
			contentHtml: getText(item['content:encoded']),
			author: getText(item['dc:creator']),
			publishedAt,
		};
	});

	return { title, description, siteUrl, items, format: 'rss1' };
}

// ── Public API ─────────────────────────────────────────────────────────────────

export function parseFeed(xml: string): ParsedFeed {
	let parsed: XmlNode;
	try {
		parsed = xmlParser.parse(xml) as XmlNode;
	} catch (err) {
		throw new FeedParseError(
			`XML parse error: ${err instanceof Error ? err.message : String(err)}`,
		);
	}

	if (parsed['rss']) {
		const rss = parsed['rss'] as XmlNode;
		const channel = rss['channel'] as XmlNode | undefined;
		if (!channel) throw new FeedParseError('RSS feed is missing <channel>');
		return parseRss2(channel);
	}

	if (parsed['feed']) {
		return parseAtom(parsed['feed'] as XmlNode);
	}

	const rdfKey = Object.keys(parsed).find((k) => k === 'rdf:RDF' || k === 'RDF');
	if (rdfKey) {
		return parseRss1(parsed[rdfKey] as XmlNode);
	}

	throw new FeedParseError('Unrecognized feed format — expected RSS 2.0, Atom 1.0, or RSS 1.0/RDF');
}
