#!/usr/bin/env node
/**
 * @module @sharpee/zifmia/cli
 * @purpose Production server entry point. Reads env, boots the server,
 *   and traps SIGTERM/SIGINT for graceful shutdown so a Docker stop
 *   does not strand the SQLite write-ahead log.
 * @owner Zifmia server (tools/zifmia).
 */

import { startServer } from './server';

async function main(): Promise<void> {
  const port = Number(process.env.ZIFMIA_PORT ?? '3000');
  const host = process.env.ZIFMIA_HOST ?? '0.0.0.0';

  const handle = await startServer({ port, host });
  process.stdout.write(`zifmia listening on ${handle.address}\n`);

  const shutdown = async (signal: string): Promise<void> => {
    process.stdout.write(`\n[${signal}] zifmia shutting down\n`);
    try {
      await handle.close();
      process.exit(0);
    } catch (err) {
      process.stderr.write(`shutdown failed: ${(err as Error).message}\n`);
      process.exit(1);
    }
  };

  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));
}

main().catch((err) => {
  process.stderr.write(`zifmia failed to start: ${(err as Error).message}\n`);
  process.exit(1);
});
