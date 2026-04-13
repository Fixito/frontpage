import { useForm } from '@tanstack/react-form';
import { Link, createFileRoute } from '@tanstack/react-router';
import { useMutation } from '@tanstack/react-query';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import { ErrorAlert } from '@/components/ui/error-alert';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { AuthLayout } from '@/components/auth';
import { authClient } from '@/lib/auth-client';
import { toErrors } from '@/lib/form-utils';

const schema = z.object({
	email: z.email('Enter a valid email'),
});

export const Route = createFileRoute('/forgot-password')({
	component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
	const mutation = useMutation({
		mutationFn: async (values: z.infer<typeof schema>) => {
			const result = await authClient.requestPasswordReset({
				email: values.email,
				redirectTo: '/reset-password',
			});
			if (result.error) throw new Error(result.error.message ?? 'Failed to send reset email');
		},
	});

	const form = useForm({
		defaultValues: { email: '' },
		validators: { onSubmit: schema },
		onSubmit: async ({ value }) => {
			await mutation.mutateAsync(value);
		},
	});

	if (mutation.isSuccess) {
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
				</FieldGroup>

				<form.Subscribe selector={(s) => s.isSubmitting}>
					{(isSubmitting) => (
						<Button type="submit" disabled={isSubmitting} className="w-full">
							{isSubmitting ? 'Sending…' : 'Send reset link'}
						</Button>
					)}
				</form.Subscribe>
			</form>

			<p className="text-muted-foreground mt-6 text-center text-sm">
				<Link to="/sign-in">Back to sign in</Link>
			</p>
		</AuthLayout>
	);
}
