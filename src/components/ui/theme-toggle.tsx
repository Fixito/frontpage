import { useState } from 'react';
import { Moon, Sun } from 'lucide-react';
import { Button } from './button';
import { Tooltip, TooltipContent, TooltipTrigger } from './tooltip';

function isDarkMode(): boolean {
	if (typeof window === 'undefined') return false;
	const stored = localStorage.getItem('theme');
	if (stored) return stored === 'dark';
	return matchMedia('(prefers-color-scheme: dark)').matches;
}

export function ThemeToggle() {
	const [dark, setDark] = useState(isDarkMode);

	function toggle() {
		const next = !dark;
		setDark(next);
		document.documentElement.setAttribute('data-theme', next ? 'dark' : 'light');
		localStorage.setItem('theme', next ? 'dark' : 'light');
	}

	return (
		<Tooltip>
			<TooltipTrigger asChild>
				<Button
					variant="ghost"
					size="icon"
					onClick={toggle}
					aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
				>
					{dark ? <Sun size={16} aria-hidden /> : <Moon size={16} aria-hidden />}
				</Button>
			</TooltipTrigger>
			<TooltipContent>{dark ? 'Light mode' : 'Dark mode'}</TooltipContent>
		</Tooltip>
	);
}
