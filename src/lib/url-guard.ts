import { lookup } from 'node:dns/promises';
import { BlockList, isIP } from 'node:net';

// ── Types ──────────────────────────────────────────────────────────────────────

export class BlockedUrlError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'BlockedUrlError';
	}
}

/** Resolves a hostname to every IP address it points at. Injectable for tests. */
export type ResolveHost = (hostname: string) => Promise<ReadonlyArray<string>>;

// ── Address ranges ─────────────────────────────────────────────────────────────

// Separate lists: BlockList matches IPv4 against IPv4-mapped IPv6 rules, so a
// shared list would let `::/3` swallow every IPv4 address.
const NON_PUBLIC_V4 = new BlockList();
const NON_PUBLIC_V6 = new BlockList();

// IPv4 special-purpose ranges (RFC 6890 and friends)
const IPV4_RANGES: ReadonlyArray<[string, number]> = [
	['0.0.0.0', 8], // "this network"
	['10.0.0.0', 8], // private
	['100.64.0.0', 10], // carrier-grade NAT
	['127.0.0.0', 8], // loopback
	['169.254.0.0', 16], // link-local (cloud metadata)
	['172.16.0.0', 12], // private
	['192.0.0.0', 24], // IETF protocol assignments
	['192.0.2.0', 24], // TEST-NET-1
	['192.88.99.0', 24], // 6to4 relay anycast
	['192.168.0.0', 16], // private
	['198.18.0.0', 15], // benchmarking
	['198.51.100.0', 24], // TEST-NET-2
	['203.0.113.0', 24], // TEST-NET-3
	['224.0.0.0', 4], // multicast
	['240.0.0.0', 4], // reserved + broadcast
];

// IPv6: only global unicast (2000::/3) is public. Everything else (loopback,
// unspecified, IPv4-mapped, NAT64, unique-local, link-local, multicast) is
// blocked, plus the non-public carve-outs inside 2000::/3.
const IPV6_RANGES: ReadonlyArray<[string, number]> = [
	['::', 3],
	['4000::', 2],
	['8000::', 1],
	['2001::', 32], // Teredo (embeds an arbitrary IPv4)
	['2001:db8::', 32], // documentation
	['2002::', 16], // 6to4 (embeds an arbitrary IPv4)
];

for (const [network, prefix] of IPV4_RANGES) NON_PUBLIC_V4.addSubnet(network, prefix, 'ipv4');
for (const [network, prefix] of IPV6_RANGES) NON_PUBLIC_V6.addSubnet(network, prefix, 'ipv6');

function isPublicIp(address: string): boolean {
	switch (isIP(address)) {
		case 4:
			return !NON_PUBLIC_V4.check(address, 'ipv4');
		case 6:
			return !NON_PUBLIC_V6.check(address, 'ipv6');
		default:
			return false;
	}
}

// ── Guard ──────────────────────────────────────────────────────────────────────

const resolveWithDns: ResolveHost = async (hostname) => {
	const records = await lookup(hostname, { all: true, verbatim: true });
	return records.map((record) => record.address);
};

const PRIVATE_ADDRESS_MESSAGE =
	'This URL points to a private or local network address, which Frontpage can’t fetch.';

/**
 * Throws `BlockedUrlError` unless `rawUrl` is http(s) and its host — an IP
 * literal, or every address the hostname resolves to — is publicly routable.
 */
export async function assertPublicUrl(
	rawUrl: string,
	resolveHost: ResolveHost = resolveWithDns,
): Promise<URL> {
	let url: URL;
	try {
		url = new URL(rawUrl);
	} catch {
		throw new BlockedUrlError('That isn’t a valid URL.');
	}
	if (url.protocol !== 'http:' && url.protocol !== 'https:') {
		throw new BlockedUrlError('Only http:// and https:// feed URLs are supported.');
	}

	// IPv6 literals come back bracketed from the URL parser
	const host = url.hostname.replace(/^\[(.*)\]$/, '$1');
	const addresses = isIP(host) ? [host] : await resolveHost(host);
	if (addresses.length === 0) {
		throw new BlockedUrlError(`Couldn’t resolve ${host}.`);
	}
	if (!addresses.every(isPublicIp)) {
		throw new BlockedUrlError(PRIVATE_ADDRESS_MESSAGE);
	}
	return url;
}
