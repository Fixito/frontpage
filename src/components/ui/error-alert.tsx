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
