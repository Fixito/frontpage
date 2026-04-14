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
	name: z.string().min(1, 'Name is required'),
	email: z.email('Enter a valid email'),
	password: z.string().min(8, 'Password must be at least 8 characters'),
});

export const Route = createFileRoute('/_app/sign-up')({
	component: SignUpPage,
});

function SignUpPage() {
	const router = useRouter();

	const mutation = useMutation({
		mutationFn: async (values: z.infer<typeof schema>) => {
			const result = await authClient.signUp.email(values);
			if (result.error) throw new Error(result.error.message ?? 'Sign up failed');
		},
		onSuccess: async () => {
			await router.navigate({ to: '/dashboard' });
		},
	});

	const form = useForm({
		defaultValues: { name: '', email: '', password: '' },
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
		<AuthLayout title="Create your account" subtitle="Start reading everything in one place">
			<form
				onSubmit={(e) => {
					e.preventDefault();
					form.handleSubmit();
				}}
				className="flex flex-col gap-4"
			>
				{mutation.error && <ErrorAlert>{mutation.error.message}</ErrorAlert>}

				<FieldGroup>
					<form.Field name="name">
						{(field) => {
							const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;
							return (
								<Field data-invalid={isInvalid}>
									<FieldLabel htmlFor={field.name}>Name</FieldLabel>
									<Input
										id={field.name}
										name={field.name}
										value={field.state.value}
										onBlur={field.handleBlur}
										onChange={(e) => field.handleChange(e.target.value)}
										autoComplete="name"
										aria-invalid={isInvalid}
									/>
									{isInvalid && <FieldError errors={toErrors(field.state.meta.errors)} />}
								</Field>
							);
						}}
					</form.Field>

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
										autoComplete="new-password"
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
							{isSubmitting ? 'Loading…' : 'Create account'}
						</Button>
					)}
				</form.Subscribe>
			</form>

			<p className="text-muted-foreground mt-6 text-center text-sm">
				Already have an account? <Link to="/sign-in">Sign in</Link>
				{' · '}
				<Button variant="link" onClick={handleGuestMode} className="h-auto p-0 text-sm">
					Try as guest
				</Button>
			</p>
		</AuthLayout>
	);
}
