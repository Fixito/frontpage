import { Moon, Sun } from 'lucide-react';
import { Button } from './button';
import { Tooltip, TooltipContent, TooltipTrigger } from './tooltip';

export function readStoredTheme(): boolean {
	if (typeof window === 'undefined') return false;
	const stored = localStorage.getItem('theme');
	if (stored) return stored === 'dark';
	return matchMedia('(prefers-color-scheme: dark)').matches;
}

export function applyTheme(dark: boolean) {
	document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
	localStorage.setItem('theme', dark ? 'dark' : 'light');
}

interface ThemeToggleProps {
	dark: boolean;
	onToggle: () => void;
}

export function ThemeToggle({ dark, onToggle }: ThemeToggleProps) {
	return (
		<Tooltip>
			<TooltipTrigger asChild>
				<Button
					variant="ghost"
					size="icon"
					onClick={onToggle}
					aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
				>
					{dark ? <Sun size={16} aria-hidden /> : <Moon size={16} aria-hidden />}
				</Button>
			</TooltipTrigger>
			<TooltipContent>{dark ? 'Light mode' : 'Dark mode'}</TooltipContent>
		</Tooltip>
	);
}
