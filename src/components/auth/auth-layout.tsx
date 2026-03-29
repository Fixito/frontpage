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
		<div className="bg-background flex min-h-screen flex-col items-center justify-center p-6">
			<div className="w-full max-w-sm">
				<Link
					to="/"
					className="text-foreground mb-8 block text-center text-base font-bold no-underline"
				>
					Frontpage
				</Link>
				<div className="border-border bg-card rounded-xl border p-8 shadow-md">
					<h1 className="mb-2 text-xl leading-snug font-semibold">{title}</h1>
					<p className="text-muted-foreground mb-6 text-sm">{subtitle}</p>
					{children}
				</div>
			</div>
		</div>
	);
}
