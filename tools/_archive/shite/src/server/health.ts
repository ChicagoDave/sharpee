/**
 * @module @sharpee/zifmia/server/health
 * @purpose `GET /health` handler. Reports adapter kind, driver version,
 *   and the Zifmia package version so operators can verify a running
 *   container is healthy and matches the expected build.
 * @owner Zifmia server (tools/zifmia/server).
 *
 * Body shape (frozen for v1 per ADR-175 §AC-1):
 *
 * ```json
 * {
 *   "ok": true,
 *   "db": "sqlite" | "postgres",
 *   "driverVersion": "3.46.1",
 *   "version": "0.1.0"
 * }
 * ```
 */

import type { FastifyInstance } from 'fastify';

import type { StorageAdapter } from '../storage/adapter';

export interface HealthResponse {
  ok: true;
  db: 'sqlite' | 'postgres';
  driverVersion: string;
  version: string;
}

export interface HealthRouteOptions {
  adapter: StorageAdapter;
  /** Zifmia package version (read from `package.json` at startup). */
  packageVersion: string;
}

export function registerHealthRoute(
  app: FastifyInstance,
  options: HealthRouteOptions
): void {
  app.get('/health', async (): Promise<HealthResponse> => {
    const desc = options.adapter.describe();
    return {
      ok: true,
      db: desc.kind,
      driverVersion: desc.driverVersion,
      version: options.packageVersion
    };
  });
}
