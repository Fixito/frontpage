import { useForm } from '@tanstack/react-form';
import { useMutation } from '@tanstack/react-query';
import { Link, createFileRoute, useRouter } from '@tanstack/react-router';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import { ErrorAlert } from '@/components/ui/error-alert';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { AuthLayout } from '@/components/auth';

import { authClient } from '@/lib/auth-client';
import { toErrors } from '@/lib/form-utils';
import { enterGuestMode } from '@/lib/session';

const schema = z.object({
	email: z.email('Enter a valid email'),
	password: z.string().min(1, 'Password is required'),
});

export const Route = createFileRoute('/sign-in')({
	component: SignInPage,
});

function SignInPage() {
	const router = useRouter();

	const mutation = useMutation({
		mutationFn: async (values: z.infer<typeof schema>) => {
			const result = await authClient.signIn.email(values);
			if (result.error) throw new Error(result.error.message ?? 'Invalid credentials');
		},
		onSuccess: async () => {
			await router.navigate({ to: '/dashboard' });
		},
	});

	const form = useForm({
		defaultValues: { email: '', password: '' },
		validators: { onSubmit: schema },
		onSubmit: async ({ value }) => {
			await mutation.mutateAsync(value);
		},
	});

	async function handleGuestMode() {
		await authClient.signOut();
		await enterGuestMode();
		await router.navigate({ to: '/dashboard' });
	}

	return (
		<AuthLayout title="Welcome back" subtitle="Sign in to your Frontpage account">
			<form
				onSubmit={(e) => {
					e.preventDefault();
					form.handleSubmit();
				}}
				className="flex flex-col gap-4"
			>
				{mutation.error && <ErrorAlert>{mutation.error.message}</ErrorAlert>}

				<FieldGroup>
					<form.Field name="email">
						{(field) => {
							const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;
							return (
								<Field data-invalid={isInvalid}>
									<FieldLabel htmlFor={field.name}>Email</FieldLabel>
									<Input
										id={field.name}
										name={field.name}
										type="email"
										value={field.state.value}
										onBlur={field.handleBlur}
										onChange={(e) => field.handleChange(e.target.value)}
										autoComplete="email"
										aria-invalid={isInvalid}
									/>
									{isInvalid && <FieldError errors={toErrors(field.state.meta.errors)} />}
								</Field>
							);
						}}
					</form.Field>

					<form.Field name="password">
						{(field) => {
							const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;
							return (
								<Field data-invalid={isInvalid}>
									<FieldLabel htmlFor={field.name}>Password</FieldLabel>
									<Input
										id={field.name}
										name={field.name}
										type="password"
										value={field.state.value}
										onBlur={field.handleBlur}
										onChange={(e) => field.handleChange(e.target.value)}
										autoComplete="current-password"
										aria-invalid={isInvalid}
									/>
									{isInvalid && <FieldError errors={toErrors(field.state.meta.errors)} />}
								</Field>
							);
						}}
					</form.Field>
				</FieldGroup>

				<form.Subscribe selector={(s) => s.isSubmitting}>
					{(isSubmitting) => (
						<Button type="submit" disabled={isSubmitting} className="w-full">
							{isSubmitting ? 'Loading…' : 'Sign in'}
						</Button>
					)}
				</form.Subscribe>
			</form>

			<p className="text-muted-foreground mt-6 text-center text-sm">
				No account? <Link to="/sign-up">Sign up</Link>
				{' · '}
				<Button variant="link" onClick={handleGuestMode} className="h-auto p-0 text-sm">
					Try as guest
				</Button>
			</p>

			<p className="text-muted-foreground mt-2 text-center text-sm">
				<Link to="/forgot-password">Forgot password?</Link>
			</p>
		</AuthLayout>
	);
}
