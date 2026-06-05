const js = require('@eslint/js')
const globals = require('globals')

module.exports = [
  {
    ignores: ['node_modules/**', 'uploads/**', 'dist/**', 'coverage/**', 'scripts/**/*.mjs'],
  },
  js.configs.recommended,
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'commonjs',
      globals: {
        ...globals.node,
      },
    },
    rules: {
      'no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      'no-console': 'off',
      'no-empty': ['error', { allowEmptyCatch: true }],
    },
  },
]
