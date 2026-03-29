# Frontpage — Thomas ROBERT

A customizable content aggregator that pulls RSS and Atom feeds into one well-designed reading dashboard.

**Live URL:** [your-deployed-url.com]

![Screenshot of your solution](./screenshot.png)

---

## Overview

<!-- Brief description of your implementation. What did you build? What's the experience like? -->

### Tech Stack

<!-- List your technology choices -->

| Layer          | Technology                             |
| -------------- | -------------------------------------- |
| Framework      | TanStack Start v1 (React 19, SSR)      |
| Routing        | TanStack Router v1 (file-based)        |
| Database       | Drizzle ORM + Neon (PostgreSQL)        |
| Authentication | Better Auth v1.5                       |
| Hosting        | Nitro (nightly) / Vercel               |
| Styling        | Tailwind CSS v4 + shadcn/ui (new-york) |
| Feed parsing   | fast-xml-parser                        |
| Type checking  | TypeScript 5.7 (strict)                |
| AI             | Google Gemini 1.5 Flash                |

---

## Phase 7 — AI Features

Powered by **Google Gemini 1.5 Flash** via `@google/generative-ai`. All AI features degrade gracefully when `GEMINI_API_KEY` is not set — the UI simply hides the AI affordances.

### Article Summarization

Open any article in the Reader View drawer and click **"Summarize with AI"** to generate a 2–3 sentence summary. Summaries are stored in the `feedItem.aiSummary` column, so subsequent opens return the cached result instantly (no second API call).

### Category Auto-Suggestion

When adding a new feed, Frontpage calls Gemini in the background after the feed preview loads. If it finds a good match among your existing categories, a dismissible suggestion banner appears above the Category selector with an **Apply** button. This fires without blocking the UI — if it fails or finds no match, nothing is shown.

### Weekly Digest View

Navigate to **Weekly Digest** in the sidebar (or `?view=digest`) to see an AI-curated editorial briefing of your unread articles from the last 7 days. The view:

1. Queries the 10 most recent unread items with content (last 7 days).
2. Sends them to Gemini for a 3–4 sentence editorial summary.
3. Lists the individual articles below, showing AI summaries where already cached.

### Caching Strategy

`feedItem.aiSummary` stores generated summaries in Postgres. `generateSummaryFn` checks for an existing value before calling Gemini, so summaries are only generated once per article regardless of how many times the reader is opened.

### Graceful Fallback

- If `GEMINI_API_KEY` is missing or the API call fails, `generateSummaryFn` returns `{ summary: null, error: 'AI unavailable' }` — the UI shows a gentle error message.
- `suggestCategoryFn` returns `null` on any error — the suggestion banner simply never appears.
- `getWeeklyDigestFn` re-throws on error — the Digest view shows an error state with a retry button.

---

## Design Decisions

These are the product and design choices I made where the spec left room for interpretation.

### Content Discovery & Onboarding

<!-- How did you design the onboarding experience? What does a new user see? How do they find feeds to follow? -->

**The problem I was solving:**

**My approach:**

**Why I chose this approach:**

**What I'd do differently:**

### Digest / Summary View

<!-- How did you design the "what did I miss?" experience? What does the digest contain? How is content prioritized? -->

**The problem I was solving:**

**My approach:**

**Why I chose this approach:**

**What I'd do differently:**

### Layout Customization

Three layout modes — list, compact, and cards — let readers choose their preferred density. The toggle lives in the page header so it's always accessible without digging into settings.

**The problem I was solving:** Different reading contexts call for different densities. Skimming headlines at speed needs compact; deep reading needs list with excerpts; visual/magazine content needs cards.

**My approach:** A three-button toggle group (icon-only, with tooltips) that persists the preference to localStorage. The selected layout affects how feed items are rendered but not the URL, so bookmarks and shares always show content in the viewer's preferred format.

**Why I chose this approach:** Keeping layout state in localStorage (not search params) means it's truly personal — your layout preference doesn't affect shared links.

**What I'd do differently:** Add a per-feed layout override for feeds that are inherently visual (always show cards for image-heavy feeds).

### Other Design Choices

<!-- Document any other significant design decisions: navigation structure, feed item design, landing page approach, etc. -->

---

## Development Journey

### Initial Approach vs. Final

<!-- What was your initial plan? What changed as you built? Were there any pivots? -->

### Decisions Reconsidered

<!-- What seemed right at first but needed rethinking? Why did you change course? -->

### What Surprised Me

<!-- What was harder than expected? Easier? What didn't you anticipate? -->

### Session Breakdown

<!-- How did you structure your working sessions? What did you accomplish in each? Add rows for however many sessions you worked across. -->

| Session | Focus | What I Accomplished |
| ------- | ----- | ------------------- |
| 1       |       |                     |
| 2       |       |                     |
| 3       |       |                     |

---

## AI Collaboration Reflection

<!-- This section documents how you worked with AI throughout the project. -->

### How I Used AI

<!-- What was AI most helpful for? Where did you rely on your own judgment? -->

### What Worked Well

<!-- Which prompting strategies or collaboration patterns produced the best results? -->

### What I Learned

<!-- How did your approach to AI collaboration evolve across sessions? What would you do differently next time? -->

### Where I Pushed Back

<!-- Were there moments where AI suggestions weren't right? How did you identify and correct course? -->

---

## Differentiators

### Chosen Differentiator(s)

<!-- Which differentiator(s) did you pick from the spec? -->

**1. [Differentiator Name]**

**Why I chose this:**

**How it enhances the product:**

**Implementation highlights:**

**What I learned:**

<!-- Repeat for second differentiator if applicable -->

---

## Self-Assessment

Rate your implementation honestly. This self-awareness is part of the portfolio artifact.

| Category                                                                                                 | Rating | Notes |
| -------------------------------------------------------------------------------------------------------- | ------ | ----- |
| **Works for real users** — Deployed, functional end-to-end                                               | /5     |       |
| **Feed parsing robustness** — Handles format variations, errors, edge cases                              | /5     |       |
| **Design-it-yourself features** — Quality and thoughtfulness of onboarding, digest, and layout solutions | /5     |       |
| **Design quality** — Typography, spacing, visual hierarchy, polish                                       | /5     |       |
| **Responsive design** — Fully functional and well-designed across devices                                | /5     |       |
| **Performance** — Fast load, smooth scrolling, efficient caching                                         | /5     |       |
| **Accessibility** — Keyboard nav, screen reader support, contrast                                        | /5     |       |
| **Edge case handling** — Empty states, errors, loading, large datasets                                   | /5     |       |
| **Code quality** — Clean, maintainable, well-structured                                                  | /5     |       |
| **Landing page** — Compelling, communicates value, visually polished                                     | /5     |       |
| **Guest experience** — Immediately impressive, real content, full features                               | /5     |       |

### Lighthouse Scores

<!-- Run Lighthouse on your deployed site and record the scores -->

| Category       | Score |
| -------------- | ----- |
| Performance    |       |
| Accessibility  |       |
| Best Practices |       |
| SEO            |       |

### Strengths

<!-- What are you most proud of in this project? -->

### Areas for Improvement

<!-- What would you improve with more time? Be specific. -->

---

## Known Limitations

<!-- What doesn't work perfectly? What's missing? What would you add in a v2? -->

---

## Guest Demo Setup

Run the seed script once to create the demo account used for the "Try as guest" experience:

```bash
pnpm seed
```

Copy the output `GUEST_DEMO_USER_ID=xxx` and add it to your `.env` file.

---

## Running Locally

```bash
# Clone the repo
git clone [your-repo-url]
cd frontpage

# Install dependencies
pnpm install

# Set up environment variables
cp .env.example .env
# Fill in your database URL and auth secret

# Push the database schema
pnpm drizzle-kit push

# Run the development server
pnpm dev
```

### Environment Variables

| Variable | Description |
| -------- | ----------- |
|          |             |

---

## Acknowledgments

Built as a [Frontend Mentor Product Challenge](https://www.frontendmentor.io).
