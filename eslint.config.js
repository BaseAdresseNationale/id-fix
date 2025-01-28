import globals from 'globals';
import typescriptEslint from '@typescript-eslint/eslint-plugin';
import prettier from 'eslint-plugin-prettier';
import tsParser from '@typescript-eslint/parser';
import eslintConfigPrettier from 'eslint-config-prettier';
import eslintPluginImport from 'eslint-plugin-import';
import eslintPluginN from 'eslint-plugin-n';
import eslintPluginPromise from 'eslint-plugin-promise';

export default [
  { ignores: ['node_modules', 'dist'] },
  {
    files: ['src/**/*.ts'], // Apply rules to all JavaScript files
    plugins: {
      '@typescript-eslint': typescriptEslint,
      prettier,
      eslintPluginImport,
      eslintPluginN,
      eslintPluginPromise,
    },

    languageOptions: {
      globals: {
        ...globals.node,
      },

      parser: tsParser,
      ecmaVersion: 'latest',
      sourceType: 'module',
    },

    rules: {
      'no-unused-vars': 1,
    },
  },
  eslintConfigPrettier,
];
