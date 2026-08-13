/**
 * Database open / close for Zifmia.
 *
 * Public interface: {@link openDatabase}, {@link ZifmiaDatabase}.
 * Owner: zifmia server, single-process. Each server instance owns one
 * database handle; SQLite's single-writer model matches the per-room
 * single-writer invariant from ADR-164.
 */

import Database, { type Database as BetterSqliteDatabase } from 'better-sqlite3';
import { applySchemaV1 } from './schema.js';

export type ZifmiaDatabase = BetterSqliteDatabase;

export interface OpenDatabaseOptions {
  /** Filesystem path, or `:memory:` for tests. */
  filename: string;
}

/**
 * Open a SQLite database, enable WAL + foreign keys, and apply the v1
 * schema. Returns the handle; the caller is responsible for `close()`.
 *
 * @param options Connection options.
 * @returns A ready-to-use better-sqlite3 handle.
 */
export function openDatabase(options: OpenDatabaseOptions): ZifmiaDatabase {
  const db = new Database(options.filename);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  applySchemaV1(db);
  return db;
}
