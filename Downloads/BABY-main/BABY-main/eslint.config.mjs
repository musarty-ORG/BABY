import js from '@eslint/js'
import nextConfig from 'eslint-config-next'
import prettierConfig from 'eslint-config-prettier'
import prettierPlugin from 'eslint-plugin-prettier'
import tseslint from '@typescript-eslint/eslint-plugin'
import tsparser from '@typescript-eslint/parser'

export default [
  {
    ignores: [
      '.next/**',
      'node_modules/**',
      'out/**',
      'build/**',
      '*.config.js',
      '*.config.mjs',
    ],
  },
  js.configs.recommended,
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
    },
    plugins: {
      '@typescript-eslint': tseslint,
      prettier: prettierPlugin,
    },
    rules: {
      ...tseslint.configs.recommended.rules,
      ...prettierConfig.rules,
      'prettier/prettier': 'error',
      '@typescript-eslint/no-unused-vars': 'warn',
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },
  {
    files: ['**/*.js', '**/*.jsx'],
    rules: {
      ...prettierConfig.rules,
      'prettier/prettier': 'error',
    },
  },
  // Next.js config - applied last to override
  {
    ...nextConfig,
    files: ['**/*.js', '**/*.jsx', '**/*.ts', '**/*.tsx'],
  },
]
