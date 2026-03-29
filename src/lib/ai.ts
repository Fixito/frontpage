import { GoogleGenerativeAI } from '@google/generative-ai';

let client: GoogleGenerativeAI | null = null;

function getClient(): GoogleGenerativeAI {
	if (!client) {
		const apiKey = process.env['GEMINI_API_KEY'];
		if (!apiKey) throw new Error('GEMINI_API_KEY is not set');
		client = new GoogleGenerativeAI(apiKey);
	}
	return client;
}

export async function generateArticleSummary(title: string, content: string): Promise<string> {
	const model = getClient().getGenerativeModel({ model: 'gemini-1.5-flash' });
	const prompt = `Summarize this article in 2-3 sentences. Article title: ${title}\n\nContent: ${content.slice(0, 3000)}`;
	const result = await model.generateContent(prompt);
	return result.response.text();
}

export async function suggestCategory(
	feedTitle: string,
	feedDescription: string | null,
	existingCategories: ReadonlyArray<string>,
): Promise<string | null> {
	if (existingCategories.length === 0) return null;
	const model = getClient().getGenerativeModel({ model: 'gemini-1.5-flash' });
	const descPart = feedDescription ? ` with description: "${feedDescription}"` : '';
	const prompt = `Given a feed titled "${feedTitle}"${descPart}, pick the best matching category from this list: ${existingCategories.join(', ')}. Respond with ONLY the category name exactly as written, or "none" if none fit.`;
	const result = await model.generateContent(prompt);
	const text = result.response.text().trim();
	if (text.toLowerCase() === 'none') return null;
	const match = existingCategories.find((c) => c.toLowerCase() === text.toLowerCase());
	return match ?? null;
}

export async function generateWeeklyDigest(
	items: ReadonlyArray<{
		title: string;
		description: string | null;
		url: string;
		feedTitle: string;
	}>,
): Promise<string> {
	const model = getClient().getGenerativeModel({ model: 'gemini-1.5-flash' });
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
