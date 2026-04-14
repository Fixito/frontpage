import { GoogleGenerativeAI } from '@google/generative-ai';

let client: GoogleGenerativeAI | null = null;

const MODEL = 'gemini-2.5-flash';

function getClient(): GoogleGenerativeAI {
	if (!client) {
		const apiKey = process.env['GEMINI_API_KEY'];
		if (!apiKey) throw new Error('GEMINI_API_KEY is not set');
		client = new GoogleGenerativeAI(apiKey);
	}
	return client;
}

function stripHtml(html: string): string {
	return html
		.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
		.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
		.replace(/<[^>]+>/g, ' ')
		.replace(/&nbsp;/g, ' ')
		.replace(/&amp;/g, '&')
		.replace(/&lt;/g, '<')
		.replace(/&gt;/g, '>')
		.replace(/&quot;/g, '"')
		.replace(/\s+/g, ' ')
		.trim();
}

export async function generateArticleSummary(title: string, content: string): Promise<string> {
	const model = getClient().getGenerativeModel({ model: MODEL });
	const plainText = stripHtml(content).slice(0, 8000);
	const prompt = `You are an editorial assistant. Summarize the following article for a busy reader.

Rules:
- First line: one clear, specific sentence stating the main finding, argument, or news event. Be direct — no "this article discusses" or "the author explains". Start with the subject.
- Then a blank line.
- Then 2–3 bullet points (each starting with "•") covering the most important specific details, facts, data, or takeaways.
- Use plain language. Be factual and precise. No preamble.

Article title: ${title}

Article content:
${plainText}`;
	const result = await model.generateContent(prompt);
	return result.response.text().trim();
}

export async function suggestCategory(
	feedTitle: string,
	feedDescription: string | null,
	existingCategories: ReadonlyArray<string>,
): Promise<{ name: string; isNew: boolean } | null> {
	const model = getClient().getGenerativeModel({ model: MODEL });
	const descPart = feedDescription ? ` with description: "${feedDescription}"` : '';
	const hasExisting = existingCategories.length > 0;
	const listPart = hasExisting
		? `\nExisting categories: ${existingCategories.join(', ')}`
		: '\nNo categories exist yet.';
	const prompt = `Given a feed titled "${feedTitle}"${descPart}, suggest the best category for it.${listPart}

Rules:
- If one of the existing categories clearly fits, respond with ONLY that category name exactly as written.
- If no existing category fits well, or there are no existing categories, respond with "NEW: <CategoryName>" where <CategoryName> is a short, descriptive category name (2–3 words max, title case).
- Never explain your answer. Respond with only the category name or the NEW: prefix format.`;
	const result = await model.generateContent(prompt);
	const text = result.response.text().trim();
	if (text.toUpperCase().startsWith('NEW:')) {
		const name = text.slice(4).trim();
		if (!name) return null;
		return { name, isNew: true };
	}
	const match = existingCategories.find((c) => c.toLowerCase() === text.toLowerCase());
	return match ? { name: match, isNew: false } : null;
}

// ── Error helpers ──────────────────────────────────────────────────────────────

export interface AiError {
	error: string;
	retryIn?: number;
}

export function parseAiError(err: unknown): AiError {
	const raw = err instanceof Error ? err.message : 'Unknown error';
	const retryMatch = raw.match(/Please retry in (\d+(?:\.\d+)?)s/);
	if (retryMatch) {
		const retryIn = Math.ceil(Number(retryMatch[1]));
		return { error: `AI quota exceeded. Please retry in ${retryIn} seconds.`, retryIn };
	}
	if (raw.includes('429')) {
		return { error: 'AI quota exceeded. Please check your Google AI Studio plan.' };
	}
	if (
		raw.includes('API key') ||
		raw.includes('API_KEY') ||
		raw.includes('401') ||
		raw.includes('403') ||
		raw.toLowerCase().includes('invalid') ||
		raw.toLowerCase().includes('unauthorized')
	) {
		return { error: 'AI API key is invalid or expired. Please update your GEMINI_API_KEY.' };
	}
	return { error: 'AI unavailable. Please try again.' };
}

export async function generateWeeklyDigest(
	items: ReadonlyArray<{
		title: string;
		description: string | null;
		url: string;
		feedTitle: string;
	}>,
): Promise<string> {
	const model = getClient().getGenerativeModel({ model: MODEL });
	const list = items
		.map(
			(item, i) =>
				`${i + 1}. [${item.feedTitle}] ${item.title}${item.description ? ': ' + item.description.slice(0, 200) : ''}`,
		)
		.join('\n');
	const prompt = `You are a newsletter curator. Here are ${items.length} articles from this week. Write a brief 3-4 sentence editorial briefing of the most important themes and stories. Articles:\n${list}`;
	const result = await model.generateContent(prompt);
	return result.response.text();
}
