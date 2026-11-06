import js from '@eslint/js';

const nodeGlobals = {
  __dirname: 'readonly',
  __filename: 'readonly',
  Buffer: 'readonly',
  console: 'readonly',
  module: 'writable',
  process: 'readonly',
  require: 'readonly'
};

export default [
  // website/ is the old Docusaurus site, with its own tooling
  { ignores: ['coverage/**', 'node_modules/**', 'website/**'] },
  js.configs.recommended,
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 2025,
      sourceType: 'commonjs',
      globals: nodeGlobals
    },
    // the rules of the old .eslintrc, except valid-jsdoc, which ESLint no longer has
    rules: {
      // possible errors
      'no-extra-parens': 'warn',
      // best practices
      complexity: ['error', 8],
      'default-case': 'error',
      'guard-for-in': 'error',
      'no-alert': 'warn',
      'no-floating-decimal': 'warn',
      'no-self-compare': 'error',
      'no-throw-literal': 'error',
      'no-void': 'error',
      'quote-props': ['error', 'as-needed'],
      'vars-on-top': 'error',
      'wrap-iife': 'error',
      // strict mode
      strict: ['error', 'global'],
      // variables
      'no-unused-vars': ['error', { args: 'after-used', caughtErrors: 'none' }],
      // node.js
      'handle-callback-err': ['error', '^.*(e|E)rr'],
      'no-new-require': 'error',
      'no-path-concat': 'error',
      // stylistic issues
      'brace-style': ['error', '1tbs', { allowSingleLine: true }],
      'comma-style': ['error', 'last'],
      indent: ['error', 2, { SwitchCase: 1 }],
      'max-nested-callbacks': ['error', 4],
      'newline-after-var': ['error', 'always'],
      'no-nested-ternary': 'error',
      'no-trailing-spaces': 'error',
      'no-unneeded-ternary': 'warn',
      quotes: ['error', 'single', 'avoid-escape'],
      semi: ['error', 'always'],
      'keyword-spacing': 'error',
      'space-before-blocks': ['error', 'always'],
      'space-before-function-paren': ['error', { anonymous: 'always', named: 'never' }],
      'space-infix-ops': ['warn', { int32Hint: false }],
      'spaced-comment': ['error', 'always'],
      // es6
      'generator-star-spacing': ['error', 'before'],
      // legacy jshint rules
      'max-depth': ['error', 4],
      'max-params': ['error', 4]
    }
  },
  {
    // tests: describe/it nesting and fixtures need more room
    files: ['**/*.test.js', 'test/**/*.js'],
    rules: {
      complexity: 'off',
      'max-nested-callbacks': 'off',
      'max-params': 'off',
      'newline-after-var': 'off'
    }
  },
  {
    files: ['**/*.mjs'],
    languageOptions: { ecmaVersion: 2025, sourceType: 'module', globals: nodeGlobals }
  }
];
