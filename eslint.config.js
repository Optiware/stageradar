import js from '@eslint/js';
import { defineConfig, globalIgnores } from 'eslint/config';
import prettier from 'eslint-config-prettier';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default defineConfig(
  globalIgnores([
    '**/node_modules/**',
    '**/dist/**',
    '**/dev-dist/**',
    '**/playwright-report/**',
    '**/test-results/**',
    // Edge Functions : exécutées par Deno, vérifiées par `deno lint`
    'supabase/functions/**',
  ]),
  js.configs.recommended,
  tseslint.configs.recommended,
  {
    files: ['apps/web/src/**/*.{ts,tsx}'],
    extends: [reactHooks.configs.flat.recommended],
    languageOptions: { globals: globals.browser },
  },
  {
    files: [
      'packages/**/*.ts',
      'packages/*/*.mjs',
      'apps/web/*.ts',
      'apps/web/e2e/**/*.ts',
      '*.js',
      'deploy/**/*.mjs',
    ],
    languageOptions: { globals: globals.node },
  },
  {
    // Script du service worker (réception des notifications).
    files: ['apps/web/public/*.js'],
    languageOptions: { globals: globals.serviceworker },
  },
  prettier,
);
