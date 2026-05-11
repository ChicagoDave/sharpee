/**
 * @module @sharpee/zifmia/storage
 * @purpose Storage barrel — exposes the adapter contract and the two
 *   concrete implementations (SQLite, Postgres stub).
 * @owner Zifmia server (tools/zifmia).
 */

export type {
  AdapterDescription,
  AuditEntry,
  BundleRef,
  ChatMessage,
  Identity,
  NamedSave,
  Room,
  SaveBlob,
  Session,
  StoryLibraryEntry
} from './types';

export type { RoomLease, StorageAdapter } from './adapter';

export { SqliteAdapter } from './sqlite/sqlite-adapter';
export type { SqliteAdapterOptions } from './sqlite/sqlite-adapter';

export { PostgresAdapter } from './postgres/postgres-adapter';
export type { PostgresAdapterOptions } from './postgres/postgres-adapter';

export { migrate } from './migrate';
export type { MigrateOptions } from './migrate';
export { resolveAdapterFromEnv } from './resolve';
