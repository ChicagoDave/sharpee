/**
 * world-capture.test.ts — executed commands carry a world snapshot when asked.
 *
 * R3/R5 (Phase 5): the `[STATE:]` evaluator reads the world through the
 * engine seam, so the runner can also SAY what it sees — player location and
 * inventory after each command, each entity named with a display name and the
 * single token the evaluator's own `findEntity` resolves back. Derived from
 * the Behavior Statement: snapshots present exactly under `captureWorld`
 * against a seam with a world and a player; token prefers a whitespace-free
 * alias, falls back to the id; a crashed command gets no snapshot.
 *
 * Owner context: branch-tester test suite (tooling).
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { EngineRandomService } from '@sharpee/engine';
import { parseTranscript, parseTranscriptFile } from '../src/parser.js';
import { runTranscript, captureWorldSnapshot } from '../src/runner.js';
import { assembleTree } from '../src/tree.js';
import { runTree } from '../src/tree-runner.js';
import type { WorldSnapshot } from '../src/types.js';

let dir: string;

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tt-world-'));
});

afterEach(() => {
  fs.rmSync(dir, { recursive: true, force: true });
});

function fixture(source: string, name = 'fixture.transcript') {
  return parseTranscript(source, path.join(dir, name));
}

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
    const transcript = fixture(
      'title: T\n---\n> look\n[OK: contains "look"]\n\n> take key\n[OK: contains "take"]\n'
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
    const transcript = fixture('title: T\n---\n> look\n[OK: contains "look"]\n');

    const result = await runTranscript(transcript, worldEngine() as never, {});

    expect(result.status).toBe('passed');
    expect('world' in result.commands[0]).toBe(false);
  });

  it('omits the snapshot against a seam without a world, and on a crashed command', async () => {
    const noWorld = fixture('title: T\n---\n> look\n[OK: contains "look"]\n', 'no-world.transcript');
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

    const crashing = fixture(
      'title: T\n---\n> look\n[OK: contains "look"]\n\n> crash\n[SKIP]\n', 'crash.transcript');
    const crashed = await runTranscript(crashing, worldEngine() as never, { captureWorld: true });
    expect(crashed.commands[0].world).toBeDefined();
    expect('world' in crashed.commands[1]).toBe(false);
  });

  it('golden record mode carries snapshots the same way', async () => {
    const transcript = fixture('title: T\nstory: t\nseed: 42\n---\n> look\n\n> take key\n', 'golden.transcript');

    const result = await runTranscript(transcript, worldEngine() as never, { bless: true, captureWorld: true });

    expect(result.status).toBe('passed');
    expect(result.commands[1].world?.inventory.map((i) => i.token)).toEqual(['summons', 'o02']);
  });

  it('the tree runner hands each node its ENTRY world — after ancestry, before its own commands', async () => {
    // A root that takes the key, and a child continuing from it: the child's
    // entry snapshot must already carry the key (the ancestry ran), while the
    // root's entry snapshot must not (nothing has run yet).
    const writeFixture = (stem: string, header: string, commands: string[]) => {
      const body = commands.map((c) => `> ${c}\n[OK: contains "ok"]\n`).join('\n');
      const file = path.join(dir, `${stem}.transcript`);
      fs.writeFileSync(file, `title: ${stem}\n${header}---\n\n${body}`, 'utf-8');
      return parseTranscriptFile(file);
    };
    const tree = assembleTree([
      writeFixture('root', '', ['take key']),
      writeFixture('child', 'continues: root\n', ['look']),
    ]);
    expect(tree.defects).toEqual([]);

    const stub = worldStub();
    const factory = async () => ({
      executeCommand: (cmd: string) => {
        if (cmd === 'take key') stub.take();
        return 'ok';
      },
      world: stub.world,
      engine: {
        registerSaveRestoreHooks() { /* unused */ },
        getMasterSeed: () => 42,
        getRandomService: () => ({
          reseedStreams() {},
          loadForces() {},
          clearForces() {},
          getForceReport: () => [],
          setPointSeedOverrides() {},
        }),
        setRandomTraceEnabled() {},
      },
    });

    const entries: Array<{ stem: string; entryWorld?: WorldSnapshot }> = [];
    await runTree(tree, factory as never, {
      captureWorld: true,
      treeObserver: {
        onNodeStart: ({ node, entryWorld }) => entries.push({ stem: node.stem, entryWorld }),
      },
    });

    expect(entries.map((e) => e.stem)).toEqual(['root', 'child']);
    expect(entries[0].entryWorld?.inventory.map((i) => i.token)).toEqual(['summons']);
    expect(entries[1].entryWorld?.inventory.map((i) => i.token)).toEqual(['summons', 'o02']);
  });

  it('captureWorldSnapshot reads the live world directly — the tree runner uses it at node entry', () => {
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
