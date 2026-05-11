import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
    pool: 'forks'
  },
  // Force resolution to use CJS `main` entries for the @sharpee/* workspace
  // packages. The ESM `dist-esm` builds re-export the same symbol under
  // multiple names (e.g. `EnglishLanguageProvider` and its
  // `LanguageProvider` alias both from `./language-provider`), which
  // trips vite-node's `exportAll` into an infinite-getter cycle. The CJS
  // build has the same re-exports but Node's CJS loader handles the
  // collision correctly. Until the @sharpee/* packages flatten their
  // ESM re-exports, the test runner stays on CJS.
  resolve: {
    conditions: ['node']
  }
});
