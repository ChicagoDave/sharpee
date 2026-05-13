/**
 * Zifmia production boot entry.
 *
 * Public interface: invoked as `node dist/main.js`. Reads minimal env
 * config, calls {@link buildServer} with `useEngineRouter: true`, and
 * listens on the configured port.
 *
 * Owner: zifmia server, top-level wiring.
 *
 * Env:
 *   ZIFMIA_PORT              — listen port (default 3000)
 *   ZIFMIA_HOST              — listen host (default 127.0.0.1)
 *   ZIFMIA_DB                — sqlite filename (default :memory:)
 *   ZIFMIA_STORIES           — stories dir (default <repo>/dist/stories)
 *   ZIFMIA_WEB_ROOT          — override web bundle dir (default dist/web next to this script)
 *   ZIFMIA_RECORDING_NOTICE  — override the recording-notice string surfaced via /api/rooms/:id/state
 *   ZIFMIA_GRACE_MS          — override the PH-disconnect grace window (default 30000); intended for tests
 *
 * Signals:
 *   SIGINT / SIGTERM — graceful shutdown
 *   SIGHUP           — rescan the stories directory and drop cached
 *                      channel manifests so newly-dropped bundles
 *                      appear in GET /api/stories (AC-7)
 */

import { resolve } from 'node:path';
import { buildServer } from './server.js';

const port = Number(process.env.ZIFMIA_PORT ?? 3000);
const host = process.env.ZIFMIA_HOST ?? '127.0.0.1';
const dbFile = process.env.ZIFMIA_DB ?? ':memory:';
const storiesDir =
  process.env.ZIFMIA_STORIES ?? resolve(__dirname, '..', '..', '..', 'dist', 'stories');
const webRoot = process.env.ZIFMIA_WEB_ROOT ?? resolve(__dirname, '..', 'dist', 'web');
const recordingNotice = process.env.ZIFMIA_RECORDING_NOTICE;
const graceMsRaw = process.env.ZIFMIA_GRACE_MS;
const graceMs = graceMsRaw !== undefined ? Number(graceMsRaw) : undefined;
if (graceMsRaw !== undefined && !Number.isFinite(graceMs)) {
  throw new Error(`ZIFMIA_GRACE_MS must be a finite number, got: ${graceMsRaw}`);
}

async function main(): Promise<void> {
  const server = await buildServer({
    dbFile,
    storiesDir,
    webRoot,
    useEngineRouter: true,
    logger: true,
    ...(recordingNotice ? { recordingNotice } : {}),
    ...(graceMs !== undefined ? { graceMs } : {})
  });

  // ZIFMIA_RECORDING_NOTICE wins over any previously-persisted value in
  // the `config` table. The buildServer option only feeds the static
  // fallback used when the row is absent; seedDefaults is INSERT OR
  // IGNORE by design (to preserve operator edits), so an explicit set
  // is needed for env-var override semantics.
  if (recordingNotice) {
    server.config.set('recording_notice', recordingNotice);
  }

  const address = await server.app.listen({ port, host });
  // eslint-disable-next-line no-console
  console.log(`[zifmia] listening on ${address} (stories: ${storiesDir})`);

  process.on('SIGHUP', () => {
    server.stories.rescan();
    server.manifestCache?.clear();
    // eslint-disable-next-line no-console
    console.log(`[zifmia] SIGHUP — stories rescanned (${server.stories.list().length} bundle(s))`);
  });

  const shutdown = async (signal: string): Promise<void> => {
    // eslint-disable-next-line no-console
    console.log(`[zifmia] ${signal} received — shutting down`);
    await server.close();
    process.exit(0);
  };
  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('[zifmia] fatal:', err);
  process.exit(1);
});
