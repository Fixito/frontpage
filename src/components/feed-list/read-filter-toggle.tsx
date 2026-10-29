import { cn } from '@/lib/utils';

interface ReadFilterToggleProps {
	unreadOnly: boolean;
	onChange: (unreadOnly: boolean) => void;
}

const OPTIONS = [
	{ unreadOnly: false, label: 'All' },
	{ unreadOnly: true, label: 'Unread' },
] as const;

/** Switches the list between all Feed Items and unread ones only. */
export function ReadFilterToggle({ unreadOnly, onChange }: ReadFilterToggleProps) {
	return (
		<div
			role="group"
			aria-label="Show articles"
			className="bg-muted flex items-center rounded-md p-0.5"
		>
			{OPTIONS.map((option) => (
				<button
					key={option.label}
					type="button"
					aria-pressed={unreadOnly === option.unreadOnly}
					onClick={() => onChange(option.unreadOnly)}
					className={cn(
						'focus-visible:ring-ring/50 h-11 rounded px-3 text-xs transition-colors outline-none focus-visible:ring-[3px] md:h-6 md:px-2',
						unreadOnly === option.unreadOnly
							? 'bg-background text-foreground font-medium shadow-sm'
							: 'text-muted-foreground hover:text-foreground',
					)}
				>
					{option.label}
				</button>
			))}
		</div>
	);
}
