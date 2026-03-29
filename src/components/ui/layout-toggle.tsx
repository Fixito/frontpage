import { AlignJustify, LayoutGrid, List } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from './tooltip';
import { cn } from '@/lib/utils';

export type FeedLayout = 'list' | 'compact' | 'cards';

interface LayoutToggleProps {
	value: FeedLayout;
	onChange: (layout: FeedLayout) => void;
	className?: string;
}

const OPTIONS: Array<{
	value: FeedLayout;
	label: string;
	Icon: React.ComponentType<{ size?: number; className?: string }>;
}> = [
	{ value: 'list', label: 'List view', Icon: List },
	{ value: 'compact', label: 'Compact view', Icon: AlignJustify },
	{ value: 'cards', label: 'Cards view', Icon: LayoutGrid },
];

export function LayoutToggle({ value, onChange, className }: LayoutToggleProps) {
	return (
		<div
			role="group"
			aria-label="Feed layout"
			className={cn('flex items-center gap-0.5', className)}
		>
			{OPTIONS.map(({ value: v, label, Icon }) => (
				<Tooltip key={v}>
					<TooltipTrigger asChild>
						<button
							type="button"
							aria-label={label}
							aria-pressed={value === v}
							onClick={() => onChange(v)}
							className={cn(
								'flex h-7 w-7 items-center justify-center rounded-md transition-colors',
								value === v
									? 'bg-accent text-accent-foreground'
									: 'text-muted-foreground hover:bg-muted hover:text-foreground',
							)}
						>
							<Icon size={14} aria-hidden />
						</button>
					</TooltipTrigger>
					<TooltipContent>{label}</TooltipContent>
				</Tooltip>
			))}
		</div>
	);
}
