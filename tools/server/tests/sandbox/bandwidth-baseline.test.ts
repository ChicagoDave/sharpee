/**
 * Bandwidth baseline for ADR-162 world-model replication (AC-8).
 *
 * Public interface: a single measurement test, gated on
 * `SHARPEE_BANDWIDTH=1`. Spawns the production sandbox path with a real
 * dungeo bundle, drives ten progress-bearing turns, and emits per-turn
 * `OUTPUT.world` byte counts plus min/median/max to stdout. The
 * captured numbers are paraphrased into
 * `docs/work/multiuser/adr-162-bandwidth-baseline.md` so future
 * delta-encoding or hash-dedup work has a frozen reference point.
 *
 * Bounded context: server integration tests. This file is intentionally
 * not part of every-run regression coverage — bandwidth is a
 * methodology artifact, not a behavioral invariant. Setting
 * `SHARPEE_BANDWIDTH=1` activates it; any other condition skips it.
 *
 * Methodology invariant: the same command sequence and the same bundle
 * must be used every time the baseline is re-captured. The sequence
 * below covers (a) the opening look, (b) container interaction, (c)
 * inventory readout, (d) directional movement, and (e) item taking —
 * a representative sampling of common turn shapes early in dungeo.
 */

import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from 'vitest';
import { randomUUID } from 'node:crypto';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve as resolvePath } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSandbox, type SandboxProcess } from '../../src/sandbox/sandbox-process.js';
import { getCompiledBundle } from '../../src/sandbox/story-cache.js';
import type {
  Output,
  Ready,
  SandboxToServerMessage,
} from '../../src/wire/server-sandbox.js';

const RUN = Boolean(process.env.SHARPEE_BANDWIDTH);

const STORY_PATH = resolvePath(
  dirname(fileURLToPath(import.meta.url)),
  '../../stories/dungeo.sharpee',
);

const READY_TIMEOUT_MS = 30_000;
const TURN_TIMEOUT_MS = 30_000;

/**
 * The frozen command sequence. Edits to this list invalidate any prior
 * baseline numbers — re-record the document if you change the sequence.
 */
const COMMANDS = [
  'look',
  'open mailbox',
  'read leaflet',
  'take leaflet',
  'inventory',
  'south',
  'east',
  'open window',
  'enter window',
  'look',
] as const;

function waitForMessage<K extends SandboxToServerMessage['kind']>(
  proc: SandboxProcess,
  kind: K,
  filter: (m: Extract<SandboxToServerMessage, { kind: K }>) => boolean,
): Promise<Extract<SandboxToServerMessage, { kind: K }>> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      proc.off('message', handler);
      reject(new Error(`timeout waiting for ${kind}`));
    }, TURN_TIMEOUT_MS);
    const handler = (msg: SandboxToServerMessage): void => {
      if (msg.kind !== kind) return;
      const typed = msg as Extract<SandboxToServerMessage, { kind: K }>;
      if (!filter(typed)) return;
      clearTimeout(timer);
      proc.off('message', handler);
      resolve(typed);
    };
    proc.on('message', handler);
  });
}

function waitForReady(proc: SandboxProcess): Promise<Ready> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error('READY timeout')),
      READY_TIMEOUT_MS,
    );
    proc.once('ready', (ev: Ready) => {
      clearTimeout(timer);
      resolve(ev);
    });
  });
}

function median(nums: readonly number[]): number {
  const sorted = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? Math.round((sorted[mid - 1]! + sorted[mid]!) / 2)
    : sorted[mid]!;
}

describe.skipIf(!RUN)('ADR-162 AC-8 bandwidth baseline', () => {
  let proc: SandboxProcess | null = null;
  let cacheDir: string;
  let bundle_path: string;

  beforeAll(async () => {
    cacheDir = await mkdtemp(join(tmpdir(), 'bandwidth-bundle-'));
    process.env.STORIES_COMPILED_DIR = cacheDir;
    bundle_path = await getCompiledBundle(STORY_PATH);
  }, 60_000);

  afterAll(async () => {
    delete process.env.STORIES_COMPILED_DIR;
    await rm(cacheDir, { recursive: true, force: true });
  });

  beforeEach(() => {
    proc = spawnSandbox({
      room_id: 'bw-' + randomUUID(),
      story_file: STORY_PATH,
      bundle_path,
      readyTimeoutMs: READY_TIMEOUT_MS,
    });
  });

  afterEach(() => {
    if (proc) {
      proc.kill('SIGKILL');
      proc = null;
    }
  });

  it('records OUTPUT.world byte counts across the frozen 10-turn sequence', async () => {
    await waitForReady(proc!);

    const sizes: { command: string; bytes: number }[] = [];

    for (const command of COMMANDS) {
      const turn_id = `bw-${randomUUID()}`;
      proc!.send({ kind: 'COMMAND', turn_id, input: command });
      const out = await waitForMessage<'OUTPUT'>(
        proc!,
        'OUTPUT',
        (m) => m.turn_id === turn_id,
      );
      sizes.push({ command, bytes: (out as Output).world.length });
    }

    expect(sizes.length).toBe(COMMANDS.length);

    const bytesOnly = sizes.map((s) => s.bytes);
    const stats = {
      n: sizes.length,
      min: Math.min(...bytesOnly),
      median: median(bytesOnly),
      max: Math.max(...bytesOnly),
      mean: Math.round(bytesOnly.reduce((a, b) => a + b, 0) / bytesOnly.length),
    };

    // Emit on its own line, with a stable prefix, so the numbers can be
    // grepped out of the test runner's stdout and pasted into the doc.
    // eslint-disable-next-line no-console
    console.log('[ADR-162-AC8]', JSON.stringify({ sizes, stats }, null, 2));

    // Sanity: nothing came back empty, nothing came back absurdly large.
    expect(stats.min).toBeGreaterThan(0);
    expect(stats.max).toBeLessThan(50 * 1024 * 1024);
  });
});
