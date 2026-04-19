/**
 * Test helper: opens an in-memory SQLite database with all migrations applied.
 *
 * Public interface: {@link openTestDb}.
 * Bounded context: test infrastructure. Used by every persistence-layer test.
 */

import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';
import type { Database } from 'better-sqlite3';
import { openDatabase } from '../../src/db/connection.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Open an in-memory DB, run all migrations, and return the connection.
 * Caller is responsible for `.close()`.
 */
export function openTestDb(): Database {
  const migrationsDir = resolve(__dirname, '..', '..', 'migrations');
  return openDatabase({ path: ':memory:', migrationsDir });
}
