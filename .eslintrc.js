module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended'
  ],
  rules: {
    // Custom rules here
  },
  overrides: [
    {
      // Enforce no-explicit-any in package source files (non-test)
      files: ['packages/*/src/**/*.ts'],
      excludedFiles: ['**/*.test.ts', '**/*.spec.ts'],
      rules: {
        '@typescript-eslint/no-explicit-any': 'warn'
      }
    }
  ]
};
