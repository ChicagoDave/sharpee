/**
 * SandboxProcess behavior tests.
 *
 * Behavior Statement — SandboxProcess
 *   DOES: spawns a subprocess with piped stdio, writes INIT on construction,
 *         parses framed messages from stdout, emits `ready`/`message`/`exit`
 *         events, emits `crash` when the subprocess exits without having
 *         sent EXITED.
 *   WHEN: the room manager needs to run turns inside a child process.
 *   BECAUSE: the runtime boundary is the Deno subprocess (ADR-153 Decision 1);
 *            crash detection enables AC7.
 *   REJECTS WHEN: malformed frames emit `frameError` but do not kill the process.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { fileURLToPath } from 'node:url';
import { resolve as resolvePath, dirname } from 'node:path';
import { SandboxProcess } from '../../src/sandbox/sandbox-process.js';
import type {
  Ready,
  Exited,
  SandboxToServerMessage,
} from '../../src/wire/server-sandbox.js';

// Minimal test subprocess. NOT a stub of the production sandbox — it is
// the collaborator at the process boundary that lets us drive the
// SandboxProcess wrapper's protocol (READY, crash, frame-parse) paths. See
// the header in fixtures/sandbox-process-child.mjs. End-to-end coverage of
// the real Deno path lives in tests/sandbox/deno-engine-integration.test.ts.
const CHILD = resolvePath(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  'fixtures',
  'sandbox-process-child.mjs'
);

function spawn(extraArgs: string[] = []): SandboxProcess {
  return new SandboxProcess({
    room_id: 'r1',
    story_file: '/unused/story.sharpee',
    binary: process.execPath,
    args: [CHILD, ...extraArgs],
    protocol: 1,
    readyTimeoutMs: 5_000,
  });
}

describe('SandboxProcess', () => {
  let sb: SandboxProcess | null = null;

  beforeEach(() => {
    sb = null;
  });
  afterEach(() => {
    sb?.kill('SIGKILL');
  });

  it('emits READY after INIT, then EXITED clean after SHUTDOWN', async () => {
    sb = spawn();
    const ready = await new Promise<Ready>((res) => sb!.on('ready', res));
    expect(ready.story_metadata.title).toBe('stub-story');

    const exited = new Promise<Exited>((res) => sb!.on('exit', res));
    sb.shutdown();
    const ev = await exited;
    expect(ev.reason).toBe('shutdown');
  });

  it('emits `crash` when the subprocess exits without EXITED', async () => {
    sb = spawn(['--crash-on-command']);
    await new Promise<Ready>((res) => sb!.on('ready', res));

    const crashP = new Promise<{
      exitCode: number | null;
      stderr: string;
    }>((res) => sb!.on('crash', (info) => res({ exitCode: info.exitCode, stderr: info.stderr })));

    sb.send({ kind: 'COMMAND', turn_id: 't1', input: 'look' });
    const crash = await crashP;
    expect(crash.exitCode).toBe(1);
    expect(crash.stderr).toContain('simulated crash');
  });

  it('round-trips a COMMAND → OUTPUT (message event)', async () => {
    sb = spawn();
    await new Promise<Ready>((res) => sb!.on('ready', res));

    const outputP = new Promise<SandboxToServerMessage>((res) => {
      sb!.on('message', (m) => {
        if (m.kind === 'OUTPUT') res(m);
      });
    });

    sb.send({ kind: 'COMMAND', turn_id: 'abc', input: 'look' });
    const out = await outputP;
    if (out.kind !== 'OUTPUT') throw new Error('expected OUTPUT');
    expect(out.turn_id).toBe('abc');
    expect(out.text_blocks[0]).toEqual({ kind: 'para', text: 'You said: look' });

    // Clean shutdown so the afterEach kill is a no-op.
    const exited = new Promise<Exited>((res) => sb!.on('exit', res));
    sb.shutdown();
    await exited;
  });
});
