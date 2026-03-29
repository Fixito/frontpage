import { Link } from '@tanstack/react-router';

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
