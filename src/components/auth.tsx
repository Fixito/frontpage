import { Link } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

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
