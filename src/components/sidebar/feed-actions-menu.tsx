import { useRef } from 'react';
import { MoreHorizontal, Pencil, Trash2 } from 'lucide-react';

import type { Ref } from 'react';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';

export type FeedAction = 'edit' | 'remove';

interface FeedActionsMenuProps {
	feedTitle: string;
	triggerRef?: Ref<HTMLButtonElement>;
	onAction: (action: FeedAction) => void;
}

export function FeedActionsMenu({ feedTitle, triggerRef, onAction }: FeedActionsMenuProps) {
	// The dialog opens only once the menu has closed and handed focus back to its trigger,
	// so the dialog never fights the menu's focus scope.
	const pendingAction = useRef<FeedAction | null>(null);

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button
					ref={triggerRef}
					variant="ghost"
					size="icon-xs"
					aria-label={`Actions for ${feedTitle}`}
					className="text-muted-foreground hover:text-foreground pointer-fine:opacity-0 pointer-fine:group-focus-within/feed:opacity-100 pointer-fine:group-hover/feed:opacity-100 pointer-fine:focus-visible:opacity-100 pointer-fine:data-[state=open]:opacity-100"
				>
					<MoreHorizontal aria-hidden />
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent
				align="end"
				onCloseAutoFocus={() => {
					const action = pendingAction.current;
					pendingAction.current = null;
					if (action) onAction(action);
				}}
			>
				<DropdownMenuItem
					onSelect={() => {
						pendingAction.current = 'edit';
					}}
				>
					<Pencil aria-hidden />
					Edit
				</DropdownMenuItem>
				<DropdownMenuItem
					variant="destructive"
					onSelect={() => {
						pendingAction.current = 'remove';
					}}
				>
					<Trash2 aria-hidden />
					Remove
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
