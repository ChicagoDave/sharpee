/**
 * @module @sharpee/zifmia/server/web
 * @purpose Registers `@fastify/static` so the Fastify server hosts
 *   the built web bundle (`dist/web/`) on the same port as the API.
 *   ADR-175 requires a single-container deployment; this module is
 *   the seam.
 * @owner Zifmia server.
 *
 * When the bundle directory is absent — e.g., tests that didn't run
 * the web build, or a server started before `pnpm build:web` — the
 * registration is skipped silently. The API surface remains
 * available; only the browser-facing static assets are missing.
 */

import { existsSync, statSync } from 'node:fs';
import { resolve } from 'node:path';

import fastifyStatic from '@fastify/static';
import type { FastifyInstance } from 'fastify';

export interface WebRouteOptions {
  /** Absolute path to the directory containing `index.html` and the
   * vite build output. Defaults to `<server-dist>/web` — i.e., the
   * sibling `web/` directory next to the running `dist/index.js`. */
  webRoot?: string;
  /** When true, throw if `webRoot` is missing. Used by integration
   * tests that intend to assert the static path is served. Default
   * `false` — runtime servers tolerate a missing web build. */
  required?: boolean;
}

/**
 * Mount the web bundle. Resolves the default path lazily so tests
 * can override and so module-load order does not require the bundle
 * to exist on disk.
 */
export async function registerWebRoutes(
  app: FastifyInstance,
  options: WebRouteOptions = {}
): Promise<void> {
  const webRoot = options.webRoot ?? defaultWebRoot();

  if (!directoryExists(webRoot)) {
    if (options.required) {
      throw new Error(
        `[zifmia] webRoot does not exist: ${webRoot} — run \`pnpm build:web\` first.`
      );
    }
    return;
  }

  await app.register(fastifyStatic, {
    root: webRoot,
    prefix: '/',
    index: ['index.html'],
    // Wildcard so client-side asset URLs (e.g. /assets/main-<hash>.js
    // emitted by Vite) resolve. SPA-fallback to index.html for unknown
    // paths is added in later sub-phases once hash-routing requires it.
    wildcard: false
  });
}

function defaultWebRoot(): string {
  // At runtime the server runs from `<pkg>/dist/server/web.js`, so
  // `../../web` resolves to `<pkg>/dist/web` — the directory Vite
  // emits the bundle into. tsconfig keeps the project on CommonJS,
  // so `__dirname` is the canonical form here.
  return resolve(__dirname, '..', 'web');
}

function directoryExists(path: string): boolean {
  try {
    return existsSync(path) && statSync(path).isDirectory();
  } catch {
    return false;
  }
}
