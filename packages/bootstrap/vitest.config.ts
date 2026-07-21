import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
  resolve: {
    alias: {
      // ext-testing's exports map routes the "import" condition to a
      // dist-esm build its build script does not produce; alias to the
      // CJS dist so tests that import bootstrap's index resolve it.
      '@sharpee/ext-testing': resolve(__dirname, '../extensions/testing/dist/index.js'),
    },
  },
});
