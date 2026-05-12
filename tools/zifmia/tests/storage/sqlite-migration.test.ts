/**
 * @module tests/storage/sqlite-migration.test
 * @purpose Cover SQLite-specific migration behavior that the shared
 *   adapter contract suite cannot express — in particular, the Phase
 *   5a additive `ALTER TABLE identities ADD COLUMN is_admin` path
 *   that fires on pre-Phase-5 databases without the column.
 * @owner Zifmia server (tools/zifmia/tests/storage).
 */

import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import Database from 'better-sqlite3';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { SqliteAdapter } from '../../src/storage/sqlite/sqlite-adapter';

describe('SqliteAdapter migration — Phase 5a is_admin column', () => {
  let tmp: string;
  let dbPath: string;

  beforeEach(() => {
    tmp = mkdtempSync(path.join(tmpdir(), 'zifmia-migration-'));
    dbPath = path.join(tmp, 'legacy.db');
  });

  afterEach(() => {
    rmSync(tmp, { recursive: true, force: true });
  });

  it('adds is_admin to a legacy identities table that lacks the column', async () => {
    // Hand-build a Phase-1-shape identities table with no is_admin column,
    // and seed a pre-existing row.
    {
      const raw = new Database(dbPath);
      raw.pragma('journal_mode = WAL');
      raw.exec(`
        CREATE TABLE identities (
          id            TEXT PRIMARY KEY,
          handle        TEXT NOT NULL UNIQUE,
          passcode_hash TEXT NOT NULL,
          created_at    INTEGER NOT NULL
        );
      `);
      raw.prepare(
        `INSERT INTO identities (id, handle, passcode_hash, created_at)
         VALUES (?, ?, ?, ?)`
      ).run('legacy-id-1', 'legacy-handle', 'legacy-hash', 1_700_000_000_000);
      raw.close();
    }

    // Now open through the adapter and run migrate — should ALTER TABLE.
    const adapter = new SqliteAdapter({ filename: dbPath });
    try {
      await adapter.migrate();

      const before = await adapter.getIdentityByHandle('legacy-handle');
      expect(before).not.toBeNull();
      expect(before?.isAdmin).toBe(false); // legacy row defaults to non-admin

      await adapter.setIdentityAdmin('legacy-id-1', true);
      const after = await adapter.getIdentityByHandle('legacy-handle');
      expect(after?.isAdmin).toBe(true);
    } finally {
      await adapter.close();
    }
  });

  it('migrate is idempotent — running twice does not throw', async () => {
    const adapter = new SqliteAdapter({ filename: dbPath });
    try {
      await adapter.migrate();
      await expect(adapter.migrate()).resolves.toBeUndefined();

      // And the column is still there exactly once.
      const created = await adapter.createIdentity({
        handle: 'idem-handle',
        passcodeHash: 'h'
      });
      expect(created.isAdmin).toBe(false);
    } finally {
      await adapter.close();
    }
  });
});
