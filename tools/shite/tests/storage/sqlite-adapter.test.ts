/**
 * @module tests/storage/sqlite-adapter.test
 * @purpose Run the shared `StorageAdapter` contract suite against
 *   `SqliteAdapter` using an in-memory database. Phase 7 will add the
 *   matching `postgres-adapter.test.ts` that runs the same suite
 *   against a test Postgres instance.
 * @owner Zifmia server (tools/zifmia/tests/storage).
 */

import { SqliteAdapter } from '../../src/storage/sqlite/sqlite-adapter';
import { runAdapterContract } from './adapter-contract';

runAdapterContract('SqliteAdapter (in-memory)', {
  make: async () => new SqliteAdapter({ filename: ':memory:' })
});
