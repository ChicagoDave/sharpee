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
import { registerAdminAuditRoute } from './admin-audit';
import { registerAdminIdentityRoutes } from './admin-identities';
import { registerAdminRoomRoutes } from './admin-rooms';
import { registerAdminStoryRoutes } from './admin-stories';
import { registerCommandRoute } from './command';
import {
  parseCompactionEnabled,
  parseCompactionInterval,
  startCompactionWorker,
  type CompactionWorkerHandle,
} from './compaction';
import { registerHealthRoute } from './health';
import { registerIdentityRoutes } from './identity';
import { registerRestoreRoute } from './restore';
import { registerRoomRoutes } from './rooms';
import { registerSavesRoutes } from './saves';
import { registerWebRoutes } from './web';
import { createPool, parseWorkerCount, type WorkerPool } from './worker-pool';
import { registerWebSocketRoute } from './ws';

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
  /**
   * Inject a pre-built turn-execution worker pool. When omitted, the
   * server constructs one from `ZIFMIA_WORKER_COUNT` (or the
   * `max(1, cpus - 1)` default). Tests use this to assert
   * pool-capacity behavior with a fixed, small cap.
   */
  workerPool?: WorkerPool;
  /**
   * Compaction override (Phase 4d). When omitted, derived from
   * `ZIFMIA_COMPACTION_ENABLED` (default `false`) and
   * `ZIFMIA_COMPACTION_INTERVAL_MS` (default 5 minutes). Tests pass
   * `{enabled: false}` to keep timers out of the suite, or
   * `{enabled: true, intervalMs}` with a small interval + injected
   * `scheduler` to drive ticks deterministically.
   */
  compaction?: {
    enabled?: boolean;
    intervalMs?: number;
  };
  /**
   * Web bundle override (Phase 6a). When omitted, defaults to
   * `<dist>/web` next to the running server. Tests that need to
   * assert static-asset serving pass an absolute path; tests that
   * don't care leave it unset and the static plugin no-ops on a
   * missing directory.
   */
  webRoot?: string;
}

export interface ZifmiaServerHandle {
  app: FastifyInstance;
  address: string;
  port: number;
  adapter: StorageAdapter;
  workerPool: WorkerPool;
  compaction: CompactionWorkerHandle;
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

  const workerPool =
    options.workerPool ??
    createPool(
      parseWorkerCount({
        envValue: process.env.ZIFMIA_WORKER_COUNT,
        warn: (msg) => {
          // Single startup warning; logger isn't built yet, so we
          // route this through stderr rather than the Fastify log.
          process.stderr.write(`[zifmia] ${msg}\n`);
        },
      }),
    );

  const app = Fastify({ logger: false });
  registerHealthRoute(app, { adapter, packageVersion });
  registerIdentityRoutes(app, { adapter });
  registerRoomRoutes(app, { adapter });
  registerCommandRoute(app, { adapter, workerPool });
  registerSavesRoutes(app, { adapter });
  registerRestoreRoute(app, { adapter });
  registerAdminAuditRoute(app, { adapter });
  registerAdminStoryRoutes(app, { adapter });
  registerAdminRoomRoutes(app, { adapter });
  registerAdminIdentityRoutes(app, { adapter });
  await registerWebSocketRoute(app, { adapter });
  await registerWebRoutes(app, { webRoot: options.webRoot });

  const compactionEnabled =
    options.compaction?.enabled ??
    parseCompactionEnabled(process.env.ZIFMIA_COMPACTION_ENABLED);
  const compactionInterval =
    options.compaction?.intervalMs ??
    parseCompactionInterval(
      process.env.ZIFMIA_COMPACTION_INTERVAL_MS,
      (msg) => process.stderr.write(`[zifmia] ${msg}\n`),
    );
  const compaction = startCompactionWorker({
    adapter,
    enabled: compactionEnabled,
    intervalMs: compactionInterval,
  });

  const address = await app.listen({ host, port });
  const resolvedPort = resolvePortFromServer(app, port);

  return {
    app,
    address,
    port: resolvedPort,
    adapter,
    workerPool,
    compaction,
    close: async () => {
      await compaction.stop();
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
