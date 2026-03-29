import { Link, createFileRoute, useRouter } from '@tanstack/react-router';
import { useState } from 'react';
import { AuthLayout } from '@/components/auth';
import { Button } from '@/components/ui/button';
import { ErrorAlert } from '@/components/ui/error-alert';
import { FormField } from '@/components/ui/form-field';
import { authClient } from '@/lib/auth-client';
import { enterGuestMode } from '@/lib/session';

export const Route = createFileRoute('/sign-up')({
	component: SignUpPage,
});

function SignUpPage() {
	const router = useRouter();
	const [error, setError] = useState('');
	const [loading, setLoading] = useState(false);

	async function handleGuestMode() {
		await authClient.signOut();
		await enterGuestMode();
		await router.navigate({ to: '/dashboard' });
	}

	async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault();
		setError('');
		setLoading(true);
		const form = e.currentTarget;
		const name = (form.elements.namedItem('name') as HTMLInputElement).value;
		const email = (form.elements.namedItem('email') as HTMLInputElement).value;
		const password = (form.elements.namedItem('password') as HTMLInputElement).value;
		if (password.length < 8) {
			setError('Password must be at least 8 characters');
			setLoading(false);
			return;
		}
		try {
			const result = await authClient.signUp.email({ name, email, password });
			if (result.error) throw new Error(result.error.message ?? 'Sign up failed');
			await router.navigate({ to: '/dashboard' });
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Sign up failed');
		} finally {
			setLoading(false);
		}
	}

	return (
		<AuthLayout title="Create your account" subtitle="Start reading everything in one place">
			<form onSubmit={handleSubmit} className="flex flex-col gap-4">
				{error && <ErrorAlert>{error}</ErrorAlert>}
				<FormField label="Name" name="name" autoComplete="name" required />
				<FormField label="Email" name="email" type="email" autoComplete="email" required />
				<FormField
					label="Password"
					name="password"
					type="password"
					autoComplete="new-password"
					required
				/>
				<Button type="submit" disabled={loading} className="w-full">
					{loading ? 'Loading…' : 'Create account'}
				</Button>
			</form>
			<p className="mt-6 text-center text-sm text-muted-foreground">
				Already have an account? <Link to="/sign-in">Sign in</Link>
				{' · '}
				<Button variant="link" onClick={handleGuestMode} className="h-auto p-0 text-sm">
					Try as guest
				</Button>
			</p>
		</AuthLayout>
	);
}
