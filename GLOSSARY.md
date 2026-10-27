# Frontpage — Domain & Architecture Context

A customizable RSS/Atom feed aggregator: fetch, parse, store, and read articles from public feed URLs, organised into user-defined categories, with a guest demo mode.

---

## Domain Glossary

| Term                | Definition                                                                                                                                                                                         |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Feed**            | A URL pointing to an RSS or Atom document. Stored in the `feed` table.                                                                                                                             |
| **Feed Item**       | A single article parsed from a Feed. Stored in `feedItem`.                                                                                                                                         |
| **Category**        | A user-defined group of Feeds. Belongs to a User.                                                                                                                                                  |
| **Sidebar Data**    | The aggregated list of Categories + their Feeds, fetched once per session load.                                                                                                                    |
| **User**            | An authenticated Better Auth account with persistent prefs, history, and bookmarks.                                                                                                                |
| **Guest**           | An unauthenticated visitor whose identity is tracked via a stable guest cookie. Guests share a fixed set of 19 curated tech feeds and get read/bookmark state stored in DB against their guest ID. |
| **Preference**      | Per-user layout (`list` \| `compact` \| `cards`) and theme (`light` \| `dark` \| `system`) stored in `userPreference`.                                                                             |
| **Reading History** | The set of `feedItem` IDs a User has marked read.                                                                                                                                                  |
| **Bookmark**        | A `feedItem` a User has saved.                                                                                                                                                                     |
| **Weekly Digest**   | An AI-generated summary of the top articles from the past 7 days, produced by Gemini 2.5 Flash. Authenticated users only.                                                                          |
| **AI Summary**      | A per-article structured summary cached in `feedItem.aiSummary`. Authenticated users only.                                                                                                         |

---

## Server Function Auth Seam

All server-side mutations and queries go through `createServerFn` (TanStack Start). **The auth seam lives in `src/lib/server-fn-helpers.ts`.**

### Pattern

```ts
// reads — guests allowed
withAuth(async (userId: string, data?: ...) => { ... })

// mutations — guests throw 'Unauthorized'
withMutation(async (userId: string, data?: ...) => { ... })
```

Both HOFs read the session server-side (via Better Auth `getSession` + `getRequest()`) and inject a verified `userId` as the first argument. **`userId` is never accepted from the client payload** — it was removed from all `validator` schemas.

### Rules

- `withAuth` — allows both authenticated Users and Guests (guest cookie → guest user record). Use for all reads.
- `withMutation` — throws `'Unauthorized'` for Guests. Use for all writes, and for any read that fetches arbitrary URLs or calls Gemini (Feed URL validation, category suggestion, Weekly Digest).
- Zero-payload server fns (no `.validator()`) use a 1-param callback: `async (userId) => ...`
- Data-carrying server fns use a 2-param callback with explicit types matching the `validator` schema: `async (userId: string, data: { ... }) => ...` (explicit types required to avoid TypeScript's overload resolution ambiguity).

### Files

| File                            | Responsibility                                   |
| ------------------------------- | ------------------------------------------------ |
| `src/lib/server-fn-helpers.ts`  | `resolveUserId`, `withAuth`, `withMutation` HOFs |
| `src/lib/category-service.ts`   | Category + Feed CRUD server fns                  |
| `src/lib/items-service.ts`      | Feed item reads + read/bookmark mutations        |
| `src/lib/feed-service.ts`       | Add / refresh feed server fns                    |
| `src/lib/preference-service.ts` | Layout + theme preference server fns             |
| `src/lib/ai-service.ts`         | Article summary + weekly digest server fns       |
| `src/lib/url-guard.ts`          | Blocks non-http(s) and private-network Feed URLs |

---

## Tech Stack

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
| AI             | Google Gemini 2.5 Flash                |
