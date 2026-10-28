import { describe, expect, it } from 'vitest';
import { BlockedUrlError, assertPublicUrl } from './url-guard';

describe('assertPublicUrl', () => {
	it('rejects URLs that are not http(s)', async () => {
		await expect(assertPublicUrl('file:///etc/passwd')).rejects.toThrow(BlockedUrlError);
	});

	it.each([
		'http://127.0.0.1/feed',
		'http://10.0.0.1/feed',
		'http://172.16.5.4/feed',
		'http://192.168.1.1/feed',
		'http://169.254.169.254/latest/meta-data',
		'http://100.64.0.1/feed',
		'http://0.0.0.0/feed',
		'http://224.0.0.1/feed',
		'http://[::1]/feed',
		'http://[::]/feed',
		'http://[fe80::1]/feed',
		'http://[fd00::1]/feed',
		'http://[ff02::1]/feed',
		'http://[::ffff:127.0.0.1]/feed',
		'http://[::ffff:a9fe:a9fe]/feed',
		'http://[64:ff9b::a00:1]/feed',
		'http://[2001:db8::1]/feed',
		'http://[2002:7f00:1::]/feed',
	])('rejects non-public IP literal %s', async (url) => {
		await expect(assertPublicUrl(url)).rejects.toThrow(BlockedUrlError);
	});

	it.each(['http://93.184.215.14/feed', 'https://[2606:4700::1111]/feed'])(
		'accepts public IP literal %s',
		async (url) => {
			await expect(assertPublicUrl(url)).resolves.toBeInstanceOf(URL);
		},
	);

	// Last address inside each blocked CIDR vs. the first one just outside it
	describe('range boundaries', () => {
		it.each([
			'0.255.255.255', // 0.0.0.0/8
			'10.255.255.255', // 10.0.0.0/8
			'100.64.0.0', // 100.64.0.0/10
			'100.127.255.255',
			'127.255.255.255', // 127.0.0.0/8
			'169.254.255.255', // 169.254.0.0/16
			'172.16.0.0', // 172.16.0.0/12
			'172.31.255.255',
			'192.168.255.255', // 192.168.0.0/16
			'198.19.255.255', // 198.18.0.0/15
			'224.0.0.0', // 224.0.0.0/4 + 240.0.0.0/4
			'255.255.255.255',
		])('rejects IPv4 %s', async (ip) => {
			await expect(assertPublicUrl(`http://${ip}/feed`)).rejects.toThrow(BlockedUrlError);
		});

		it.each([
			'1.0.0.0',
			'9.255.255.255',
			'11.0.0.0',
			'100.63.255.255',
			'100.128.0.0',
			'126.255.255.255',
			'128.0.0.1',
			'169.253.255.255',
			'169.255.0.0',
			'172.15.255.255',
			'172.32.0.0',
			'192.167.255.255',
			'192.169.0.0',
			'198.17.255.255',
			'198.20.0.0',
			'223.255.255.255',
		])('accepts IPv4 %s', async (ip) => {
			await expect(assertPublicUrl(`http://${ip}/feed`)).resolves.toBeInstanceOf(URL);
		});

		it.each([
			'1fff:ffff:ffff:ffff:ffff:ffff:ffff:ffff', // below 2000::/3
			'2001:0:ffff:ffff:ffff:ffff:ffff:ffff', // 2001::/32 (Teredo)
			'2001:db8:ffff:ffff:ffff:ffff:ffff:ffff', // 2001:db8::/32
			'2002:ffff:ffff:ffff:ffff:ffff:ffff:ffff', // 2002::/16 (6to4)
			'3fff:fff:ffff:ffff:ffff:ffff:ffff:ffff', // 3fff::/20 (documentation)
			'4000::', // above 2000::/3
		])('rejects IPv6 %s', async (ip) => {
			await expect(assertPublicUrl(`http://[${ip}]/feed`)).rejects.toThrow(BlockedUrlError);
		});

		it.each([
			'2000::1',
			'2001:db7:ffff:ffff:ffff:ffff:ffff:ffff',
			'2001:db9::',
			'2003::',
			'3fff:1000::',
		])('accepts IPv6 %s', async (ip) => {
			await expect(assertPublicUrl(`http://[${ip}]/feed`)).resolves.toBeInstanceOf(URL);
		});
	});

	describe('hostnames', () => {
		const resolveTo =
			(...addresses: Array<string>) =>
			() =>
				Promise.resolve(addresses);

		it('rejects localhost via its resolved address', async () => {
			await expect(
				assertPublicUrl('http://localhost:3000/feed', resolveTo('127.0.0.1', '::1')),
			).rejects.toThrow(BlockedUrlError);
		});

		it('rejects a hostname when any resolved address is non-public', async () => {
			await expect(
				assertPublicUrl('https://sneaky.example/feed', resolveTo('93.184.215.14', '10.0.0.5')),
			).rejects.toThrow(BlockedUrlError);
		});

		it('accepts a hostname whose addresses are all public', async () => {
			const url = await assertPublicUrl(
				'https://blog.example/feed.xml',
				resolveTo('93.184.215.14', '2606:4700::1111'),
			);
			expect(url.href).toBe('https://blog.example/feed.xml');
		});

		it('passes the bare hostname to the resolver', async () => {
			const seen: Array<string> = [];
			await assertPublicUrl('https://user:pw@blog.example:8443/feed', (host) => {
				seen.push(host);
				return Promise.resolve(['93.184.215.14']);
			});
			expect(seen).toEqual(['blog.example']);
		});

		it('rejects a hostname that resolves to nothing', async () => {
			await expect(assertPublicUrl('https://void.example/feed', resolveTo())).rejects.toThrow(
				BlockedUrlError,
			);
		});
	});
});
