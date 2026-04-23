/**
 * App-level behavior tests — static file serving + SPA fallback.
 *
 * Behavior Statement — installStaticSpa
 *   DOES: for non-API, non-WS GETs, resolves paths with extensions against
 *         clientDistDir (serving the file when it exists), and falls back
 *         to dist/index.html for extension-less paths so client-side
 *         routing works.
 *   WHEN: a GET request hits the app and reaches the catch-all.
 *   BECAUSE: the multi-user browser client is served out of the same Node
 *            process as the API (ADR-153 frontend — closes `/` → 404 gap).
 *   REJECTS WHEN: /api/* paths never fall back (returns 404 envelope);
 *                 /ws* paths return 426; paths that escape dist via `..`
 *                 are rejected as 404.
 */

import { afterEach, describe, expect, it } from 'vitest';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildTestApp, type TestAppHandle } from '../helpers/test-app.js';

interface HarnessHandle extends TestAppHandle {
  distDir: string;
}

/** Build a test app with a fake client dist tree at a temp path. */
function buildAppWithDist(opts: {
  indexHtml?: string | null;
  extraFiles?: Record<string, string>;
}): HarnessHandle {
  const distDir = mkdtempSync(join(tmpdir(), 'sharpee-clientdist-'));
  mkdirSync(distDir, { recursive: true });
  if (opts.indexHtml !== null) {
    writeFileSync(
      join(distDir, 'index.html'),
      opts.indexHtml ?? '<!doctype html><html><body>SPA OK</body></html>',
    );
  }
  if (opts.extraFiles) {
    for (const [rel, content] of Object.entries(opts.extraFiles)) {
      const full = join(distDir, rel);
      mkdirSync(join(full, '..'), { recursive: true });
      writeFileSync(full, content);
    }
  }

  const handle = buildTestApp({ stories: ['zork'], clientDistDir: distDir });
  const original = handle.cleanup;
  return {
    ...handle,
    distDir,
    cleanup: () => {
      original();
      rmSync(distDir, { recursive: true, force: true });
    },
  };
}

describe('HTTP app — static + SPA fallback', () => {
  let h: HarnessHandle | undefined;

  afterEach(() => {
    h?.cleanup();
    h = undefined;
  });

  it('GET / returns SPA index.html when dist is present', async () => {
    h = buildAppWithDist({ indexHtml: '<!doctype html><title>Sharpee SPA</title>' });
    const res = await h.fetch('/');
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toMatch(/text\/html/);
    const body = await res.text();
    expect(body).toContain('Sharpee SPA');
  });

  it('GET /some/client/route falls back to index.html', async () => {
    h = buildAppWithDist({ indexHtml: '<!doctype html>FALLBACK' });
    const res = await h.fetch('/room/abc-123');
    expect(res.status).toBe(200);
    expect(await res.text()).toContain('FALLBACK');
  });

  it('GET /assets/foo.js serves the file when it exists', async () => {
    h = buildAppWithDist({
      extraFiles: { 'assets/foo.js': 'export const x = 1;' },
    });
    const res = await h.fetch('/assets/foo.js');
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toMatch(/javascript/);
    expect(await res.text()).toBe('export const x = 1;');
  });

  it('GET /assets/missing.js returns 404, not SPA HTML', async () => {
    h = buildAppWithDist({});
    const res = await h.fetch('/assets/missing.js');
    expect(res.status).toBe(404);
  });

  it('GET /api/unknown still 404s — no SPA fallback on /api', async () => {
    h = buildAppWithDist({});
    const res = await h.fetch('/api/unknown');
    expect(res.status).toBe(404);
    // Must be a JSON envelope, not HTML.
    const raw = await res.text();
    expect(raw).not.toContain('<html');
    const body = JSON.parse(raw) as { code: string };
    expect(body.code).toBe('not_found');
  });

  it('GET /ws returns 426 Upgrade Required, not SPA HTML', async () => {
    h = buildAppWithDist({});
    const res = await h.fetch('/ws');
    expect(res.status).toBe(426);
  });

  it('GET /api/rooms still works (static catch-all must be installed AFTER api routes)', async () => {
    h = buildAppWithDist({});
    const res = await h.fetch('/api/rooms');
    expect(res.status).toBe(200);
    const body = (await res.json()) as { rooms: unknown[] };
    expect(body.rooms).toEqual([]);
  });

  it('GET /r/:code still returns the resolve-code JSON (not SPA HTML)', async () => {
    // This test documents Phase 2's decision: /r/:code keeps its existing
    // JSON contract. Content negotiation / SPA-for-/r can be added later.
    h = buildAppWithDist({});
    const res = await h.fetch('/r/NOPE99');
    expect(res.status).toBe(404);
    const raw = await res.text();
    expect(raw).not.toContain('<html');
    const body = JSON.parse(raw) as { code: string };
    expect(body.code).toBe('room_not_found');
  });

  it('without a client dist dir configured, non-API GETs 404 cleanly', async () => {
    const handle = buildTestApp({ stories: ['zork'] });
    try {
      const res = await handle.fetch('/');
      expect(res.status).toBe(404);
    } finally {
      handle.cleanup();
    }
  });

  it('serves index.html with window.__SHARPEE_CONFIG__ injected and no secrets', async () => {
    h = buildAppWithDist({
      indexHtml: '<!doctype html><html><body><!--SHARPEE_CONFIG--><div id="root"></div></body></html>',
    });
    const res = await h.fetch('/');
    expect(res.status).toBe(200);
    const html = await res.text();
    // Placeholder was substituted.
    expect(html).not.toContain('<!--SHARPEE_CONFIG-->');
    expect(html).toContain('window.__SHARPEE_CONFIG__');
    // Public fields appear.
    expect(html).toMatch(/"provider":"none"/);
    expect(html).toMatch(/"siteKey":""/);
    // Secrets / internal fields MUST NOT appear.
    expect(html).not.toMatch(/secret/i);
    expect(html).not.toMatch(/bypass/);
    expect(html).not.toMatch(/dbPath/i);
  });
});
