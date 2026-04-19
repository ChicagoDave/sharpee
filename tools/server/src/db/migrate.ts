/**
 * Forward-only SQLite migration runner.
 *
 * Reads `*.sql` files from a migrations directory in lexicographic order and
 * applies any that have not yet been recorded in `schema_migrations`. Each
 * migration runs inside a transaction.
 *
 * Public interface: {@link runMigrations}.
 * Bounded context: persistence bootstrap.
 */

import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import type { Database } from 'better-sqlite3';

/**
 * Apply all pending migrations in `migrationsDir` to `db`.
 *
 * @param db             open better-sqlite3 connection
 * @param migrationsDir  directory containing `NNNN_*.sql` files
 * @throws if a migration's SQL fails to execute; the transaction rolls back
 */
export function runMigrations(db: Database, migrationsDir: string): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename TEXT PRIMARY KEY,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  const applied = new Set<string>(
    (db.prepare('SELECT filename FROM schema_migrations').all() as Array<{ filename: string }>)
      .map((r) => r.filename)
  );

  const files = readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  const recordApplied = db.prepare('INSERT INTO schema_migrations (filename) VALUES (?)');

  for (const filename of files) {
    if (applied.has(filename)) continue;
    const sql = readFileSync(join(migrationsDir, filename), 'utf8');
    const tx = db.transaction(() => {
      db.exec(sql);
      recordApplied.run(filename);
    });
    tx();
  }
}
