/**
 * Vite configuration for the Sharpee multi-user browser client.
 *
 * Public interface: default-exported Vite UserConfig.
 *
 * Bounded context: client build tooling (ADR-153 frontend).
 *
 * The dev server proxies HTTP (`/api`), WebSocket (`/ws`), and deep-link
 * (`/r/:code`) paths to the local Node server so a running `vite dev` behaves
 * like the production deploy where the Node server fronts both API and static
 * assets.
 */

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const SERVER_TARGET = 'http://localhost:8080';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: false,
    proxy: {
      '/api': {
        target: SERVER_TARGET,
        changeOrigin: true,
      },
      '/ws': {
        target: SERVER_TARGET,
        changeOrigin: true,
        ws: true,
      },
      '/r': {
        target: SERVER_TARGET,
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: true,
  },
});
