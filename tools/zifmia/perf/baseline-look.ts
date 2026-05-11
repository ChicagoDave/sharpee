/**
 * @module perf/baseline-look
 * @purpose AC-14 perf baseline harness — measures end-to-end and engine-
 *   only latency of `POST /rooms/:id/command` with payload `look` against
 *   the installed Dungeo bundle.
 * @owner Zifmia perf (tools/zifmia/perf). Not shipped — run manually to
 *   regenerate `docs/work/zifmia/perf-baseline.md`.
 *
 * AC-14 target: `look` on Dungeo under 100 ms p95 on a 2-vCPU SQLite
 * container. This harness records the local-machine baseline; the
 * container number is taken separately during deploy verification.
 *
 * Two regimes are measured back-to-back:
 *   1. **direct**  — calls `executeTurnStatelessly` in-process,
 *      bypassing the HTTP layer. Isolates engine + adapter cost.
 *   2. **http**    — POSTs to a real Fastify listener over loopback.
 *      Adds Fastify request lifecycle + JSON encode/decode + fetch
 *      overhead on top of the direct number.
 *
 * Run with:  `pnpm tsx perf/baseline-look.ts`
 */

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { SqliteAdapter } from '../src/storage/sqlite/sqlite-adapter';
import { executeTurnStatelessly } from '../src/engine/turn-executor';
import { clearStoryCacheForTests } from '../src/engine/bundle-loader';
import { startServer } from '../src/server';
import {
  buildTinyFixtureBundle,
  tinyFixtureConfig,
} from '../tests/fixtures/build-bundle';

/**
 * Locate the workspace root by walking up from `__dirname` until we
 * find `pnpm-workspace.yaml`. Robust against both source location
 * (`tools/zifmia/perf/`) and compiled location
 * (`tools/zifmia/dist-perf/perf/`).
 */
function workspaceRoot(): string {
  let dir = __dirname;
  while (!fs.existsSync(path.join(dir, 'pnpm-workspace.yaml'))) {
    const parent = path.dirname(dir);
    if (parent === dir) {
      throw new Error('perf: workspace root not found');
    }
    dir = parent;
  }
  return dir;
}

const DUNGEO_BUNDLE_PATH = path.join(
  workspaceRoot(),
  'dist',
  'stories',
  'dungeo.sharpee',
);
const WARMUP_RUNS = 10;
const MEASURED_RUNS = 100;

interface FixtureSelection {
  /** Wire label printed in the summary table and the markdown doc. */
  label: string;
  /** Story id to install. */
  storyId: string;
  /** Story version to install. */
  version: string;
  /** Story IFID to install. */
  ifid: string;
  /** Story title to install. */
  title: string;
  /** Bundle bytes ready for `adapter.installStoryBundle`. */
  bundle: Uint8Array;
}

interface Stats {
  count: number;
  min: number;
  p50: number;
  p90: number;
  p95: number;
  p99: number;
  max: number;
  mean: number;
}

function percentile(sorted: number[], p: number): number {
  const idx = Math.min(sorted.length - 1, Math.floor((sorted.length - 1) * p));
  return sorted[idx];
}

function summarize(latenciesMs: number[]): Stats {
  const sorted = [...latenciesMs].sort((a, b) => a - b);
  const sum = sorted.reduce((acc, n) => acc + n, 0);
  return {
    count: sorted.length,
    min: sorted[0],
    p50: percentile(sorted, 0.5),
    p90: percentile(sorted, 0.9),
    p95: percentile(sorted, 0.95),
    p99: percentile(sorted, 0.99),
    max: sorted[sorted.length - 1],
    mean: sum / sorted.length,
  };
}

function fmt(stats: Stats): string {
  const fix = (n: number): string => n.toFixed(2);
  return `n=${stats.count}  min=${fix(stats.min)} p50=${fix(stats.p50)} p90=${fix(
    stats.p90,
  )} p95=${fix(stats.p95)} p99=${fix(stats.p99)} max=${fix(stats.max)} mean=${fix(stats.mean)}  (ms)`;
}

async function setupAdapterAndRoom(fixture: FixtureSelection): Promise<{
  adapter: SqliteAdapter;
  identityId: string;
}> {
  const adapter = new SqliteAdapter({ filename: ':memory:' });
  await adapter.migrate();
  const identity = await adapter.createIdentity({
    handle: 'perf-runner',
    passcodeHash: 'scrypt$32768$8$1$aaa$bbb',
  });
  await adapter.installStoryBundle({
    storyId: fixture.storyId,
    version: fixture.version,
    ifid: fixture.ifid,
    title: fixture.title,
    installedBy: identity.id,
    bundle: fixture.bundle,
  });
  return { adapter, identityId: identity.id };
}

async function measureDirect(fixture: FixtureSelection): Promise<Stats> {
  clearStoryCacheForTests();
  const { adapter, identityId } = await setupAdapterAndRoom(fixture);
  const room = await adapter.createRoom({
    storyId: fixture.storyId,
    bundleVersion: fixture.version,
    title: 'perf direct',
    public: true,
    createdBy: identityId,
  });

  for (let i = 0; i < WARMUP_RUNS; i++) {
    await executeTurnStatelessly({
      adapter,
      roomId: room.id,
      command: 'look',
    });
  }

  // Snapshot turn count and reset the room to keep memory bounded
  // (otherwise the save_blobs table grows 100+ rows of compressed world
  // state and the load-latest query gets slower over time, which would
  // bias the late measurements). Instead, run each measured iteration
  // against the same warmed-up room — the executor restores from the
  // latest save_blob each time, which is the realistic hot-path cost.
  const latencies: number[] = [];
  for (let i = 0; i < MEASURED_RUNS; i++) {
    const start = performance.now();
    await executeTurnStatelessly({
      adapter,
      roomId: room.id,
      command: 'look',
    });
    latencies.push(performance.now() - start);
  }

  await adapter.close();
  return summarize(latencies);
}

async function measureHttp(fixture: FixtureSelection): Promise<Stats> {
  clearStoryCacheForTests();
  const adapter = new SqliteAdapter({ filename: ':memory:' });
  await adapter.migrate();
  const identity = await adapter.createIdentity({
    handle: 'perf-http-runner',
    passcodeHash: 'scrypt$32768$8$1$ccc$ddd',
  });
  await adapter.installStoryBundle({
    storyId: fixture.storyId,
    version: fixture.version,
    ifid: fixture.ifid,
    title: fixture.title,
    installedBy: identity.id,
    bundle: fixture.bundle,
  });

  const handle = await startServer({
    adapter,
    port: 0,
    host: '127.0.0.1',
    packageVersion: '0.1.0-perf',
    skipMigrate: true,
  });

  // Reuse the existing identity by minting a session directly via the
  // adapter so the perf path doesn't include registration cost.
  const token = Buffer.from(
    crypto.getRandomValues(new Uint8Array(32)),
  ).toString('hex');
  await adapter.createSession({
    token,
    identityId: identity.id,
    expiresAt: Date.now() + 3_600_000,
  });

  const room = await adapter.createRoom({
    storyId: fixture.storyId,
    bundleVersion: fixture.version,
    title: 'perf http',
    public: true,
    createdBy: identity.id,
  });

  const url = `http://127.0.0.1:${handle.port}/rooms/${room.id}/command`;
  const headers = {
    'content-type': 'application/json',
    authorization: `Bearer ${token}`,
  };
  const body = JSON.stringify({ command: 'look' });

  for (let i = 0; i < WARMUP_RUNS; i++) {
    const res = await fetch(url, { method: 'POST', headers, body });
    if (res.status !== 200) {
      throw new Error(`HTTP warmup got status ${res.status}: ${await res.text()}`);
    }
  }

  const latencies: number[] = [];
  for (let i = 0; i < MEASURED_RUNS; i++) {
    const start = performance.now();
    const res = await fetch(url, { method: 'POST', headers, body });
    await res.json();
    latencies.push(performance.now() - start);
    if (res.status !== 200) {
      throw new Error(`HTTP iteration ${i} got status ${res.status}`);
    }
  }

  await handle.close();
  return summarize(latencies);
}

async function resolveFixture(): Promise<{
  fixture: FixtureSelection;
  /** True when the harness is measuring the AC-14 story (Dungeo). False
   * when it fell back to the tiny in-package fixture. */
  isAC14Target: boolean;
  /** Reason text printed when falling back. */
  fallbackReason?: string;
}> {
  if (fs.existsSync(DUNGEO_BUNDLE_PATH)) {
    const bytes = new Uint8Array(fs.readFileSync(DUNGEO_BUNDLE_PATH));
    // Try a one-shot load — if Dungeo's bundle hits the directory-import
    // ESM bug (see docs/work/zifmia/perf-baseline.md), we fall back so
    // the run still produces a useful number.
    try {
      const probeAdapter = new SqliteAdapter({ filename: ':memory:' });
      await probeAdapter.migrate();
      const id = await probeAdapter.createIdentity({
        handle: 'probe',
        passcodeHash: 'scrypt$32768$8$1$aaa$bbb',
      });
      await probeAdapter.installStoryBundle({
        storyId: 'dungeo',
        version: '1.0.0',
        ifid: '621168D1-6D5C-449F-83D5-841D03A1BF78',
        title: 'DUNGEON',
        installedBy: id.id,
        bundle: bytes,
      });
      const room = await probeAdapter.createRoom({
        storyId: 'dungeo',
        bundleVersion: '1.0.0',
        title: 'probe',
        public: true,
        createdBy: id.id,
      });
      clearStoryCacheForTests();
      await executeTurnStatelessly({
        adapter: probeAdapter,
        roomId: room.id,
        command: 'look',
      });
      await probeAdapter.close();
      return {
        fixture: {
          label: 'dungeo@1.0.0',
          storyId: 'dungeo',
          version: '1.0.0',
          ifid: '621168D1-6D5C-449F-83D5-841D03A1BF78',
          title: 'DUNGEON',
          bundle: bytes,
        },
        isAC14Target: true,
      };
    } catch (err) {
      const tinyBundle = await buildTinyFixtureBundle();
      return {
        fixture: {
          label: tinyFixtureConfig.id + '@' + tinyFixtureConfig.version,
          storyId: tinyFixtureConfig.id,
          version: tinyFixtureConfig.version,
          ifid: 'TEST-FIXTURE-0001',
          title: tinyFixtureConfig.title,
          bundle: tinyBundle,
        },
        isAC14Target: false,
        fallbackReason: `Dungeo bundle failed to load: ${(err as Error).message}`,
      };
    }
  }
  const tinyBundle = await buildTinyFixtureBundle();
  return {
    fixture: {
      label: tinyFixtureConfig.id + '@' + tinyFixtureConfig.version,
      storyId: tinyFixtureConfig.id,
      version: tinyFixtureConfig.version,
      ifid: 'TEST-FIXTURE-0001',
      title: tinyFixtureConfig.title,
      bundle: tinyBundle,
    },
    isAC14Target: false,
    fallbackReason: `Dungeo bundle not present at ${DUNGEO_BUNDLE_PATH}; run ./build.sh -s dungeo to produce it.`,
  };
}

async function main(): Promise<void> {
  const selection = await resolveFixture();
  const bundleSizeMb = (selection.fixture.bundle.byteLength / (1024 * 1024)).toFixed(2);

  // eslint-disable-next-line no-console
  console.log('AC-14 baseline — look perf');
  console.log('────────────────────────────────────────────────');
  console.log(`Fixture:   ${selection.fixture.label} (${selection.isAC14Target ? 'AC-14 target' : 'fallback'})`);
  if (selection.fallbackReason) {
    console.log(`           ${selection.fallbackReason}`);
  }
  console.log(`Size:      ${bundleSizeMb} MiB`);
  console.log(`Node:      ${process.version}`);
  console.log(`OS:        ${os.platform()} ${os.release()}`);
  console.log(`CPU:       ${os.cpus()[0]?.model ?? 'unknown'} × ${os.cpus().length}`);
  console.log(`Memory:    ${(os.totalmem() / (1024 ** 3)).toFixed(1)} GiB`);
  console.log(`Warmup:    ${WARMUP_RUNS} runs (discarded)`);
  console.log(`Measured:  ${MEASURED_RUNS} runs`);
  console.log('────────────────────────────────────────────────');

  const direct = await measureDirect(selection.fixture);
  console.log(`direct  ${fmt(direct)}`);

  const http = await measureHttp(selection.fixture);
  console.log(`http    ${fmt(http)}`);

  console.log('────────────────────────────────────────────────');
  console.log(`AC-14 target: p95 < 100 ms on 2-vCPU SQLite container`);
  if (selection.isAC14Target) {
    const directOk = direct.p95 < 100;
    const httpOk = http.p95 < 100;
    console.log(`direct p95 ${directOk ? 'PASS' : 'FAIL'}  (${direct.p95.toFixed(2)} ms)`);
    console.log(`http   p95 ${httpOk ? 'PASS' : 'FAIL'}  (${http.p95.toFixed(2)} ms)`);
    process.exit(directOk && httpOk ? 0 : 1);
  } else {
    console.log('AC-14 gate NOT evaluated — measured against fallback fixture, not Dungeo.');
    process.exit(2);
  }
}

main().catch((err: unknown) => {
  // eslint-disable-next-line no-console
  console.error('perf baseline failed:', err);
  process.exit(1);
});
