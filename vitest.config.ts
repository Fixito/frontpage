import { defineConfig } from 'vitest/config';

// Separate from vite.config.ts so tests skip the app plugins (TanStack Start,
// Nitro, devtools) and its .env loading: DB-backed tests use PGLite, never the
// DATABASE_URL from .env. See src/test/db.ts.
export default defineConfig({
	resolve: { tsconfigPaths: true },
	test: {
		environment: 'node',
		include: ['src/**/*.test.{ts,tsx}'],
	},
});
