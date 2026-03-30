import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface KeyboardShortcutsHelpProps {
	open: boolean;
	onOpenChange: (v: boolean) => void;
}

const SHORTCUTS = [
	{ key: 'j / ↓', description: 'Next item' },
	{ key: 'k / ↑', description: 'Previous item' },
	{ key: 'o / Enter', description: 'Open article' },
	{ key: 'm', description: 'Toggle read/unread' },
	{ key: 's', description: 'Toggle bookmark' },
	{ key: '?', description: 'Show this help' },
	{ key: 'Escape', description: 'Close / deselect' },
];

export function KeyboardShortcutsHelp({ open, onOpenChange }: KeyboardShortcutsHelpProps) {
	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-sm">
				<DialogHeader>
					<DialogTitle>Keyboard shortcuts</DialogTitle>
				</DialogHeader>
				<table className="w-full text-sm">
					<tbody>
						{SHORTCUTS.map(({ key, description }) => (
							<tr key={key} className="border-border border-b last:border-0">
								<td className="py-2 pr-4 font-mono text-xs">
									<kbd className="bg-muted rounded px-1.5 py-0.5">{key}</kbd>
								</td>
								<td className="text-muted-foreground py-2">{description}</td>
							</tr>
						))}
					</tbody>
				</table>
			</DialogContent>
		</Dialog>
	);
}
