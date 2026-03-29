import { Link, createFileRoute, useRouter } from '@tanstack/react-router';
import { useState } from 'react';
import { AuthLayout } from '@/components/auth';
import { Button } from '@/components/ui/button';
import { ErrorAlert } from '@/components/ui/error-alert';
import { FormField } from '@/components/ui/form-field';
import { authClient } from '@/lib/auth-client';
import { enterGuestMode } from '@/lib/session';

export const Route = createFileRoute('/sign-in')({
	component: SignInPage,
});

function SignInPage() {
	const router = useRouter();
	const [error, setError] = useState('');
	const [loading, setLoading] = useState(false);

	async function handleGuestMode() {
		await authClient.signOut(); // clears session cookie if authenticated
		await enterGuestMode();
		await router.navigate({ to: '/dashboard' });
	}

	async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault();
		setError('');
		setLoading(true);
		const form = e.currentTarget;
		const email = (form.elements.namedItem('email') as HTMLInputElement).value;
		const password = (form.elements.namedItem('password') as HTMLInputElement).value;
		try {
			const result = await authClient.signIn.email({ email, password });
			if (result.error) throw new Error(result.error.message ?? 'Invalid credentials');
			await router.navigate({ to: '/dashboard' });
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Sign in failed');
		} finally {
			setLoading(false);
		}
	}

	return (
		<AuthLayout title="Welcome back" subtitle="Sign in to your Frontpage account">
			<form onSubmit={handleSubmit} className="flex flex-col gap-4">
				{error && <ErrorAlert>{error}</ErrorAlert>}
				<FormField label="Email" name="email" type="email" autoComplete="email" required />
				<FormField
					label="Password"
					name="password"
					type="password"
					autoComplete="current-password"
					required
				/>
				<Button type="submit" disabled={loading} className="w-full">
					{loading ? 'Loading…' : 'Sign in'}
				</Button>
			</form>
			<p className="text-muted-foreground mt-6 text-center text-sm">
				No account? <Link to="/sign-up">Sign up</Link>
				{' · '}
				<Button variant="link" onClick={handleGuestMode} className="h-auto p-0 text-sm">
					Try as guest
				</Button>
			</p>
		</AuthLayout>
	);
}
