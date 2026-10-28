// src/scripts/migrate.ts
// Applies the Drizzle migrations in drizzle/ that the database hasn't run yet.
// Run: pnpm db:migrate (reads .env locally; Vercel production builds run it too,
// see src/scripts/vercel-build.sh).
//
// All pending migrations run in one transaction: on any error nothing is applied
// and the process exits non-zero, which fails the deploy.

import { Pool } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { migrate } from 'drizzle-orm/neon-serverless/migrator';

const databaseUrl = process.env['DATABASE_URL'];
if (!databaseUrl) throw new Error('DATABASE_URL not set');

// A WebSocket pool, not neon-http: the migrator needs an interactive transaction.
const pool = new Pool({ connectionString: databaseUrl });

try {
	await migrate(drizzle(pool), { migrationsFolder: 'drizzle' });
	console.log('✓ Database migrations applied');
} finally {
	await pool.end();
}
