#!/usr/bin/env node
/**
 * @module @sharpee/zifmia/cli
 * @purpose Production CLI entry point. Dispatches on the first argv
 *   token: bare `zifmia` (or `zifmia serve`) starts the server;
 *   `zifmia grant-admin <handle>` / `revoke-admin <handle>` flips
 *   the `is_admin` bit on an existing identity (Phase 5a bootstrap).
 *   Server path traps SIGTERM/SIGINT so a Docker stop does not strand
 *   the SQLite write-ahead log.
 * @owner Zifmia server (tools/zifmia).
 */

import { runAdminCli } from './admin-cli';
import { startServer } from './server';
import { migrate } from './storage/migrate';
import { resolveAdapterFromEnv } from './storage/resolve';

async function startServerCommand(): Promise<void> {
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

async function runAdminCommand(argv: readonly string[]): Promise<number> {
  // Admin subcommands construct their own adapter so they don't have
  // to spin up the HTTP server — they're one-shot bootstrap tools.
  const adapter = resolveAdapterFromEnv(process.env);
  try {
    await migrate({ adapter });
    return await runAdminCli({
      argv,
      adapter,
      write: (m) => process.stdout.write(m),
      writeErr: (m) => process.stderr.write(m)
    });
  } finally {
    await adapter.close();
  }
}

async function main(): Promise<void> {
  const [sub] = process.argv.slice(2);

  if (sub === undefined || sub === 'serve') {
    await startServerCommand();
    return;
  }
  if (sub === 'grant-admin' || sub === 'revoke-admin') {
    const code = await runAdminCommand(process.argv.slice(2));
    process.exit(code);
  }

  process.stderr.write(
    `unknown subcommand: ${sub}\n` +
      `usage: zifmia [serve | grant-admin <handle> | revoke-admin <handle>]\n`
  );
  process.exit(2);
}

main().catch((err) => {
  process.stderr.write(`zifmia failed to start: ${(err as Error).message}\n`);
  process.exit(1);
});
