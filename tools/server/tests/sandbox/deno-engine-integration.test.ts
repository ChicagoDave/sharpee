/**
 * ACCEPTANCE GATE for ADR-153 Phase 4 — Deno Sandbox Integration.
 *
 * This test exercises the production sandbox path end-to-end with zero
 * stubs: a real `deno` binary, the real `src/sandbox/deno-entry.ts` entry
 * point, the real `@sharpee/engine`, and a real `.sharpee` story bundle.
 * It is the one test whose passing proves Phase 4 was actually delivered.
 *
 * Rule enforced: No-Stub-Under-Test (see docs/work/stub-antipattern.md).
 * The system under test is not replaceable with something we wrote. This
 * file NEVER uses `tests/fixtures/stub-sandbox.mjs`, `tests/helpers/fake-sandbox.ts`,
 * or any `sandboxOverride` on production code paths. The imports make that
 * statically checkable.
 *
 * Expected state on 2026-04-23: RED. `deno-entry.ts` is a Phase 0 stub
 * that handles only INIT → READY and SHUTDOWN. Every behavioral assertion
 * below will fail until the engine is wired into the Deno entry point.
 * That's the point — RED until Phase 4 is actually done.
 *
 * Environmental precondition: `deno` must be on PATH. If not, spawn fails
 * with ENOENT and the test reports "deno not installed" rather than
 * silently falling back to a stub. The remediation for a missing Deno is
 * to install Deno on the test host, never to swap in a fake.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { dirname, resolve as resolvePath } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSandbox, type SandboxProcess } from '../../src/sandbox/sandbox-process.js';
import type {
  SandboxToServerMessage,
  Ready,
  Output,
  SaveResponse,
  Restored,
  Exited,
} from '../../src/wire/server-sandbox.js';

// Resolve the real story bundle that ships with this repo. This is the
// same file the running container mounts at /data/stories/dungeo.sharpee.
const STORY_PATH = resolvePath(
  dirname(fileURLToPath(import.meta.url)),
  '../../stories/dungeo.sharpee',
);

const READY_TIMEOUT_MS = 15_000;
const TURN_TIMEOUT_MS = 15_000;

/**
 * Wait for the next message of the given kind that matches an optional
 * filter. Rejects on timeout so a silent engine doesn't hang the suite.
 */
function waitForMessage<K extends SandboxToServerMessage['kind']>(
  proc: SandboxProcess,
  kind: K,
  opts: {
    timeoutMs?: number;
    filter?: (msg: Extract<SandboxToServerMessage, { kind: K }>) => boolean;
  } = {},
): Promise<Extract<SandboxToServerMessage, { kind: K }>> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      proc.off('message', handler);
      reject(new Error(`timeout waiting for ${kind}`));
    }, opts.timeoutMs ?? TURN_TIMEOUT_MS);
    const handler = (msg: SandboxToServerMessage): void => {
      if (msg.kind !== kind) return;
      const typed = msg as Extract<SandboxToServerMessage, { kind: K }>;
      if (opts.filter && !opts.filter(typed)) return;
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

describe('deno-entry integration (real Deno, real engine, real story)', () => {
  let proc: SandboxProcess | null = null;

  beforeEach(() => {
    proc = spawnSandbox({
      room_id: 'acceptance-' + randomUUID(),
      story_file: STORY_PATH,
      readyTimeoutMs: READY_TIMEOUT_MS,
    });
  });

  afterEach(() => {
    if (proc) {
      proc.kill('SIGKILL');
      proc = null;
    }
  });

  it('INIT → READY returns real story metadata from the .sharpee bundle', async () => {
    const ready = await waitForReady(proc!);
    expect(ready.story_metadata).toBeDefined();
    // The Phase 0 stub hardcodes `(stub)` — refuse that value explicitly.
    expect(ready.story_metadata.title).not.toBe('(stub)');
    expect(ready.story_metadata.title.length).toBeGreaterThan(0);
    // A real bundle ships a real version string; the stub hardcodes '0.0.0'.
    expect(ready.story_metadata.version).toBeDefined();
    expect(ready.story_metadata.version).not.toBe('0.0.0');
  });

  it('COMMAND "look" → OUTPUT with non-empty text_blocks from the engine', async () => {
    await waitForReady(proc!);
    const turn_id = 'look-' + randomUUID();
    proc!.send({ kind: 'COMMAND', turn_id, input: 'look' });
    const output = await waitForMessage<'OUTPUT'>(proc!, 'OUTPUT', {
      filter: (m) => m.turn_id === turn_id,
    });
    // A real engine produces at least one text block of prose.
    expect(output.text_blocks.length).toBeGreaterThan(0);
    // The stub echoes the input verbatim as a short string. A real
    // opening-room description serializes to substantially more JSON.
    const serialized = JSON.stringify(output.text_blocks);
    expect(serialized.length).toBeGreaterThan(200);
    // The stub emits no engine events; a real turn emits at least one.
    expect(output.events.length).toBeGreaterThan(0);
  });

  it('SAVE → SAVED returns a blob large enough to hold real engine state', async () => {
    await waitForReady(proc!);
    const save_id = 'save-' + randomUUID();
    proc!.send({ kind: 'SAVE', save_id });
    const saved = await waitForMessage<'SAVED'>(proc!, 'SAVED', {
      filter: (m) => m.save_id === save_id,
    });
    // The stub returns base64('stub-save') = 'c3R1Yi1zYXZl' (12 chars).
    // Real engine state is orders of magnitude larger.
    expect(saved.blob_b64.length).toBeGreaterThan(500);
  });

  it('SAVE then RESTORE round-trips observable engine state', async () => {
    await waitForReady(proc!);

    // Capture pre-save observable state.
    const lookBeforeId = 'look-before-' + randomUUID();
    proc!.send({ kind: 'COMMAND', turn_id: lookBeforeId, input: 'look' });
    const lookBefore = await waitForMessage<'OUTPUT'>(proc!, 'OUTPUT', {
      filter: (m) => m.turn_id === lookBeforeId,
    });

    // Save at this state.
    const save_id = 'rt-' + randomUUID();
    proc!.send({ kind: 'SAVE', save_id });
    const saved = await waitForMessage<'SAVED'>(proc!, 'SAVED', {
      filter: (m) => m.save_id === save_id,
    });

    // Mutate state with a command the engine will react to.
    const mutateId = 'mutate-' + randomUUID();
    proc!.send({ kind: 'COMMAND', turn_id: mutateId, input: 'inventory' });
    await waitForMessage<'OUTPUT'>(proc!, 'OUTPUT', {
      filter: (m) => m.turn_id === mutateId,
    });

    // Restore from the earlier blob.
    proc!.send({ kind: 'RESTORE', save_id, blob_b64: saved.blob_b64 });
    await waitForMessage<'RESTORED'>(proc!, 'RESTORED', {
      filter: (m) => m.save_id === save_id,
    });

    // Observable state after restore must match pre-save `look` output.
    const lookAfterId = 'look-after-' + randomUUID();
    proc!.send({ kind: 'COMMAND', turn_id: lookAfterId, input: 'look' });
    const lookAfter = await waitForMessage<'OUTPUT'>(proc!, 'OUTPUT', {
      filter: (m) => m.turn_id === lookAfterId,
    });

    expect(JSON.stringify(lookAfter.text_blocks)).toBe(
      JSON.stringify(lookBefore.text_blocks),
    );
  });

  it('SHUTDOWN → EXITED cleanly with reason "shutdown"', async () => {
    await waitForReady(proc!);
    const exited = new Promise<Exited>((resolve) => {
      proc!.once('exit', (ev: Exited) => resolve(ev));
    });
    proc!.shutdown();
    const ev = await exited;
    expect(ev.reason).toBe('shutdown');
  });
});
