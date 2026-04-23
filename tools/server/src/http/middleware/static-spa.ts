/**
 * Static-file + SPA-fallback middleware for the multi-user browser client.
 *
 * Public interface: {@link installStaticSpa}, {@link StaticSpaOptions}.
 *
 * Bounded context: HTTP layer (ADR-153 frontend — closes the `/` → 404 gap
 * observed in session-20260422-0508 by serving the built client out of the
 * same Node process).
 *
 * Behaviour:
 *   - GET requests to `/api/*` are never SPA-fallbacked; if no API route
 *     matched earlier, a `not_found` envelope is returned.
 *   - GET requests to `/ws` / `/ws/*` return 426 so accidental browser hits
 *     do not silently serve HTML.
 *   - Paths that look like files (have an extension) are served from disk if
 *     they exist under the configured dist directory; otherwise 404.
 *   - Paths with no extension — the SPA's own routes — resolve to the SPA's
 *     `index.html` so React Router (or the hand-rolled router) can handle
 *     them client-side.
 *   - When {@link StaticSpaOptions.distDir} is unset, the middleware is a
 *     no-op, which is the right behaviour for tests and for dev-mode where
 *     the Vite dev server handles the client.
 *
 * Path traversal is defended against: any resolved path that escapes the
 * dist root is rejected with a 404.
 */

import { existsSync, readFileSync, statSync } from 'node:fs';
import { extname, join, resolve, sep } from 'node:path';
import type { Hono } from 'hono';

export interface StaticSpaOptions {
  /**
   * Absolute path to the built client's `dist/` directory. When undefined,
   * the middleware is not installed — the server returns its default 404
   * for unmatched paths. Set in production (Docker) via the
   * `CLIENT_DIST_DIR` env var.
   */
  distDir: string | undefined;
  /**
   * Optional HTML fragment to substitute for the `<!--SHARPEE_CONFIG-->`
   * placeholder when serving `index.html`. Typically a single
   * `<script>window.__SHARPEE_CONFIG__ = {...};</script>` tag. When
   * undefined, the placeholder is left in place (a no-op comment).
   *
   * Secrets — `captcha.secret_key`, DB credentials, etc. — MUST NEVER be
   * interpolated into this fragment. The server is responsible for building
   * a strictly-public slice of its config before passing it in.
   */
  configScript?: string;
}

/** The placeholder token clients bake into their built index.html. */
const CONFIG_PLACEHOLDER = '<!--SHARPEE_CONFIG-->';

/** Minimal MIME map for the few extensions a Vite-built SPA emits. */
const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.txt': 'text/plain; charset=utf-8',
};

function mimeFor(pathname: string): string {
  return MIME[extname(pathname).toLowerCase()] ?? 'application/octet-stream';
}

/** Install the static + SPA middleware as a GET catch-all on the given app. */
export function installStaticSpa(app: Hono, options: StaticSpaOptions): void {
  const distDir = options.distDir ? resolve(options.distDir) : undefined;
  const distPrefix = distDir ? distDir + sep : undefined;
  const configScript = options.configScript;

  app.get('*', (c) => {
    const pathname = new URL(c.req.url).pathname;

    // API paths: never fall back to the SPA. If no /api/* route matched above,
    // the request is a genuine 404.
    if (pathname === '/api' || pathname.startsWith('/api/')) {
      return c.json(
        { code: 'not_found', detail: `${pathname} not found` },
        404,
      );
    }

    // WebSocket path: do not serve HTML here. The real WS upgrade is handled
    // by the Node HTTP server before Hono ever sees the request; a plain GET
    // that lands here is a misuse.
    if (pathname === '/ws' || pathname.startsWith('/ws/')) {
      return c.text('WebSocket endpoint — upgrade required', 426);
    }

    // No client built — give Hono's default 404 handler a chance.
    if (!distDir || !distPrefix) {
      return c.notFound();
    }

    const hasExtension = /\.[a-z0-9]+$/i.test(pathname);
    const candidate = hasExtension
      ? resolve(join(distDir, pathname))
      : resolve(join(distDir, 'index.html'));

    // Defence against `..` traversal: the resolved path must stay under distDir.
    if (!candidate.startsWith(distPrefix) && candidate !== distDir) {
      return c.notFound();
    }

    if (!existsSync(candidate)) {
      // File-like path that does not exist OR no index.html (dist not built).
      return c.notFound();
    }

    const stat = statSync(candidate);
    if (!stat.isFile()) {
      return c.notFound();
    }

    // When we're about to serve index.html and a config script was provided,
    // substitute the placeholder. All other files are served as-is.
    if (configScript && candidate.toLowerCase().endsWith('index.html')) {
      const html = readFileSync(candidate, 'utf8').replace(
        CONFIG_PLACEHOLDER,
        configScript,
      );
      return c.body(html, 200, { 'Content-Type': mimeFor(candidate) });
    }

    const body = readFileSync(candidate);
    return c.body(body, 200, { 'Content-Type': mimeFor(candidate) });
  });
}
