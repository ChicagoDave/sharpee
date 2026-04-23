/**
 * Vitest configuration for the Sharpee multi-user client.
 *
 * Public interface: default-exported Vitest UserConfig.
 *
 * Bounded context: client test tooling. Separate file from vite.config.ts so
 * the dev/build pipeline does not pay the cost of loading test-only plugins.
 */

import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'happy-dom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}', 'tests/**/*.test.{ts,tsx}'],
    css: false,
  },
});
