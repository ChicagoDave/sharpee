/**
 * @module tests/server/web.test
 * @purpose Integration test for the `@fastify/static` registration in
 *   `tools/zifmia/src/server/web.ts`. Drives the real Fastify
 *   instance against a real temp directory acting as the bundle root
 *   — no stubs, no mocks. ADR-175 single-container deployment
 *   requires the web bundle and the API to share a port.
 * @owner Zifmia server tests.
 *
 * Integration Reality Statement:
 * - OWNED: Fastify server (subprocess of vitest), SQLite in-memory
 *   adapter, on-disk temp directory containing index.html
 * - EXTERNAL: none
 * - REAL-PATH TEST: GET / and GET /assets/foo.js both go through the
 *   registered static plugin against on-disk files
 * - STUB JUSTIFICATION: none
 */

import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { startServer, type ZifmiaServerHandle } from '../../src/server';
import { SqliteAdapter } from '../../src/storage/sqlite/sqlite-adapter';

describe('Web bundle (static assets)', () => {
  let handle: ZifmiaServerHandle;
  let webRoot: string;
  const base = (): string => `http://127.0.0.1:${handle.port}`;

  beforeEach(() => {
    webRoot = mkdtempSync(join(tmpdir(), 'zifmia-web-'));
    writeFileSync(
      join(webRoot, 'index.html'),
      '<!doctype html><html><body>zifmia-test-shell</body></html>'
    );
    mkdirSync(join(webRoot, 'assets'));
    writeFileSync(
      join(webRoot, 'assets', 'main.js'),
      '// zifmia-test-asset\nconsole.log("ok");\n'
    );
  });

  afterEach(async () => {
    if (handle) await handle.close();
    rmSync(webRoot, { recursive: true, force: true });
  });

  it('serves index.html at /', async () => {
    handle = await startServer({
      adapter: new SqliteAdapter({ filename: ':memory:' }),
      port: 0,
      host: '127.0.0.1',
      packageVersion: '0.1.0-test',
      webRoot
    });

    const res = await fetch(`${base()}/`);
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toMatch(/text\/html/);
    const body = await res.text();
    expect(body).toContain('zifmia-test-shell');
  });

  it('serves bundle assets under /assets/', async () => {
    handle = await startServer({
      adapter: new SqliteAdapter({ filename: ':memory:' }),
      port: 0,
      host: '127.0.0.1',
      packageVersion: '0.1.0-test',
      webRoot
    });

    const res = await fetch(`${base()}/assets/main.js`);
    expect(res.status).toBe(200);
    expect(await res.text()).toContain('zifmia-test-asset');
  });

  it('does not shadow API routes', async () => {
    handle = await startServer({
      adapter: new SqliteAdapter({ filename: ':memory:' }),
      port: 0,
      host: '127.0.0.1',
      packageVersion: '0.1.0-test',
      webRoot
    });

    // /health is an API route; the static plugin must not catch it.
    const res = await fetch(`${base()}/health`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { ok: boolean };
    expect(body.ok).toBe(true);
  });

  it('returns 404 for unknown asset paths (no SPA fallback in 6a)', async () => {
    handle = await startServer({
      adapter: new SqliteAdapter({ filename: ':memory:' }),
      port: 0,
      host: '127.0.0.1',
      packageVersion: '0.1.0-test',
      webRoot
    });

    const res = await fetch(`${base()}/does-not-exist.js`);
    expect(res.status).toBe(404);
  });

  it('silently skips registration when the bundle directory is missing', async () => {
    handle = await startServer({
      adapter: new SqliteAdapter({ filename: ':memory:' }),
      port: 0,
      host: '127.0.0.1',
      packageVersion: '0.1.0-test',
      webRoot: '/this/path/does/not/exist'
    });

    // API routes still reachable.
    const api = await fetch(`${base()}/health`);
    expect(api.status).toBe(200);

    // / returns 404 because no static handler is registered.
    const root = await fetch(`${base()}/`);
    expect(root.status).toBe(404);
  });
});
