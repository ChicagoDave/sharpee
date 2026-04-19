/**
 * ConfigRepository behavior tests.
 *
 * Behavior Statement — ConfigRepository
 *   DOES: persists string key/value pairs; upserts on existing keys;
 *         returns null for missing keys.
 *   WHEN: invoked by runtime components that need to survive restart
 *         (recycle sweeper cursor, feature flags).
 *   BECAUSE: operator YAML covers startup config; this repo covers
 *            per-process runtime state.
 *   REJECTS WHEN: get() on a missing key returns null.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { Database } from 'better-sqlite3';
import { openTestDb } from '../helpers/test-db.js';
import { createConfigRepository } from '../../src/repositories/config-repo.js';

describe('ConfigRepository', () => {
  let db: Database;

  beforeEach(() => {
    db = openTestDb();
  });
  afterEach(() => {
    db.close();
  });

  it('get returns null for an unknown key', () => {
    const cfg = createConfigRepository(db);
    expect(cfg.get('nope')).toBeNull();
  });

  it('set then get round-trips the value', () => {
    const cfg = createConfigRepository(db);
    cfg.set('recycle.cursor', '2026-04-19T00:00:00Z');
    expect(cfg.get('recycle.cursor')).toBe('2026-04-19T00:00:00Z');
  });

  it('set on an existing key updates the value', () => {
    const cfg = createConfigRepository(db);
    cfg.set('flag.alpha', 'off');
    cfg.set('flag.alpha', 'on');
    expect(cfg.get('flag.alpha')).toBe('on');
  });
});
