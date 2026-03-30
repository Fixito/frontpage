import { useState } from 'react';
import { Link, createFileRoute, useNavigate, useSearch } from '@tanstack/react-router';
import { z } from 'zod';
import { AuthLayout } from '@/components/auth';
import { Button } from '@/components/ui/button';
import { ErrorAlert } from '@/components/ui/error-alert';
import { FormField } from '@/components/ui/form-field';
import { authClient } from '@/lib/auth-client';

const searchSchema = z.object({
	token: z.string().optional(),
});

export const Route = createFileRoute('/reset-password')({
	validateSearch: searchSchema,
	component: ResetPasswordPage,
});

function ResetPasswordPage() {
	const { token } = useSearch({ from: '/reset-password' });
	const navigate = useNavigate();
	const [error, setError] = useState('');
	const [loading, setLoading] = useState(false);
	const [done, setDone] = useState(false);

	async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault();
		setError('');
		setLoading(true);
		const form = e.currentTarget;
		const password = (form.elements.namedItem('password') as HTMLInputElement).value;
		const confirm = (form.elements.namedItem('confirm') as HTMLInputElement).value;
		if (password !== confirm) {
			setError('Passwords do not match');
			setLoading(false);
			return;
		}
		try {
			if (!token) throw new Error('Missing reset token. Please request a new link.');
			const result = await authClient.resetPassword({ newPassword: password, token });
			if (result.error) throw new Error(result.error.message ?? 'Password reset failed');
			setDone(true);
			setTimeout(() => {
				void navigate({ to: '/sign-in' });
			}, 2000);
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Password reset failed');
		} finally {
			setLoading(false);
		}
	}

	if (!token) {
		return (
			<AuthLayout title="Invalid link" subtitle="This reset link is invalid or has expired.">
				<p className="text-muted-foreground text-center text-sm">
					<Link to="/forgot-password">Request a new link</Link>
				</p>
			</AuthLayout>
		);
	}

	if (done) {
		return (
			<AuthLayout title="Password updated" subtitle="Your password has been reset successfully.">
				<p className="text-muted-foreground text-center text-sm">Redirecting to sign in…</p>
			</AuthLayout>
		);
	}

	return (
		<AuthLayout title="Reset password" subtitle="Choose a new password for your account.">
			<form onSubmit={handleSubmit} className="flex flex-col gap-4">
				{error && <ErrorAlert>{error}</ErrorAlert>}
				<FormField
					label="New password"
					name="password"
					type="password"
					autoComplete="new-password"
					required
				/>
				<FormField
					label="Confirm password"
					name="confirm"
					type="password"
					autoComplete="new-password"
					required
				/>
				<Button type="submit" disabled={loading} className="w-full">
					{loading ? 'Resetting…' : 'Reset password'}
				</Button>
			</form>
		</AuthLayout>
	);
}
