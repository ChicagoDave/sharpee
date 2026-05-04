import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    exclude: ['**/node_modules/**', '**/dist/**'],
  },
  resolve: {
    alias: {
      '@sharpee/core': resolve(__dirname, '../../packages/core/src'),
      '@sharpee/if-domain': resolve(__dirname, '../../packages/if-domain/src'),
      '@sharpee/text-blocks': resolve(__dirname, '../../packages/text-blocks/src'),
      '@sharpee/channel-service': resolve(__dirname, '../../packages/channel-service/src'),
    },
  },
});
