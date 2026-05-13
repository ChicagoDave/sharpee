/**
 * Spawned-server harness for the Phase 8 E2E suite.
 *
 * Public interface: {@link spawnZifmiaServer}, {@link stopZifmiaServer},
 *                   {@link ZifmiaProcess}.
 * Owner: zifmia e2e harness.
 *
 * Spawns `node dist/main.js` from `tools/zifmia/dist/main.js` as a
 * child process so every spec hits the production code path. This is
 * the REAL-PATH harness required by CLAUDE.md rule 13a for an
 * "integration" / "engine" phase — no `app.inject()`, no stub of the
 * boot wiring.
 *
 * Per-server isolation:
 *   - A fresh temp dir holds the SQLite DB and the stories copy.
 *   - The server listens on a random free port chosen by the OS.
 *   - The recording notice is overridden via ZIFMIA_RECORDING_NOTICE
 *     so AC-8 can assert on a known string.
 */

import { spawn, type ChildProcess } from 'node:child_process';
import { createServer } from 'node:net';
import { copyFileSync, mkdtempSync, readdirSync, rmSync, statSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';

const REPO_ROOT = resolve(__dirname, '..', '..', '..', '..', '..');
const ZIFMIA_DIST_MAIN = resolve(__dirname, '..', '..', '..', 'dist', 'main.js');
const ZIFMIA_DIST_WEB = resolve(__dirname, '..', '..', '..', 'dist', 'web');
const REPO_STORIES_DIR = join(REPO_ROOT, 'dist', 'stories');

export interface SpawnZifmiaOptions {
  /** Override recording notice text (default: 'E2E recording notice'). */
  recordingNotice?: string;
  /**
   * Stories to seed into the per-server temp stories dir. Defaults to
   * the entire repo `dist/stories/` content (currently `dungeo.sharpee`).
   * Specs that exercise AC-7 SIGHUP pass `[]` and drop files later.
   */
  seedStories?: 'all' | readonly string[];
  /** Override the PH-disconnect grace window (ms). Default: server default (30s). */
  graceMs?: number;
  /** Extra env vars to set on the child. */
  env?: Record<string, string>;
}

export interface ZifmiaProcess {
  readonly baseURL: string;
  readonly port: number;
  readonly storiesDir: string;
  readonly tempDir: string;
  readonly child: ChildProcess;
  stop(): Promise<void>;
}

function pickFreePort(): Promise<number> {
  return new Promise((resolveP, rejectP) => {
    const srv = createServer();
    srv.unref();
    srv.on('error', rejectP);
    srv.listen(0, '127.0.0.1', () => {
      const addr = srv.address();
      if (addr && typeof addr === 'object') {
        const port = addr.port;
        srv.close(() => resolveP(port));
      } else {
        srv.close(() => rejectP(new Error('failed to allocate port')));
      }
    });
  });
}

function seedStoriesInto(dir: string, mode: 'all' | readonly string[]): void {
  if (Array.isArray(mode)) {
    for (const file of mode) {
      const src = join(REPO_STORIES_DIR, file);
      if (!existsSync(src)) {
        throw new Error(`seed story not found: ${src}`);
      }
      copyFileSync(src, join(dir, file));
    }
    return;
  }
  // 'all'
  if (!existsSync(REPO_STORIES_DIR)) return;
  for (const name of readdirSync(REPO_STORIES_DIR)) {
    if (!name.endsWith('.sharpee')) continue;
    const src = join(REPO_STORIES_DIR, name);
    if (statSync(src).isFile()) copyFileSync(src, join(dir, name));
  }
}

async function waitForReady(baseURL: string, timeoutMs = 15000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  let lastErr: unknown = null;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`${baseURL}/api/stories`);
      if (res.ok) return;
      lastErr = new Error(`status ${res.status}`);
    } catch (err) {
      lastErr = err;
    }
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error(`server at ${baseURL} did not become ready: ${String(lastErr)}`);
}

export async function spawnZifmiaServer(opts: SpawnZifmiaOptions = {}): Promise<ZifmiaProcess> {
  if (!existsSync(ZIFMIA_DIST_MAIN)) {
    throw new Error(
      `zifmia bundle missing at ${ZIFMIA_DIST_MAIN}. Run \`pnpm --filter @sharpee/zifmia build\` first.`
    );
  }

  const tempDir = mkdtempSync(join(tmpdir(), 'zifmia-e2e-'));
  const storiesDir = join(tempDir, 'stories');
  const dbFile = join(tempDir, 'zifmia.sqlite');
  // mkdtempSync creates only the temp dir itself; stories subdir needs creating.
  rmSync(storiesDir, { recursive: true, force: true });
  const fs = await import('node:fs/promises');
  await fs.mkdir(storiesDir, { recursive: true });

  seedStoriesInto(storiesDir, opts.seedStories ?? 'all');

  const port = await pickFreePort();
  const baseURL = `http://127.0.0.1:${port}`;

  const child = spawn(
    process.execPath,
    [ZIFMIA_DIST_MAIN],
    {
      env: {
        ...process.env,
        ZIFMIA_PORT: String(port),
        ZIFMIA_HOST: '127.0.0.1',
        ZIFMIA_DB: dbFile,
        ZIFMIA_STORIES: storiesDir,
        ZIFMIA_WEB_ROOT: ZIFMIA_DIST_WEB,
        ZIFMIA_RECORDING_NOTICE: opts.recordingNotice ?? 'E2E recording notice',
        ...(opts.graceMs !== undefined ? { ZIFMIA_GRACE_MS: String(opts.graceMs) } : {}),
        ...(opts.env ?? {})
      },
      stdio: ['ignore', 'pipe', 'pipe']
    }
  );

  child.stdout?.setEncoding('utf8');
  child.stderr?.setEncoding('utf8');
  const logTag = `[zifmia:${port}]`;
  child.stdout?.on('data', (chunk: string) => {
    if (process.env.ZIFMIA_E2E_VERBOSE) process.stdout.write(`${logTag} ${chunk}`);
  });
  child.stderr?.on('data', (chunk: string) => {
    if (process.env.ZIFMIA_E2E_VERBOSE) process.stderr.write(`${logTag} ${chunk}`);
  });

  child.on('error', (err) => {
    // eslint-disable-next-line no-console
    console.error(`${logTag} spawn error:`, err);
  });

  try {
    await waitForReady(baseURL);
  } catch (err) {
    child.kill('SIGTERM');
    rmSync(tempDir, { recursive: true, force: true });
    throw err;
  }

  const stop = async (): Promise<void> => {
    if (!child.killed && child.exitCode === null) {
      await new Promise<void>((res) => {
        child.once('exit', () => res());
        if (!child.kill('SIGTERM')) res();
        setTimeout(() => {
          if (child.exitCode === null) child.kill('SIGKILL');
        }, 2000);
      });
    }
    rmSync(tempDir, { recursive: true, force: true });
  };

  return { baseURL, port, storiesDir, tempDir, child, stop };
}

export async function stopZifmiaServer(p: ZifmiaProcess | undefined): Promise<void> {
  if (!p) return;
  await p.stop();
}
