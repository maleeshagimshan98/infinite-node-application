import globals from 'globals';
import pluginJs from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';
import prettierPlugin from 'eslint-plugin-prettier';

/** @type {import('eslint').Linter.Config[]} */
export default [
  {
    files: ['src/**/*.{js,ts}'],
    ignores: ['node_modules', 'dist', 'build'],
    languageOptions: {
      globals: globals.node, // Enable Node.js global variables
      parser: tseslint.parser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        project: './tsconfig.json',
      },
    },
    plugins: {
      '@typescript-eslint': tseslint.plugin,
      prettier: prettierPlugin,
      import: 'eslint-plugin-import',
    },
    rules: {
      /** ✅ TypeScript Rules */
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/explicit-function-return-type': 'error',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/consistent-type-imports': 'error',

      /** ✅ Prettier Rules */
      'prettier/prettier': [
        'error',
        {
          endOfLine: 'lf', // Ensure LF (Line Feed) is used
          semi: true, // Require semicolons
          singleQuote: true, // Use single quotes
          trailingComma: 'all', // Use trailing commas
          printWidth: 120, // Wrap lines at 80 characters
          tabWidth: 2, // Indent with 2 spaces
        },
      ],

      /** ✅ Node.js & General JS Rules */
      'eol-last': ['error', 'always'], // Ensure LF at the end of files
      'linebreak-style': ['error', 'unix'], // Enforce LF (Unix-style EOL)
      'no-console': 'warn', // Warn on console.log usage
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      'import/order': [
        'error',
        {
          groups: [
            'builtin', // Node.js built-ins
            'external', // npm packages (e.g., 'redis')
            'internal', // Aliased paths (e.g., '@/application')
            ['parent', 'sibling'], // Relative paths
            'index',
            'object',
            'type',
          ],
          pathGroups: [
            {
              pattern: '@/**',
              group: 'internal',
              position: 'before',
            },
          ],
          pathGroupsExcludedImportTypes: ['builtin'],
          'newlines-between': 'always',
          alphabetize: {
            order: 'asc',
            caseInsensitive: true,
          },
        },
      ],
    },
  },
  pluginJs.configs.recommended,
  ...tseslint.configs.recommended,
  prettier, // Disable conflicting ESLint rules that Prettier handles
];
