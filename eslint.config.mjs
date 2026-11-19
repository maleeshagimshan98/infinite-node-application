import globals from 'globals';
import pluginJs from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';
import prettierPlugin from 'eslint-plugin-prettier';
import importPlugin from 'eslint-plugin-import';
import jsdoc from 'eslint-plugin-jsdoc';

// Every function-like node whose JSDoc block the jsdoc rules inspect. Setting `contexts` replaces a rule's defaults,
// so the defaults are listed too.
const JSDOC_CONTEXTS = [
  'FunctionDeclaration',
  'FunctionExpression',
  'ArrowFunctionExpression',
  'TSDeclareFunction',
  'TSMethodSignature',
  'TSAbstractMethodDefinition',
];

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
      import: importPlugin,
    },
    rules: {
      /** ✅ TypeScript Rules */
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/explicit-function-return-type': 'error',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/return-await': ['error', 'error-handling-correctness-only'],

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
        },
      ],
    },
  },
  {
    /** ✅ JSDoc Rules (CLAUDE.md §12.5): every function and method, in every layer */
    files: ['src/**/*.ts'],
    ignores: ['src/**/*.spec.ts'],
    plugins: {
      jsdoc,
    },
    settings: {
      jsdoc: {
        mode: 'typescript',
        // `@extends` over its synonym `@augments`, as the codebase already writes it.
        tagNamePreference: { augments: 'extends' },
        // A class's @implements / @extends tag (or a method's @override) must not exempt its methods from the rules.
        implementsReplacesDocs: false,
        augmentsExtendsReplacesDocs: false,
        overrideReplacesDocs: false,
      },
    },
    rules: {
      'jsdoc/require-jsdoc': [
        'error',
        {
          require: { FunctionDeclaration: true, MethodDefinition: true },
          contexts: [
            'TSMethodSignature',
            'TSAbstractMethodDefinition',
            'ExportNamedDeclaration > VariableDeclaration > VariableDeclarator > ArrowFunctionExpression',
          ],
          // Trivial getters / setters and constructors are exempt (§12.5).
          checkConstructors: false,
          checkGetters: false,
          checkSetters: false,
          // The fixer would insert an empty block; write it by hand.
          enableFixer: false,
        },
      ],
      'jsdoc/require-description': ['error', { contexts: JSDOC_CONTEXTS }],
      // The fixers would insert empty placeholder tags; write the tags by hand.
      'jsdoc/require-param': ['error', { contexts: JSDOC_CONTEXTS, checkDestructured: false, enableFixer: false }],
      'jsdoc/require-param-type': ['error', { contexts: JSDOC_CONTEXTS }],
      'jsdoc/require-param-description': ['error', { contexts: JSDOC_CONTEXTS }],
      'jsdoc/check-param-names': ['error', { checkDestructured: false }],
      'jsdoc/require-returns': [
        'error',
        {
          contexts: JSDOC_CONTEXTS,
          forceRequireReturn: true,
          forceReturnsWithAsync: true,
          checkGetters: false, // a getter's summary says what it returns (§12.5 exemption)
          enableFixer: false,
        },
      ],
      'jsdoc/require-returns-type': ['error', { contexts: JSDOC_CONTEXTS }],
      // Catches only a `throw` written in the function itself; errors from calls are checked in review.
      'jsdoc/require-throws': 'error',
      'jsdoc/require-throws-type': 'error',
      'jsdoc/check-tag-names': 'error',
      'jsdoc/valid-types': 'error',
      // The default tag sequence orders @param → @returns → @throws; blank lines between tags (e.g. before an
      // @example) are left to tag-lines.
      'jsdoc/sort-tags': ['error', { reportIntraTagGroupSpacing: false }],
      // One blank line between the summary and the first tag.
      'jsdoc/tag-lines': ['error', 'any', { startLines: 1 }],
    },
  },
  pluginJs.configs.recommended,
  ...tseslint.configs.recommended,
  prettier, // Disable conflicting ESLint rules that Prettier handles
];
