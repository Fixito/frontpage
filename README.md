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
