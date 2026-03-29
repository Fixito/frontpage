import { Link, createFileRoute, useRouter } from '@tanstack/react-router';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
				<Field label="Email" name="email" type="email" autoComplete="email" required />
				<Field
					label="Password"
					name="password"
					type="password"
					autoComplete="current-password"
					required
				/>
				<div className="flex justify-end">
					{/* <Link to="/reset-password" className="text-sm text-primary">Forgot password?</Link> */}
				</div>
				<SubmitButton loading={loading}>Sign in</SubmitButton>
			</form>
			<p className="mt-6 text-center text-sm text-muted-foreground">
				No account? <Link to="/sign-up">Sign up</Link>
				{' · '}
				<Button variant="link" onClick={handleGuestMode} className="h-auto p-0 text-sm">
					Try as guest
				</Button>
			</p>
		</AuthLayout>
	);
}

// ── Shared auth UI helpers ────────────────────────────────────────────────────

export function AuthLayout({
	title,
	subtitle,
	children,
}: {
	title: string;
	subtitle: string;
	children: React.ReactNode;
}) {
	return (
		<div className="flex min-h-screen flex-col items-center justify-center bg-background p-6">
			<div className="w-full max-w-sm">
				<Link
					to="/"
					className="mb-8 block text-center text-base font-bold text-foreground no-underline"
				>
					Frontpage
				</Link>
				<div className="rounded-xl border border-border bg-card p-8 shadow-md">
					<h1 className="mb-2 text-xl font-semibold leading-snug">{title}</h1>
					<p className="mb-6 text-sm text-muted-foreground">{subtitle}</p>
					{children}
				</div>
			</div>
		</div>
	);
}

export function ErrorAlert({ children }: { children: React.ReactNode }) {
	return (
		<div
			role="alert"
			className="rounded-md border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive"
		>
			{children}
		</div>
	);
}

export function Field({
	label,
	name,
	type = 'text',
	autoComplete,
	required,
}: {
	label: string;
	name: string;
	type?: string;
	autoComplete?: string;
	required?: boolean;
}) {
	return (
		<div className="flex flex-col gap-1">
			<Label htmlFor={name}>{label}</Label>
			<Input id={name} name={name} type={type} autoComplete={autoComplete} required={required} />
		</div>
	);
}

export function SubmitButton({
	loading,
	children,
}: {
	loading: boolean;
	children: React.ReactNode;
}) {
	return (
		<Button type="submit" disabled={loading} className="w-full">
			{loading ? 'Loading…' : children}
		</Button>
	);
}
