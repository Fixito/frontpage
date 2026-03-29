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
 * Map any string to an integer in [0, max) deterministically.
 * Used to pick a palette slot for avatars and badges.
 */
export function hashToIndex(str: string, max: number): number {
	let hash = 0;
	for (let i = 0; i < str.length; i++) {
		hash = (hash * 31 + str.charCodeAt(i)) | 0;
	}
	return Math.abs(hash) % max;
}

/**
 * Map any string to one of 8 brand-aligned accent hex colors deterministically.
 * Only for decorative use (e.g. card accent bar) — not for text on background.
 */
const ACCENT_PALETTE = [
	'#3B82F6',
	'#F97316',
	'#22C55E',
	'#A855F7',
	'#F43F5E',
	'#14B8A6',
	'#F59E0B',
	'#6366F1',
] as const;

export function hashToHex(str: string): string {
	return ACCENT_PALETTE[hashToIndex(str, ACCENT_PALETTE.length)] ?? '#3B82F6';
}
