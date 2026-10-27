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
