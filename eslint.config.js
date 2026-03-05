import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import astroPlugin from 'eslint-plugin-astro';

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.strict,
  ...astroPlugin.configs.recommended,
  {
    ignores: ['dist/', '.astro/', 'node_modules/', '.yarn/'],
  },
);
