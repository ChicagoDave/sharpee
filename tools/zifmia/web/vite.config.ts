/**
 * Vite config for the zifmia web client. Per ADR-170, the client is
 * framework-free — vite is just the bundler/dev-server, not a
 * framework dependency.
 *
 * Output → `tools/zifmia/dist/web/`, served by Fastify's
 * `@fastify/static` plugin from the same origin as the API.
 */

import { defineConfig } from 'vite';
import { resolve } from 'node:path';

export default defineConfig({
  root: __dirname,
  base: './',
  build: {
    outDir: resolve(__dirname, '..', 'dist', 'web'),
    emptyOutDir: true,
    sourcemap: true,
    target: 'es2020',
    rollupOptions: {
      input: resolve(__dirname, 'index.html')
    }
  },
  server: {
    port: 5173,
    proxy: {
      // Dev-server convenience: forward API + WS to the running
      // zifmia server. Production serves from the same origin.
      '/api': { target: 'http://127.0.0.1:3000', changeOrigin: true },
      '/ws': { target: 'ws://127.0.0.1:3000', ws: true }
    }
  }
});
