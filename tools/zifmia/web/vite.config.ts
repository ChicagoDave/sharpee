/**
 * vite.config.ts — Zifmia web bundle build.
 *
 * Root is `tools/zifmia/web/`; output is `tools/zifmia/dist/web/`,
 * which the Fastify `@fastify/static` plugin serves from the same
 * port as the API. Vite handles its own TypeScript via esbuild; the
 * adjacent `tsconfig.json` exists only for editor support.
 *
 * Per ADR-176, the web client is framework-free — vite is just the
 * bundler and dev server, not a framework dependency.
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
      // Dev-server convenience: forward API calls to the running
      // Zifmia server on :3000. Production serves the bundle from the
      // same origin so no proxy is needed.
      '/identity': 'http://127.0.0.1:3000',
      '/rooms': 'http://127.0.0.1:3000',
      '/stories': 'http://127.0.0.1:3000',
      '/admin': 'http://127.0.0.1:3000',
      '/health': 'http://127.0.0.1:3000'
    }
  }
});
