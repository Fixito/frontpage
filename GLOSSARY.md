# Frontpage — Domain & Architecture Context

A customizable RSS/Atom feed aggregator: fetch, parse, store, and read articles from public feed URLs, organised into user-defined categories, with a guest demo mode.

---

## Domain Glossary

| Term                | Definition                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Feed**            | A URL pointing to an RSS or Atom document. Stored in the `feed` table.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| **Custom Title**    | A title the User gives a Feed (`feed.customTitle`), shown instead of the title the Feed document declares (`feed.title`, rewritten on every refresh). Saving an empty title, or the Feed's own title, clears it.                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| **Remove (a Feed)** | Unsubscribe from a Feed: deletes the Feed and its Feed Items. The UI and its components say "Remove"; the server fn is `deleteFeed`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| **Feed Item**       | A single article parsed from a Feed. Stored in `feedItem`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| **Feed Ingestion**  | Fetching a Feed, storing the Feed Items it doesn't have yet, and recording its health (`ingestFeed` in `src/lib/feed-ingestion.server.ts`). Adding a Feed (`addFeed`) goes through the same fetch and parse, and rejects a URL the User already follows, compared after normalising scheme and host case and trailing slashes. A User follows a URL once: `feed_user_url_idx` makes (User, URL) unique, so concurrent adds of the same URL create one Feed, and a Feed that redirects to a URL its User already follows keeps its own URL. A Feed Item's identity is its guid, else its link, else a hash of title + published date; it is unique per Feed. |
| **Feed Health**     | `active` (last fetch succeeded), `error` (last fetch failed; the message is stored) or `stale` (last fetch succeeded but the newest Feed Item is over 30 days old). Set only by Feed Ingestion.                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| **Category**        | A user-defined group of Feeds. Belongs to a User.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| **Item Scope**      | Which Feed Items a list shows: `all`, one `feed`, one `category`, or `bookmarks` (`ItemScope` in `src/lib/item-scope.ts`), optionally unread only. `itemsInScope` turns (User, Item Scope) into the Feed Items that User can see, enforcing ownership once: a Feed or Category id of another User matches nothing. The UI's "All / Unread" toggle is the `show=unread` dashboard search param, kept by sidebar links.                                                                                                                                                                                                                                       |
| **Sidebar Data**    | The aggregated list of Categories + their Feeds, with unread counts (per Feed, per Category, total) and the Bookmark count, fetched once per session load. Every count goes through the Item Scope, so each badge equals what its list shows.                                                                                                                                                                                                                                                                                                                                                                                                               |
| **User**            | An authenticated Better Auth account with persistent prefs, history, and bookmarks.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| **Guest**           | An unauthenticated visitor identified by a guest cookie. All Guests view the same shared demo user and its curated tech feeds (the 19 in `data/sample-feeds.json`, seeded by `src/lib/guest-seed.server.ts`; a Feed whose fetch failed at seed time is left out), read-only: Guests cannot mutate anything (read state, bookmarks, feeds, preferences) and cannot use AI features.                                                                                                                                                                                                                                                                          |
| **Preference**      | Per-user layout (`list` \| `compact` \| `cards`) and theme (`light` \| `dark` \| `system`) stored in `userPreference`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| **Reading History** | The set of `feedItem` IDs a User has marked read (`read_state`). A Feed Item is **unread** for a User when it has no `read_state` row for them: item lists, Sidebar Data counts and the Weekly Digest share this one definition (`src/lib/item-scope.ts`).                                                                                                                                                                                                                                                                                                                                                                                                  |
| **Bookmark**        | A `feedItem` a User has saved.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| **Weekly Digest**   | An AI-generated summary of the top articles from the past 7 days, produced by Gemini 2.5 Flash. Authenticated users only.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| **AI Summary**      | A per-article structured summary cached in `feedItem.aiSummary`. Authenticated users only.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |

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

| File                               | Responsibility                                   |
| ---------------------------------- | ------------------------------------------------ |
| `src/lib/server-fn-helpers.ts`     | `resolveUserId`, `withAuth`, `withMutation` HOFs |
| `src/lib/category-service.ts`      | Category + Feed CRUD server fns                  |
| `src/lib/items-service.ts`         | Feed item reads + read/bookmark mutations        |
| `src/lib/item-scope.ts`            | Item Scope: which Feed Items a User sees         |
| `src/lib/feed-service.ts`          | Add / refresh feed server fns                    |
| `src/lib/feed-ingestion.server.ts` | Feed Ingestion: fetch, store, Feed Health        |
| `src/lib/preference-service.ts`    | Layout + theme preference server fns             |
| `src/lib/ai-service.ts`            | Article summary + weekly digest server fns       |
| `src/lib/url-guard.ts`             | Blocks non-http(s) and private-network Feed URLs |

### Database Seam

The module functions in `category-service`, `items-service`, `feed-service`, `feed-ingestion.server`, `guest-seed.server` and `ai-service` (`selectDigestItems`) take a `Database` (`src/lib/db.ts`) as their first argument instead of importing `db`. Their server fns pass the production Neon instance; tests pass an in-memory PGLite database. How to write such a test: the doc comment in `src/test/db.ts`.

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
