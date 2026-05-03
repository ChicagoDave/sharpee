import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'happy-dom',
    include: ['tests/**/*.test.ts'],
    exclude: ['**/node_modules/**', '**/dist/**'],
  },
  resolve: {
    alias: {
      '@sharpee/core': resolve(__dirname, '../core/src'),
      '@sharpee/if-domain': resolve(__dirname, '../if-domain/src'),
      '@sharpee/text-blocks': resolve(__dirname, '../text-blocks/src'),
      '@sharpee/channel-service': resolve(__dirname, '../channel-service/src'),
    },
  },
});
