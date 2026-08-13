/**
 * @module dev/dev-server
 * @purpose Stand up a local Zifmia server for manual testing. Bootstraps
 *   an admin identity, installs every `.sharpee` bundle found in the
 *   repo's `dist/stories/` directory, and serves the built web bundle.
 *   Persistent SQLite in `dev/.zifmia-dev.sqlite` so refreshes survive
 *   server restarts.
 *
 *   Run: `pnpm exec tsx dev/dev-server.ts` from `tools/zifmia/`
 *   Browser: http://127.0.0.1:3000/
 *
 *   This is NOT a test fixture — it's a manual-play harness. The
 *   E2E suite has its own bootstrap at `tests/e2e/start-test-server.ts`
 *   which uses a tmpdir DB + the tiny fixture bundle.
 */

import * as fs from 'fs';
import * as path from 'path';

import { startServer } from '../src/server';
import { SqliteAdapter } from '../src/storage/sqlite/sqlite-adapter';
import {
  buildTinyFixtureBundle,
  tinyFixtureConfig
} from '../tests/fixtures/build-bundle';

const HERE = __dirname;
const ZIFMIA_ROOT = path.resolve(HERE, '..');
const REPO_ROOT = path.resolve(ZIFMIA_ROOT, '..', '..');

const PORT = Number(process.env.ZIFMIA_DEV_PORT ?? 3000);
const HOST = process.env.ZIFMIA_DEV_HOST ?? '127.0.0.1';
const DB_PATH = path.resolve(HERE, '.zifmia-dev.sqlite');
const WEB_ROOT = path.resolve(ZIFMIA_ROOT, 'dist', 'web');
const STORIES_DIR = path.resolve(REPO_ROOT, 'dist', 'stories');

interface InstallTarget {
  storyId: string;
  version: string;
  ifid: string;
  title: string;
  bytes: Uint8Array;
}

async function findInstallables(): Promise<InstallTarget[]> {
  if (!fs.existsSync(STORIES_DIR)) return [];
  const files = fs
    .readdirSync(STORIES_DIR)
    .filter((f) => f.endsWith('.sharpee'));
  const out: InstallTarget[] = [];
  for (const file of files) {
    const full = path.join(STORIES_DIR, file);
    const bytes = new Uint8Array(fs.readFileSync(full));
    // Peek at the bundle's meta.json by unzipping in memory. fflate
    // is already a runtime dep of the engine.
    const { unzipSync, strFromU8 } = await import('fflate');
    const entries = unzipSync(bytes);
    const metaBytes = entries['meta.json'];
    if (!metaBytes) {
      console.warn(`[dev] skipping ${file}: no meta.json`);
      continue;
    }
    const meta = JSON.parse(strFromU8(metaBytes)) as {
      id?: string;
      version?: string;
      title?: string;
      ifid?: string;
    };
    if (!meta.version || !meta.title) {
      console.warn(`[dev] skipping ${file}: missing version or title`);
      continue;
    }
    // `meta.id` is the Zifmia server's storyId key. The build's
    // story-bundle output doesn't currently set `id`; fall back to
    // the filename (sans .sharpee) so the dev harness works against
    // existing bundles without rebuilding.
    const fallbackId = path.basename(file, '.sharpee');
    out.push({
      storyId: meta.id ?? fallbackId,
      version: meta.version,
      ifid: meta.ifid ?? `IFID-${meta.id ?? fallbackId}`,
      title: meta.title,
      bytes
    });
  }
  return out;
}

async function main(): Promise<void> {
  const isFresh = !fs.existsSync(DB_PATH);
  const adapter = new SqliteAdapter({ filename: DB_PATH });
  await adapter.migrate();

  if (isFresh) {
    console.log(`[dev] fresh DB at ${DB_PATH}`);
    const admin = await adapter.createIdentity({ handle: 'admin' });
    await adapter.setIdentityAdmin(admin.id, true);
    console.log(`[dev] bootstrap admin identity created (handle=admin)`);

    // Tiny test fixture — minimal Story that round-trips a "look"
    // command. Doesn't import `@sharpee/media`, so it sidesteps the
    // bundle-loader ESM-resolution bug that affects the real Dungeo
    // bundle. Use this for manual smoke until that platform bug is
    // sorted out.
    const tinyBundle = await buildTinyFixtureBundle();
    await adapter.installStoryBundle({
      storyId: tinyFixtureConfig.id,
      version: tinyFixtureConfig.version,
      ifid: 'IFID-DEV-TINY',
      title: tinyFixtureConfig.title,
      installedBy: admin.id,
      bundle: tinyBundle
    });
    console.log(
      `[dev] installed tiny fixture: ${tinyFixtureConfig.id}@${tinyFixtureConfig.version}`
    );

    const installables = await findInstallables();
    for (const target of installables) {
      try {
        await adapter.installStoryBundle({
          storyId: target.storyId,
          version: target.version,
          ifid: target.ifid,
          title: target.title,
          installedBy: admin.id,
          bundle: target.bytes
        });
        console.log(
          `[dev] installed ${target.storyId}@${target.version} (${target.title})`
        );
      } catch (err) {
        console.warn(
          `[dev] could not install ${target.storyId}: ${err instanceof Error ? err.message : 'unknown'}`
        );
      }
    }
  } else {
    console.log(`[dev] reusing DB at ${DB_PATH} (delete to start fresh)`);
  }

  if (!fs.existsSync(WEB_ROOT)) {
    console.warn(
      `[dev] WARNING: web bundle not found at ${WEB_ROOT} — run \`pnpm build:web\` first`
    );
  }

  const handle = await startServer({
    adapter,
    port: PORT,
    host: HOST,
    packageVersion: '0.1.0-dev',
    webRoot: WEB_ROOT,
    skipMigrate: true,
    compaction: { enabled: false }
  });

  console.log('');
  console.log(`[dev] Zifmia listening on http://${HOST}:${handle.port}`);
  console.log('[dev]');
  console.log('[dev] Open the URL above. Register a new user, then');
  console.log('[dev] create a room against an installed story.');
  console.log('[dev]');
  console.log('[dev] Ctrl-C to stop.');

  const shutdown = async (): Promise<void> => {
    console.log('\n[dev] shutting down');
    await handle.close();
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((err: unknown) => {
  console.error(
    `[dev] fatal: ${err instanceof Error ? err.stack ?? err.message : String(err)}`
  );
  process.exit(1);
});
