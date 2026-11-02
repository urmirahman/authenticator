import pluginNext from '@next/eslint-plugin-next';
import { globalIgnores } from 'eslint/config';
import { config as reactConfig } from './react-internal.js';

/** For Next.js apps. @type {import("eslint").Linter.Config[]} */
export const nextJsConfig = [
  ...reactConfig,
  globalIgnores(['.next/**', 'out/**', 'build/**', 'next-env.d.ts']),
  {
    plugins: { '@next/next': pluginNext },
    rules: {
      ...pluginNext.configs.recommended.rules,
      ...pluginNext.configs['core-web-vitals'].rules,
    },
  },
];
