/**
 * @module perf/baseline-concurrent
 * @purpose AC-14 multi-worker baseline — measures `POST /rooms/:id/command`
 *   under concurrent load across N rooms with the Phase 3e worker pool
 *   in place. Companion to `baseline-look.ts` (single-room baseline).
 * @owner Zifmia perf (tools/zifmia/perf). Not shipped — run manually.
 *
 * Method:
 *   1. Boot the server with the default pool (`os.cpus().length - 1`
 *      or `ZIFMIA_WORKER_COUNT`).
 *   2. Create N rooms; in each, run M sequential `look` turns (so
 *      same-room turns don't fight the room lease — what's stressed
 *      is *cross-room* concurrency, which is what the worker pool
 *      governs).
 *   3. All N room-loops run in parallel; per-request latency is timed
 *      end-to-end (POST → JSON parsed). p95 reported across all
 *      measured requests.
 *
 * Run with:
 *   pnpm perf:concurrent
 *   ZIFMIA_WORKER_COUNT=4 pnpm perf:concurrent
 *   ZIFMIA_PERF_ROOMS=16 ZIFMIA_PERF_TURNS=40 pnpm perf:concurrent
 *
 * AC-14 target: p95 < 100 ms on a 2-vCPU SQLite container. The local
 * M4 number recorded by this harness is the regression baseline; the
 * container number is taken separately at deploy time.
 */

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { SqliteAdapter } from '../src/storage/sqlite/sqlite-adapter';
import { clearStoryCacheForTests } from '../src/engine/bundle-loader';
import { executeTurnStatelessly } from '../src/engine/turn-executor';
import { startServer } from '../src/server';
import { parseWorkerCount } from '../src/server/worker-pool';
import {
  buildTinyFixtureBundle,
  tinyFixtureConfig,
} from '../tests/fixtures/build-bundle';

function workspaceRoot(): string {
  let dir = __dirname;
  while (!fs.existsSync(path.join(dir, 'pnpm-workspace.yaml'))) {
    const parent = path.dirname(dir);
    if (parent === dir) throw new Error('perf: workspace root not found');
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
const WARMUP_TURNS_PER_ROOM = 3;
const MEASURED_TURNS_PER_ROOM = Number.parseInt(
  process.env.ZIFMIA_PERF_TURNS ?? '25',
  10,
);
const CONCURRENT_ROOMS = Number.parseInt(
  process.env.ZIFMIA_PERF_ROOMS ?? '8',
  10,
);

interface FixtureSelection {
  label: string;
  storyId: string;
  version: string;
  ifid: string;
  title: string;
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

async function resolveFixture(): Promise<{
  fixture: FixtureSelection;
  isAC14Target: boolean;
  fallbackReason?: string;
}> {
  if (fs.existsSync(DUNGEO_BUNDLE_PATH)) {
    const bytes = new Uint8Array(fs.readFileSync(DUNGEO_BUNDLE_PATH));
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
        submitter: { identityId: 'perf-probe', handle: 'perf-probe' },
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

async function measureConcurrent(fixture: FixtureSelection): Promise<Stats> {
  clearStoryCacheForTests();
  const adapter = new SqliteAdapter({ filename: ':memory:' });
  await adapter.migrate();
  const identity = await adapter.createIdentity({
    handle: 'perf-concurrent-runner',
    passcodeHash: 'scrypt$32768$8$1$eee$fff',
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

  const token = Buffer.from(
    crypto.getRandomValues(new Uint8Array(32)),
  ).toString('hex');
  await adapter.createSession({
    token,
    identityId: identity.id,
    expiresAt: Date.now() + 3_600_000,
  });

  const roomIds: string[] = [];
  for (let i = 0; i < CONCURRENT_ROOMS; i++) {
    const room = await adapter.createRoom({
      storyId: fixture.storyId,
      bundleVersion: fixture.version,
      title: `perf concurrent ${i}`,
      public: true,
      createdBy: identity.id,
    });
    roomIds.push(room.id);
  }

  const headers = {
    'content-type': 'application/json',
    authorization: `Bearer ${token}`,
  };
  const body = JSON.stringify({ command: 'look' });

  const runRoomLoop = async (
    roomId: string,
    turns: number,
    record: number[] | null,
  ): Promise<void> => {
    const url = `http://127.0.0.1:${handle.port}/rooms/${roomId}/command`;
    for (let i = 0; i < turns; i++) {
      const start = performance.now();
      const res = await fetch(url, { method: 'POST', headers, body });
      await res.json();
      const elapsed = performance.now() - start;
      if (res.status !== 200) {
        throw new Error(`perf concurrent: room ${roomId} got status ${res.status}`);
      }
      if (record) record.push(elapsed);
    }
  };

  // Warmup — discarded.
  await Promise.all(
    roomIds.map((id) => runRoomLoop(id, WARMUP_TURNS_PER_ROOM, null)),
  );

  // Measured.
  const latencies: number[] = [];
  await Promise.all(
    roomIds.map((id) => runRoomLoop(id, MEASURED_TURNS_PER_ROOM, latencies)),
  );

  await handle.close();
  return summarize(latencies);
}

async function main(): Promise<void> {
  const selection = await resolveFixture();
  const bundleSizeMb = (selection.fixture.bundle.byteLength / (1024 * 1024)).toFixed(
    2,
  );
  const effectiveWorkers = parseWorkerCount({
    envValue: process.env.ZIFMIA_WORKER_COUNT,
  });

  // eslint-disable-next-line no-console
  console.log('AC-14 multi-worker baseline — concurrent look perf');
  console.log('────────────────────────────────────────────────');
  console.log(
    `Fixture:        ${selection.fixture.label} (${
      selection.isAC14Target ? 'AC-14 target' : 'fallback'
    })`,
  );
  if (selection.fallbackReason) {
    console.log(`                ${selection.fallbackReason}`);
  }
  console.log(`Size:           ${bundleSizeMb} MiB`);
  console.log(`Node:           ${process.version}`);
  console.log(`OS:             ${os.platform()} ${os.release()}`);
  console.log(`CPU:            ${os.cpus()[0]?.model ?? 'unknown'} × ${os.cpus().length}`);
  console.log(`Memory:         ${(os.totalmem() / (1024 ** 3)).toFixed(1)} GiB`);
  console.log(`Worker pool:    ${effectiveWorkers} slots (ZIFMIA_WORKER_COUNT=${process.env.ZIFMIA_WORKER_COUNT ?? 'unset'})`);
  console.log(`Rooms:          ${CONCURRENT_ROOMS} (concurrent)`);
  console.log(`Turns / room:   ${MEASURED_TURNS_PER_ROOM} (warmup: ${WARMUP_TURNS_PER_ROOM})`);
  console.log(`Total measured: ${CONCURRENT_ROOMS * MEASURED_TURNS_PER_ROOM} requests`);
  console.log('────────────────────────────────────────────────');

  const concurrent = await measureConcurrent(selection.fixture);
  console.log(`concurrent ${fmt(concurrent)}`);

  console.log('────────────────────────────────────────────────');
  console.log(`AC-14 target: p95 < 100 ms on 2-vCPU SQLite container`);
  if (selection.isAC14Target) {
    const ok = concurrent.p95 < 100;
    console.log(`concurrent p95 ${ok ? 'PASS' : 'FAIL'}  (${concurrent.p95.toFixed(2)} ms)`);
    process.exit(ok ? 0 : 1);
  } else {
    console.log('AC-14 gate NOT evaluated — measured against fallback fixture, not Dungeo.');
    process.exit(2);
  }
}

main().catch((err: unknown) => {
  // eslint-disable-next-line no-console
  console.error('perf concurrent baseline failed:', err);
  process.exit(1);
});
