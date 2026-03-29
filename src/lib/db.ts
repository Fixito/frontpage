import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from '@/db/schema';

function createDb() {
	const url = process.env['DATABASE_URL'];
	if (!url) throw new Error('DATABASE_URL environment variable is not set');
	return drizzle(neon(url), { schema });
}

export type DB = ReturnType<typeof createDb>;

// Lazy singleton — process.env is only read on the first actual DB call,
// not at module import time. This avoids a race with Nitro's .env loading.
let _db: DB | undefined;

function getInstance(): DB {
	if (!_db) _db = createDb();
	return _db;
}

export const db = new Proxy({} as DB, {
	get(_, prop: string | symbol) {
		const instance = getInstance();
		const value = (instance as unknown as Record<string | symbol, unknown>)[prop];
		return typeof value === 'function'
			? (value as (...args: Array<unknown>) => unknown).bind(instance)
			: value;
	},
});
