import { sql } from 'drizzle-orm';
import { feed } from '@/db/schema';

/**
 * A Feed's display title, as a select column: the User's custom title when set,
 * otherwise the title the Feed document declares.
 */
export const feedDisplayTitle = sql<string>`coalesce(${feed.customTitle}, ${feed.title})`;
