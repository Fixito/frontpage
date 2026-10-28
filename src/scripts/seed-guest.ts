// src/scripts/seed-guest.ts
// Run: pnpm seed (safe to re-run: it only adds what's missing)
// Output: GUEST_DEMO_USER_ID=<id> — add this to your .env file

import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { seedGuest } from '../lib/guest-seed.server';
import * as schema from '../db/schema';

// Standalone connection — not the lazy proxy from db.ts.
const databaseUrl = process.env['DATABASE_URL'];
if (!databaseUrl) throw new Error('DATABASE_URL not set');
const db = drizzle(neon(databaseUrl), { schema });

seedGuest(db)
	.then((userId) => {
		console.log('\n---');
		console.log('GUEST_DEMO_USER_ID=' + userId);
		console.log('Add this to your .env file.');
	})
	.catch((err: unknown) => {
		console.error(err);
		process.exit(1);
	});
