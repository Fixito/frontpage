import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';

import { db } from './db';
import * as schema from '@/db/schema';

async function sendPasswordResetEmail(email: string, url: string): Promise<void> {
	const apiKey = process.env['RESEND_API_KEY'];
	const from = process.env['RESEND_FROM_EMAIL'] ?? 'noreply@frontpage.app';
	if (!apiKey) {
		// Dev fallback: log the URL
		console.log(`[Auth] Password reset URL for ${email}: ${url}`);
		return;
	}

	const { Resend } = await import('resend');
	const resend = new Resend(apiKey);
	const { error } = await resend.emails.send({
		from,
		to: email,
		subject: 'Reset your Frontpage password',
		html: `<p>Click the link below to reset your password. It expires in 1 hour.</p><p><a href="${url}">${url}</a></p>`,
	});

	if (error) {
		console.error('[Auth] Failed to send password reset email:', error);
		throw new Error(`Email delivery failed: ${error.message}`);
	}
}

export const auth = betterAuth({
	database: drizzleAdapter(db, {
		provider: 'pg',
		schema: {
			user: schema.user,
			session: schema.session,
			account: schema.account,
			verification: schema.verification,
		},
	}),
	emailAndPassword: {
		enabled: true,
		requireEmailVerification: false,
		sendResetPassword: async ({ user, url }) => {
			await sendPasswordResetEmail(user.email, url);
		},
	},
	session: {
		cookieCache: {
			enabled: true,
			maxAge: 60 * 60 * 24 * 7,
		},
	},
	trustedOrigins: process.env['BETTER_AUTH_TRUSTED_ORIGINS']?.split(',') ?? [],
});

export type Auth = typeof auth;
