import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import type { PgDatabase, PgQueryResultHKT } from 'drizzle-orm/pg-core';
import * as schema from '@/db/schema';

function createDb() {
	const url = process.env['DATABASE_URL'];
	if (!url) throw new Error('DATABASE_URL environment variable is not set');
	return drizzle(neon(url), { schema });
}

type NeonDb = ReturnType<typeof createDb>;

/**
 * Any Drizzle Postgres database over the app schema: the Neon instance in
 * production, PGLite in tests. See "Database Seam" in GLOSSARY.md.
 */
export type Database = PgDatabase<PgQueryResultHKT, typeof schema>;

// Lazy singleton — process.env is only read on the first actual DB call,
// not at module import time. This avoids a race with Nitro's .env loading.
let _db: NeonDb | undefined;

function getInstance(): NeonDb {
	if (!_db) _db = createDb();
	return _db;
}

export const db = new Proxy({} as NeonDb, {
	get(_, prop: string | symbol) {
		const instance = getInstance();
		const value = (instance as unknown as Record<string | symbol, unknown>)[prop];
		return typeof value === 'function'
			? (value as (...args: Array<unknown>) => unknown).bind(instance)
			: value;
	},
});
