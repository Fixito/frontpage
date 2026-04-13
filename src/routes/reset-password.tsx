import { useForm } from '@tanstack/react-form';
import { Link, createFileRoute, useNavigate, useSearch } from '@tanstack/react-router';
import { useMutation } from '@tanstack/react-query';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import { ErrorAlert } from '@/components/ui/error-alert';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { AuthLayout } from '@/components/auth';
import { authClient } from '@/lib/auth-client';
import { toErrors } from '@/lib/form-utils';

const searchSchema = z.object({
	token: z.string().optional(),
});

const schema = z
	.object({
		password: z.string().min(8, 'Password must be at least 8 characters'),
		confirm: z.string(),
	})
	.refine((data) => data.password === data.confirm, {
		message: 'Passwords do not match',
		path: ['confirm'],
	});

export const Route = createFileRoute('/reset-password')({
	validateSearch: searchSchema,
	component: ResetPasswordPage,
});

function ResetPasswordPage() {
	const { token } = useSearch({ from: '/reset-password' });
	const navigate = useNavigate();

	const mutation = useMutation({
		mutationFn: async (values: z.infer<typeof schema>) => {
			if (!token) throw new Error('Missing reset token. Please request a new link.');
			const result = await authClient.resetPassword({ newPassword: values.password, token });
			if (result.error) throw new Error(result.error.message ?? 'Password reset failed');
		},
		onSuccess: () => {
			setTimeout(() => {
				void navigate({ to: '/sign-in' });
			}, 2000);
		},
	});

	const form = useForm({
		defaultValues: { password: '', confirm: '' },
		validators: { onSubmit: schema },
		onSubmit: async ({ value }) => {
			await mutation.mutateAsync(value);
		},
	});

	if (!token) {
		return (
			<AuthLayout title="Invalid link" subtitle="This reset link is invalid or has expired.">
				<p className="text-muted-foreground text-center text-sm">
					<Link to="/forgot-password">Request a new link</Link>
				</p>
			</AuthLayout>
		);
	}

	if (mutation.isSuccess) {
		return (
			<AuthLayout title="Password updated" subtitle="Your password has been reset successfully.">
				<p className="text-muted-foreground text-center text-sm">Redirecting to sign in…</p>
			</AuthLayout>
		);
	}

	return (
		<AuthLayout title="Reset password" subtitle="Choose a new password for your account.">
			<form
				onSubmit={(e) => {
					e.preventDefault();
					form.handleSubmit();
				}}
				className="flex flex-col gap-4"
			>
				{mutation.error && <ErrorAlert>{mutation.error.message}</ErrorAlert>}

				<FieldGroup>
					<form.Field name="password">
						{(field) => {
							const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;
							return (
								<Field data-invalid={isInvalid}>
									<FieldLabel htmlFor={field.name}>New password</FieldLabel>
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

					<form.Field name="confirm">
						{(field) => {
							const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;
							return (
								<Field data-invalid={isInvalid}>
									<FieldLabel htmlFor={field.name}>Confirm password</FieldLabel>
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
							{isSubmitting ? 'Resetting…' : 'Reset password'}
						</Button>
					)}
				</form.Subscribe>
			</form>
		</AuthLayout>
	);
}
