/**
 * Opens the server's SQLite connection, enables WAL mode, and runs migrations.
 *
 * Public interface: {@link openDatabase}.
 * Bounded context: persistence layer (ADR-153 Decision 10, Decision 15).
 */

import Database from 'better-sqlite3';
import type { Database as Db } from 'better-sqlite3';
import { runMigrations } from './migrate.js';

export interface OpenDbOptions {
  /** Filesystem path, or `:memory:` for test DBs. */
  path: string;
  /** Absolute path to the migrations directory. */
  migrationsDir: string;
}

/**
 * Open a better-sqlite3 connection, enable WAL + foreign keys, and apply pending migrations.
 *
 * @param opts.path           database file path or `:memory:`
 * @param opts.migrationsDir  absolute path to directory holding `*.sql` migration files
 * @returns open Database handle with migrations applied
 * @throws if any migration fails (connection is closed before re-throw)
 */
export function openDatabase(opts: OpenDbOptions): Db {
  const db: Db = new Database(opts.path);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.pragma('synchronous = NORMAL');
  try {
    runMigrations(db, opts.migrationsDir);
  } catch (err) {
    db.close();
    throw err;
  }
  return db;
}
