import { useState } from 'react';
import { Link, createFileRoute } from '@tanstack/react-router';
import { AuthLayout } from '@/components/auth';
import { Button } from '@/components/ui/button';
import { ErrorAlert } from '@/components/ui/error-alert';
import { FormField } from '@/components/ui/form-field';
import { authClient } from '@/lib/auth-client';

export const Route = createFileRoute('/forgot-password')({
	component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
	const [error, setError] = useState('');
	const [loading, setLoading] = useState(false);
	const [sent, setSent] = useState(false);

	async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault();
		setError('');
		setLoading(true);
		const form = e.currentTarget;
		const email = (form.elements.namedItem('email') as HTMLInputElement).value;
		try {
			const result = await authClient.requestPasswordReset({
				email,
				redirectTo: '/reset-password',
			});
			if (result.error) throw new Error(result.error.message ?? 'Failed to send reset email');
			setSent(true);
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Failed to send reset email');
		} finally {
			setLoading(false);
		}
	}

	if (sent) {
		return (
			<AuthLayout
				title="Check your inbox"
				subtitle="A reset link has been sent if that email is registered."
			>
				<p className="text-muted-foreground text-center text-sm">
					<Link to="/sign-in">Back to sign in</Link>
				</p>
			</AuthLayout>
		);
	}

	return (
		<AuthLayout title="Forgot password" subtitle="Enter your email and we'll send a reset link.">
			<form onSubmit={handleSubmit} className="flex flex-col gap-4">
				{error && <ErrorAlert>{error}</ErrorAlert>}
				<FormField label="Email" name="email" type="email" autoComplete="email" required />
				<Button type="submit" disabled={loading} className="w-full">
					{loading ? 'Sending…' : 'Send reset link'}
				</Button>
			</form>
			<p className="text-muted-foreground mt-6 text-center text-sm">
				<Link to="/sign-in">Back to sign in</Link>
			</p>
		</AuthLayout>
	);
}
