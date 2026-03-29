import { Link, createFileRoute, useRouter } from '@tanstack/react-router';
import { useState } from 'react';
import { authClient } from '#/lib/auth-client';

export const Route = createFileRoute('/sign-in')({
	component: SignInPage,
});

function SignInPage() {
	const router = useRouter();
	const [error, setError] = useState('');
	const [loading, setLoading] = useState(false);

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
			<form
				onSubmit={handleSubmit}
				style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}
			>
				{error && <ErrorAlert>{error}</ErrorAlert>}
				<Field label="Email" name="email" type="email" autoComplete="email" required />
				<Field
					label="Password"
					name="password"
					type="password"
					autoComplete="current-password"
					required
				/>
				<div style={{ display: 'flex', justifyContent: 'flex-end' }}>
					{/* <Link
						to="/reset-password"
						style={{ fontSize: 'var(--text-sm)', color: 'var(--color-accent)' }}
					>
						Forgot password?
					</Link> */}
				</div>
				<SubmitButton loading={loading}>Sign in</SubmitButton>
			</form>
			<p
				style={{
					marginTop: 'var(--space-6)',
					textAlign: 'center',
					fontSize: 'var(--text-sm)',
					color: 'var(--color-text-secondary)',
				}}
			>
				No account?{' '}
				<Link to="/sign-up" style={{ color: 'var(--color-accent)' }}>
					Sign up
				</Link>
				{' · '}
				<Link to="/dashboard" style={{ color: 'var(--color-accent)' }}>
					Try as guest
				</Link>
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
		<div
			style={{
				minHeight: '100vh',
				display: 'flex',
				flexDirection: 'column',
				alignItems: 'center',
				justifyContent: 'center',
				padding: 'var(--space-6)',
				backgroundColor: 'var(--color-bg-primary)',
			}}
		>
			<div style={{ width: '100%', maxWidth: '22rem' }}>
				<Link
					to="/"
					style={{
						display: 'block',
						textAlign: 'center',
						marginBottom: 'var(--space-8)',
						fontWeight: 'var(--font-bold)',
						fontSize: 'var(--text-base)',
						color: 'var(--color-text-primary)',
						textDecoration: 'none',
					}}
				>
					Frontpage
				</Link>
				<div
					style={{
						padding: 'var(--space-8)',
						backgroundColor: 'var(--color-bg-secondary)',
						border: '1px solid var(--color-border)',
						borderRadius: 'var(--radius-xl)',
						boxShadow: 'var(--shadow-md)',
					}}
				>
					<h1
						style={{
							margin: '0 0 var(--space-2)',
							fontSize: 'var(--text-xl)',
							fontWeight: 'var(--font-semibold)',
							lineHeight: 'var(--leading-snug)',
						}}
					>
						{title}
					</h1>
					<p
						style={{
							margin: '0 0 var(--space-6)',
							fontSize: 'var(--text-sm)',
							color: 'var(--color-text-secondary)',
						}}
					>
						{subtitle}
					</p>
					{children}
				</div>
			</div>
		</div>
	);
}

export function ErrorAlert({ children }: { children: React.ReactNode }) {
	return (
		<p
			role="alert"
			style={{
				margin: 0,
				padding: 'var(--space-3)',
				fontSize: 'var(--text-sm)',
				color: 'var(--color-error)',
				backgroundColor: 'color-mix(in srgb, var(--color-error) 8%, transparent)',
				borderRadius: 'var(--radius-md)',
				border: '1px solid color-mix(in srgb, var(--color-error) 20%, transparent)',
			}}
		>
			{children}
		</p>
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
		<div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
			<label
				htmlFor={name}
				style={{
					fontSize: 'var(--text-sm)',
					fontWeight: 'var(--font-medium)',
					color: 'var(--color-text-primary)',
				}}
			>
				{label}
			</label>
			<input
				id={name}
				name={name}
				type={type}
				autoComplete={autoComplete}
				required={required}
				style={{
					padding: 'var(--space-2) var(--space-3)',
					fontSize: 'var(--text-sm)',
					color: 'var(--color-text-primary)',
					backgroundColor: 'var(--color-bg-primary)',
					border: '1px solid var(--color-border)',
					borderRadius: 'var(--radius-md)',
					outline: 'none',
					width: '100%',
				}}
			/>
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
		<button
			type="submit"
			disabled={loading}
			style={{
				padding: 'var(--space-2) var(--space-4)',
				fontSize: 'var(--text-sm)',
				fontWeight: 'var(--font-semibold)',
				color: '#fff',
				backgroundColor: loading ? 'var(--color-text-tertiary)' : 'var(--color-accent)',
				border: 'none',
				borderRadius: 'var(--radius-md)',
				cursor: loading ? 'not-allowed' : 'pointer',
				width: '100%',
			}}
		>
			{loading ? 'Loading…' : children}
		</button>
	);
}
