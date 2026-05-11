/**
 * @module tests/server/health.test
 * @purpose Verify `GET /health` returns the expected body shape with the
 *   adapter description. Used as the smoke test for `docker compose up`
 *   reachability (ADR-175 §AC-1).
 * @owner Zifmia server (tools/zifmia/tests/server).
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { startServer, type ZifmiaServerHandle } from '../../src/server';
import { SqliteAdapter } from '../../src/storage/sqlite/sqlite-adapter';

describe('GET /health', () => {
  let handle: ZifmiaServerHandle;

  beforeEach(async () => {
    handle = await startServer({
      adapter: new SqliteAdapter({ filename: ':memory:' }),
      port: 0, // ephemeral
      host: '127.0.0.1',
      packageVersion: '0.1.0-test'
    });
  });

  afterEach(async () => {
    await handle.close();
  });

  it('returns ok=true plus adapter and version info', async () => {
    const res = await fetch(`http://127.0.0.1:${handle.port}/health`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      ok: boolean;
      db: string;
      driverVersion: string;
      version: string;
    };
    expect(body.ok).toBe(true);
    expect(body.db).toBe('sqlite');
    expect(body.driverVersion).toMatch(/.+/);
    expect(body.version).toBe('0.1.0-test');
  });
});
