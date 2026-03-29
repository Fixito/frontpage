import { fixupPluginRules } from '@eslint/compat';
import { defineConfig } from 'eslint/config';
import { tanstackConfig } from '@tanstack/eslint-config';
import reactPlugin from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import prettier from 'eslint-config-prettier';

export default defineConfig(
	{ ignores: ['**/routeTree.gen.ts', 'dist/**', '.output/**', 'eslint.config.js'] },
	...tanstackConfig,
	// eslint-plugin-react is not yet ESLint v10 compatible — use fixupPluginRules shim
	{
		plugins: { react: fixupPluginRules(reactPlugin) },
		settings: { react: { version: 'detect' } },
		rules: {
			'react/jsx-no-target-blank': 'error',
			'react/no-children-prop': 'error',
			'react/no-danger': 'warn',
			'react/self-closing-comp': 'warn',
			'react/prop-types': 'off',
			'react/react-in-jsx-scope': 'off',
		},
	},
	reactHooks.configs.flat['recommended-latest'],
	jsxA11y.flatConfigs.recommended,
	prettier,
	{
		rules: {
			// Covered by strict tsconfig (noUnusedLocals / noUnusedParameters)
			'@typescript-eslint/no-unused-vars': 'off',
			// Warn instead of error — occasionally useful in generics
			'@typescript-eslint/no-explicit-any': 'warn',
		},
	},
);
