import { defineConfig, loadEnv } from 'vite';
import { devtools } from '@tanstack/devtools-vite';
import tsconfigPaths from 'vite-tsconfig-paths';

import { tanstackStart } from '@tanstack/react-start/plugin/vite';

import viteReact from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { nitro } from 'nitro/vite';

export default defineConfig(({ mode }) => {
	// Load all .env variables (no prefix filter) and inject into process.env
	// so server-side code (Nitro/server functions) can read them via process.env.
	const env = loadEnv(mode, process.cwd(), '');
	Object.assign(process.env, env);

	return {
		plugins: [
			devtools(),
			nitro({ rollupConfig: { external: [/^@sentry\//] } }),
			tsconfigPaths({ projects: ['./tsconfig.json'] }),
			tailwindcss(),
			tanstackStart(),
			viteReact(),
		],
	};
});
