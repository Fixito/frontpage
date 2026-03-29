export function ErrorAlert({ children }: { children: React.ReactNode }) {
	return (
		<div
			role="alert"
			className="border-destructive/20 bg-destructive/10 text-destructive rounded-md border p-3 text-sm"
		>
			{children}
		</div>
	);
}
