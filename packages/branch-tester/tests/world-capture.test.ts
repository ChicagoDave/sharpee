/**
 * world-capture.test.ts — executed commands carry a world snapshot when asked.
 *
 * R3/R5 (Phase 5): the state evaluator reads the world through the engine
 * seam, so the runner can also SAY what it sees — player location and
 * inventory after each command, each entity named with a display name and the
 * single token the evaluator's own `findEntity` resolves back. Derived from
 * the Behavior Statement: snapshots present exactly under `captureWorld`
 * against a seam with a world and a player; token prefers a whitespace-free
 * alias, falls back to the id; a crashed command gets no snapshot.
 *
 * Transcripts are built in memory, the same shape the tree-walker synthesizes
 * from document lines; the walker takes its per-line entry snapshots through
 * the same `captureWorldSnapshot` tested directly here.
 *
 * Owner context: branch-tester test suite (tooling).
 */
import { describe, expect, it } from 'vitest';
import { EngineRandomService } from '@sharpee/engine';
import { runTranscript, captureWorldSnapshot } from '../src/runner.js';
import type { Assertion, Transcript, TranscriptCommand, TranscriptItem } from '../src/types.js';

/** Build an in-memory transcript the way the tree-walker does from a line. */
function transcriptOf(...commands: Array<{ input: string; assertions?: Assertion[] }>): Transcript {
  const built: TranscriptCommand[] = commands.map((c) => ({
    lineNumber: 0,
    input: c.input,
    expectedOutput: [],
    assertions: c.assertions ?? [],
  }));
  const items: TranscriptItem[] = built.map((command) => ({ type: 'command', command }));
  return { filePath: '', header: {}, commands: built, items, comments: [] };
}

const okContains = (value: string): Assertion => ({ type: 'ok-contains', value });

/**
 * Stub world in the evaluator's own structural shape: a player in a hall,
 * carrying a letter whose identity has a single-token alias, and a two-word
 * key whose identity offers no usable alias (its id is the token then).
 */
function worldStub() {
  const hall = { id: 'r01', name: 'Entrance Hall', traits: new Map() };
  const letter = {
    id: 'o01',
    name: "solicitor's letter",
    traits: new Map([['identity', { name: "solicitor's letter", aliases: ['summons', 'the letter'] }]]),
  };
  const key = {
    id: 'o02',
    name: 'tarnished key',
    traits: new Map([['identity', { name: 'tarnished key', aliases: [] }]]),
  };
  const player = { id: 'p01', name: 'player', traits: new Map() };
  const carried = [letter];
  return {
    world: {
      getPlayer: () => player,
      getLocation: (id: string) => (id === player.id ? hall.id : undefined),
      getContents: (id: string) => (id === player.id ? carried : []),
      getEntity: (id: string) => [hall, letter, key, player].find((e) => e.id === id),
    },
    take: () => carried.push(key),
  };
}

/** Echo engine over the stub world; `take key` moves the key into hands. */
function worldEngine(stub = worldStub()) {
  const service = new EngineRandomService(42);
  return {
    executeCommand: (cmd: string) => {
      if (cmd === 'crash') throw new Error('engine exploded');
      if (cmd === 'take key') stub.take();
      return `You ${cmd}.`;
    },
    world: stub.world,
    engine: {
      registerSaveRestoreHooks() { /* unused */ },
      async save() { return true; },
      async restore() { return true; },
      getMasterSeed: () => 42,
      getRandomService: () => service,
      setRandomTraceEnabled() { /* unused */ }
    }
  };
}

describe('world snapshots on command results (R3)', () => {
  it('carries location and inventory after each command, tokens alias-first with id fallback', async () => {
    const transcript = transcriptOf(
      { input: 'look', assertions: [okContains('look')] },
      { input: 'take key', assertions: [okContains('take')] },
    );

    const result = await runTranscript(transcript, worldEngine() as never, { captureWorld: true });

    expect(result.status).toBe('passed');
    const first = result.commands[0].world;
    expect(first?.location).toEqual({ name: 'Entrance Hall', token: 'r01' });
    expect(first?.inventory).toEqual([{ name: "solicitor's letter", token: 'summons' }]);
    // After the take, the two-word key rides with its id as the token — the
    // only single token the evaluator is guaranteed to resolve.
    const second = result.commands[1].world;
    expect(second?.inventory).toEqual([
      { name: "solicitor's letter", token: 'summons' },
      { name: 'tarnished key', token: 'o02' },
    ]);
  });

  it('is off by default — an unflagged run carries no snapshots', async () => {
    const transcript = transcriptOf({ input: 'look', assertions: [okContains('look')] });

    const result = await runTranscript(transcript, worldEngine() as never, {});

    expect(result.status).toBe('passed');
    expect('world' in result.commands[0]).toBe(false);
  });

  it('omits the snapshot against a seam without a world, and on a crashed command', async () => {
    const noWorld = transcriptOf({ input: 'look', assertions: [okContains('look')] });
    const service = new EngineRandomService(42);
    const worldless = {
      executeCommand: (cmd: string) => `You ${cmd}.`,
      engine: {
        registerSaveRestoreHooks() { /* unused */ },
        async save() { return true; },
        async restore() { return true; },
        getMasterSeed: () => 42,
        getRandomService: () => service,
        setRandomTraceEnabled() { /* unused */ }
      }
    };
    const bare = await runTranscript(noWorld, worldless as never, { captureWorld: true });
    expect('world' in bare.commands[0]).toBe(false);

    const crashing = transcriptOf(
      { input: 'look', assertions: [okContains('look')] },
      { input: 'crash', assertions: [{ type: 'skip' }] },
    );
    const crashed = await runTranscript(crashing, worldEngine() as never, { captureWorld: true });
    expect(crashed.commands[0].world).toBeDefined();
    expect('world' in crashed.commands[1]).toBe(false);
  });

  it('captureWorldSnapshot reads the live world directly — the walker uses it at line entry', () => {
    const stub = worldStub();
    const before = captureWorldSnapshot({ world: stub.world as never });
    expect(before?.location?.name).toBe('Entrance Hall');
    expect(before?.inventory).toHaveLength(1);
    stub.take();
    const after = captureWorldSnapshot({ world: stub.world as never });
    expect(after?.inventory).toHaveLength(2);
    expect(captureWorldSnapshot({ world: undefined })).toBeUndefined();
  });
});
