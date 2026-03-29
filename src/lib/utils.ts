import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { ClassValue } from 'clsx';

export function cn(...inputs: Array<ClassValue>) {
	return twMerge(clsx(inputs));
}

/** Strip HTML tags from a string, returning plain text suitable for previews. */
export function stripHtml(html: string): string {
	return html
		.replace(/<[^>]+>/g, ' ')
		.replace(/\s+/g, ' ')
		.trim();
}

/**
 * Map any string to one of 8 brand-aligned accent hex colors deterministically.
 * Used for letter avatars and category badge fallbacks.
 */
const ACCENT_PALETTE = [
	'#3B82F6', // blue-500
	'#F97316', // orange-500
	'#22C55E', // green-500
	'#A855F7', // purple-500
	'#F43F5E', // rose-500
	'#14B8A6', // teal-500
	'#F59E0B', // amber-500
	'#6366F1', // indigo-500
] as const;

export function hashToHex(str: string): string {
	let hash = 0;
	for (let i = 0; i < str.length; i++) {
		hash = (hash * 31 + str.charCodeAt(i)) | 0;
	}
	return ACCENT_PALETTE[Math.abs(hash) % ACCENT_PALETTE.length] ?? '#3B82F6';
}
