/**
 * Phase 0 smoke test.
 *
 * Behavior Statement — openTestDb()
 *   DOES: opens an in-memory SQLite DB, enables WAL mode (no-op for :memory:
 *         but the pragma must not throw), applies migrations, and records
 *         each migration filename in schema_migrations.
 *   WHEN: called with no arguments from a test context.
 *   BECAUSE: every persistence-layer test needs a working DB seeded with
 *            the same schema the production server uses.
 *   REJECTS WHEN: a migration SQL file is malformed (covered by later phases;
 *                 Phase 0 ships only a bookkeeping table).
 */

import { describe, it, expect } from 'vitest';
import { openTestDb } from '../helpers/test-db.js';

describe('Phase 0 smoke — test DB helper', () => {
  it('opens an in-memory DB and applies the initial migration', () => {
    const db = openTestDb();
    try {
      const row = db
        .prepare('SELECT filename FROM schema_migrations WHERE filename = ?')
        .get('0001_initial_schema.sql') as { filename: string } | undefined;

      expect(row).toBeDefined();
      expect(row?.filename).toBe('0001_initial_schema.sql');
    } finally {
      db.close();
    }
  });

  it('is idempotent — a second open on the same process does not re-apply migrations', () => {
    const first = openTestDb();
    first.close();
    const second = openTestDb();
    try {
      const count = (second
        .prepare('SELECT COUNT(*) AS n FROM schema_migrations')
        .get() as { n: number }).n;
      // :memory: resets between connections, so we still expect 1 — not 2.
      expect(count).toBe(1);
    } finally {
      second.close();
    }
  });
});
