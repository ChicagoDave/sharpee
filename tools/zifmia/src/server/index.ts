/**
 * @module @sharpee/zifmia/server
 * @purpose Zifmia HTTP/WebSocket server bootstrap. Phase 1 wires the
 *   storage adapter and `/health` only; later phases register
 *   identity, room, turn, save, and admin routes against the same
 *   `FastifyInstance`.
 * @owner Zifmia server (tools/zifmia/server).
 *
 * Public interface:
 *
 * - `startServer(options)` constructs the adapter (auto-migrates SQLite),
 *   builds a Fastify app, registers routes, and binds the listener.
 *   Returns a handle exposing `address` and `close()` for graceful
 *   shutdown.
 */

import Fastify, { type FastifyInstance } from 'fastify';

import type { StorageAdapter } from '../storage/adapter';
import { resolveAdapterFromEnv } from '../storage/resolve';
import { registerHealthRoute } from './health';

export interface ZifmiaServerOptions {
  /** Override the adapter (tests inject a fixture). Default: resolved
   * from `ZIFMIA_DB_URL` / `ZIFMIA_SQLITE_PATH`. */
  adapter?: StorageAdapter;
  /** Listener host. Default: `0.0.0.0` (container-friendly). */
  host?: string;
  /** Listener port. Default: `3000`. */
  port?: number;
  /** Zifmia package version. Default: `0.1.0` (Phase 1). */
  packageVersion?: string;
  /** Skip the startup adapter migration. Used by tests that pre-migrate. */
  skipMigrate?: boolean;
}

export interface ZifmiaServerHandle {
  app: FastifyInstance;
  address: string;
  port: number;
  adapter: StorageAdapter;
  close(): Promise<void>;
}

/**
 * Boot the Zifmia server.
 *
 * @param options - Server options.
 * @returns Handle exposing the listener address and a `close()` method
 *   that tears down the Fastify app and releases the adapter.
 *
 * @throws If the adapter migration fails or the port is unavailable.
 */
export async function startServer(
  options: ZifmiaServerOptions = {}
): Promise<ZifmiaServerHandle> {
  const adapter = options.adapter ?? resolveAdapterFromEnv(process.env);
  const host = options.host ?? '0.0.0.0';
  const port = options.port ?? 3000;
  const packageVersion = options.packageVersion ?? '0.1.0';

  if (!options.skipMigrate) {
    await adapter.migrate();
  }

  const app = Fastify({ logger: false });
  registerHealthRoute(app, { adapter, packageVersion });

  const address = await app.listen({ host, port });
  const resolvedPort = resolvePortFromServer(app, port);

  return {
    app,
    address,
    port: resolvedPort,
    adapter,
    close: async () => {
      await app.close();
      await adapter.close();
    }
  };
}

/**
 * Pull the actual listening port out of Fastify's underlying server.
 * When the caller passes `port: 0`, the OS chooses an ephemeral port
 * and the resolved value is what tests need.
 */
function resolvePortFromServer(
  app: FastifyInstance,
  requestedPort: number
): number {
  const addressInfo = app.server.address();
  if (addressInfo && typeof addressInfo === 'object') {
    return addressInfo.port;
  }
  return requestedPort;
}
