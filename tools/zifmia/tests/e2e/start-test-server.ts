/**
 * @module tests/e2e/start-test-server
 * @purpose Boots the Zifmia server for Playwright runs.
 *   - In-process Fastify + SQLite (tmp file) — no subprocess
 *   - Pre-installs the tiny fixture bundle as a bootstrap admin
 *   - Serves the built web bundle from `tools/zifmia/dist/web/`
 *   - Listens on a stable port (`ZIFMIA_E2E_PORT`, default 13771)
 * @owner Zifmia E2E tests.
 *
 * Invoked by `playwright.config.ts` via the `webServer` block.
 * Playwright kills it via SIGINT when the test run ends; the
 * `SIGINT` / `SIGTERM` handlers below tear everything down cleanly.
 *
 * Tests do their own user registration + room creation via the
 * public HTTP surface, so this script is only responsible for
 * standing up a server with one installable story and an empty
 * room table.
 */

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { startServer, type ZifmiaServerHandle } from '../../src/server';
import { SqliteAdapter } from '../../src/storage/sqlite/sqlite-adapter';
import {
  buildTinyFixtureBundle,
  tinyFixtureConfig
} from '../fixtures/build-bundle';

const PORT = Number(process.env.ZIFMIA_E2E_PORT ?? 13771);
const HOST = process.env.ZIFMIA_E2E_HOST ?? '127.0.0.1';

async function main(): Promise<void> {
  // Fresh DB per run — Playwright's webServer is launched once per
  // test process. A tmpdir file means each invocation starts clean
  // without leaking across runs.
  const dbDir = fs.mkdtempSync(path.join(os.tmpdir(), 'zifmia-e2e-'));
  const dbPath = path.join(dbDir, 'zifmia.sqlite');
  const adapter = new SqliteAdapter({ filename: dbPath });
  await adapter.migrate();

  // Web bundle location — vite writes to `tools/zifmia/dist/web/`
  // relative to this file at `tools/zifmia/tests/e2e/`.
  const webRoot = path.resolve(__dirname, '..', '..', 'dist', 'web');

  // Bootstrap admin identity + install the fixture bundle so every
  // test that creates a room has a story to point at.
  const bootstrap = await adapter.createIdentity({
    handle: 'e2e-bootstrap-admin',
    // The passcode is irrelevant here — tests never log in as this
    // identity. Any non-empty hash satisfies the schema's NOT NULL.
    passcodeHash: 'scrypt$32768$8$1$bootstrap$placeholder'
  });
  await adapter.setIdentityAdmin(bootstrap.id, true);
  await adapter.installStoryBundle({
    storyId: tinyFixtureConfig.id,
    version: tinyFixtureConfig.version,
    ifid: 'E2E-FIXTURE-0001',
    title: tinyFixtureConfig.title,
    installedBy: bootstrap.id,
    bundle: await buildTinyFixtureBundle()
  });

  const handle: ZifmiaServerHandle = await startServer({
    adapter,
    port: PORT,
    host: HOST,
    packageVersion: '0.1.0-e2e',
    webRoot,
    skipMigrate: true,
    // Disable compaction in tests — deterministic state is more
    // important than blob-size economy in a short-lived run.
    compaction: { enabled: false }
  });

  process.stdout.write(
    `[zifmia-e2e] listening on http://${HOST}:${handle.port}\n` +
      `[zifmia-e2e] webRoot=${webRoot}\n` +
      `[zifmia-e2e] fixture storyId=${tinyFixtureConfig.id}@${tinyFixtureConfig.version}\n`
  );

  const shutdown = async (): Promise<void> => {
    process.stdout.write('[zifmia-e2e] shutting down\n');
    try {
      await handle.close();
    } catch (err) {
      process.stderr.write(
        `[zifmia-e2e] close error: ${err instanceof Error ? err.message : String(err)}\n`
      );
    }
    try {
      fs.rmSync(dbDir, { recursive: true, force: true });
    } catch {
      // best-effort cleanup
    }
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((err: unknown) => {
  process.stderr.write(
    `[zifmia-e2e] fatal: ${err instanceof Error ? err.stack ?? err.message : String(err)}\n`
  );
  process.exit(1);
});
