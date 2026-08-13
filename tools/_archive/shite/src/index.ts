/**
 * @sharpee/zifmia
 *
 * Public entry point for the Zifmia multi-user web product (ADR-175).
 *
 * Owner context: deployable application (tools/zifmia). Not a published
 * library — the Docker image is the deploy unit.
 *
 * Public interface:
 *
 * - `startServer(options)` boots the HTTP/WebSocket server, runs schema
 *   migrations against the configured storage adapter, and returns a
 *   handle for graceful shutdown. Production callers use this; tests
 *   may construct adapters directly via the storage barrel.
 * - The storage barrel re-exports the `StorageAdapter` contract and
 *   the two adapter implementations (`SqliteAdapter`, `PostgresAdapter`).
 */

export { startServer } from './server';
export type { ZifmiaServerOptions } from './server';
export * from './storage';
