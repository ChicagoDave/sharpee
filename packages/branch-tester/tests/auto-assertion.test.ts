/**
 * auto-assertion.test.ts — the `auto-assertion:` policy at the tier boundary
 * (go-live Phase 6e, #253).
 *
 * Derived from the Behavior Statement: under a policy, a bare command's first
 * run synthesizes the policy's assertions from the turn's REAL output, pushes
 * them onto the command, evaluates them normally, marks the result
 * `autoAsserted`, and rewrites the `.transcript` file; without a policy the
 * ADR-294 D2 tier-boundary failure stands; deliberate `[SKIP]`s and engine
 * errors are never touched.
 *
 * Owner context: branch-tester test suite (tooling).
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { EngineRandomService } from '@sharpee/engine';
import { synthesizeOpeningAssertions } from '../src/auto-assertion.js';
import { parseTranscript } from '../src/parser.js';
import { runTranscript } from '../src/runner.js';
import type { AutoAssertionPolicy } from '../src/types.js';

let dir: string;

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tt-autoassert-'));
});

afterEach(() => {
  fs.rmSync(dir, { recursive: true, force: true });
});

/** Write the source to disk (the policy rewrites it) and parse it. */
function fixtureOnDisk(source: string, name = 'fixture.transcript') {
  const filePath = path.join(dir, name);
  fs.writeFileSync(filePath, source);
  return { transcript: parseTranscript(source, filePath), filePath };
}

/**
 * Stub story layer in the suite's convention: `> north` moves and emits the
 * room channels, `> take` answers tersely with no room emission, `> blank`
 * says nothing, `> crash` throws. Real EngineRandomService (no draws occur).
 */
function roomEngine(policy?: AutoAssertionPolicy) {
  const service = new EngineRandomService(42);
  const engine = {
    autoAssertionPolicy: policy,
    // Structured captures, as bootstrap supplies them (ADR-300 D13): the
    // room name arrives decorated — the policy must read the text OUT of
    // the structure, never the flattened JSON rendering.
    lastChannelValues: {} as Record<string, unknown[]>,
    executeCommand: (cmd: string) => {
      engine.lastChannelValues = {};
      if (cmd === 'north') {
        engine.lastChannelValues = {
          'room-name': [{ content: [{ className: 'sharpee-room', content: ['Meadow'] }] }],
          'room-description': [{ content: ['Wildflowers nod in the wind.'] }]
        };
        return 'Meadow\nWildflowers nod in the wind.\n\nA scythe leans on the fence.';
      }
      if (cmd === 'take scythe') return 'Taken.';
      if (cmd === 'blank') return '';
      if (cmd === 'crash') throw new Error('engine exploded');
      return `You ${cmd}.`;
    },
    world: {},
    engine: {
      registerSaveRestoreHooks() { /* unused */ },
      async save() { return true; },
      async restore() { return true; },
      getMasterSeed: () => 42,
      getRandomService: () => service,
      setRandomTraceEnabled() { /* unused */ }
    }
  };
  return engine;
}

describe('all-emitted-text writes [OK] + the literal turn (Phase 6e)', () => {
  it('a bare command passes, is marked autoAsserted, and gains the block in memory', async () => {
    const { transcript } = fixtureOnDisk('title: T\n---\n> north\n');
    const result = await runTranscript(transcript, roomEngine('all-emitted-text') as never, {});

    expect(result.status).toBe('passed');
    expect(result.commands[0].autoAsserted).toBe(true);
    expect(result.commands[0].assertionResults[0].passed).toBe(true);
    const written = transcript.commands[0].assertions;
    expect(written).toHaveLength(1);
    expect(written[0].type).toBe('ok');
    expect(written[0].block).toEqual([
      'Meadow',
      'Wildflowers nod in the wind.',
      '',
      'A scythe leans on the fence.'
    ]);
  });

  it('rewrites the file on disk, and the written file passes a fresh run un-flagged', async () => {
    const { transcript, filePath } = fixtureOnDisk('title: T\n---\n> north\n');
    await runTranscript(transcript, roomEngine('all-emitted-text') as never, {});

    const onDisk = fs.readFileSync(filePath, 'utf-8');
    expect(onDisk).toContain('> north');
    expect(onDisk).toContain('[OK]');
    expect(onDisk).toContain('text');
    expect(onDisk).toContain('Wildflowers nod in the wind.');
    expect(onDisk).toContain('end text');

    // The write is the test the next run reads: re-parse and re-run.
    const reparsed = parseTranscript(onDisk, filePath);
    const rerun = await runTranscript(reparsed, roomEngine('all-emitted-text') as never, {});
    expect(rerun.status).toBe('passed');
    expect(rerun.commands[0].autoAsserted).toBeUndefined();
  });

  it('leaves authored content alone — comments and asserted commands survive the rewrite', async () => {
    const source = 'title: T\n---\n# the walk begins\n> wait\n[OK: contains "You wait."]\n\n> north\n';
    const { transcript, filePath } = fixtureOnDisk(source);
    const result = await runTranscript(transcript, roomEngine('all-emitted-text') as never, {});

    expect(result.status).toBe('passed');
    expect(result.commands[0].autoAsserted).toBeUndefined();
    const onDisk = fs.readFileSync(filePath, 'utf-8');
    expect(onDisk).toContain('# the walk begins');
    expect(onDisk).toContain('[OK: contains "You wait."]');
  });
});

describe('room policies write contains-form from the room channel captures', () => {
  it('room-name-and-description asserts both, from the emissions', async () => {
    const { transcript, filePath } = fixtureOnDisk('title: T\n---\n> north\n');
    const result = await runTranscript(transcript, roomEngine('room-name-and-description') as never, {});

    expect(result.status).toBe('passed');
    expect(result.commands[0].autoAsserted).toBe(true);
    const written = transcript.commands[0].assertions;
    expect(written.map(a => [a.type, a.value])).toEqual([
      ['ok-contains', 'Meadow'],
      ['ok-contains', 'Wildflowers nod in the wind.']
    ]);
    const onDisk = fs.readFileSync(filePath, 'utf-8');
    expect(onDisk).toContain('[OK: contains "Meadow"]');
    expect(onDisk).toContain('[OK: contains "Wildflowers nod in the wind."]');
  });

  it('room-description asserts the description only', async () => {
    const { transcript } = fixtureOnDisk('title: T\n---\n> north\n');
    const result = await runTranscript(transcript, roomEngine('room-description') as never, {});

    expect(result.status).toBe('passed');
    const written = transcript.commands[0].assertions;
    expect(written.map(a => [a.type, a.value])).toEqual([
      ['ok-contains', 'Wildflowers nod in the wind.']
    ]);
  });

  it('a turn emitting neither room channel gets a deliberate [SKIP]', async () => {
    const { transcript, filePath } = fixtureOnDisk('title: T\n---\n> take scythe\n');
    const result = await runTranscript(transcript, roomEngine('room-description') as never, {});

    expect(result.status).toBe('passed');
    expect(result.commands[0].skipped).toBe(true);
    expect(result.commands[0].autoAsserted).toBe(true);
    expect(transcript.commands[0].assertions.map(a => a.type)).toEqual(['skip']);
    expect(fs.readFileSync(filePath, 'utf-8')).toContain('[SKIP]');
  });
});

describe('the boundary and its exclusions hold', () => {
  it('without a policy, the ADR-294 D2 tier-boundary failure stands', async () => {
    const { transcript, filePath } = fixtureOnDisk('title: T\n---\n> north\n');
    const before = fs.readFileSync(filePath, 'utf-8');
    const result = await runTranscript(transcript, roomEngine(undefined) as never, {});

    expect(result.status).toBe('failed');
    expect(result.commands[0].error).toMatch(/has no assertion — add one, or declare an auto-assertion: policy/);
    expect(fs.readFileSync(filePath, 'utf-8')).toBe(before);
  });

  it('a deliberate [SKIP] is never trampled and the file is never rewritten', async () => {
    const source = 'title: T\n---\n> north\n[SKIP]\n';
    const { transcript, filePath } = fixtureOnDisk(source);
    const result = await runTranscript(transcript, roomEngine('all-emitted-text') as never, {});

    expect(result.status).toBe('passed');
    expect(result.commands[0].skipped).toBe(true);
    expect(result.commands[0].autoAsserted).toBeUndefined();
    expect(transcript.commands[0].assertions.map(a => a.type)).toEqual(['skip']);
    expect(fs.readFileSync(filePath, 'utf-8')).toBe(source);
  });

  it('an engine error on a bare command fails without writing an assertion', async () => {
    const { transcript, filePath } = fixtureOnDisk('title: T\n---\n> crash\n');
    const before = fs.readFileSync(filePath, 'utf-8');
    const result = await runTranscript(transcript, roomEngine('all-emitted-text') as never, {});

    expect(result.status).toBe('failed');
    expect(result.commands[0].autoAsserted).toBeUndefined();
    expect(transcript.commands[0].assertions).toEqual([]);
    expect(fs.readFileSync(filePath, 'utf-8')).toBe(before);
  });

  it('blank output on a bare command keeps the blank-output failure, unwritten', async () => {
    const { transcript, filePath } = fixtureOnDisk('title: T\n---\n> blank\n');
    const before = fs.readFileSync(filePath, 'utf-8');
    const result = await runTranscript(transcript, roomEngine('all-emitted-text') as never, {});

    expect(result.status).toBe('failed');
    expect(result.commands[0].error).toBe('blank output');
    expect(transcript.commands[0].assertions).toEqual([]);
    expect(fs.readFileSync(filePath, 'utf-8')).toBe(before);
  });
});

/** Boot captures as bootstrap snapshots them: prologue prose + info payload. */
const BOOT_CAPTURES: Record<string, unknown[]> = {
  prologue: [{ content: ['A cold night settles over the estate.'] }],
  info: [{ title: 'The Folly at Fernhill', description: 'One cold winter night.' }],
};

describe('synthesizeOpeningAssertions — the opening defaults (ADR-307 open question D)', () => {
  it('claims prologue, title, and description from the boot captures', () => {
    expect(synthesizeOpeningAssertions('room-name-and-description', BOOT_CAPTURES)).toEqual([
      {
        type: 'channel-contains',
        channelId: 'prologue',
        value: 'A cold night settles over the estate.',
      },
      {
        type: 'channel-is',
        channelId: 'info',
        channelPath: ['title'],
        channelExpected: 'The Folly at Fernhill',
      },
      {
        type: 'channel-is',
        channelId: 'info',
        channelPath: ['description'],
        channelExpected: 'One cold winter night.',
      },
    ]);
  });

  it('each piece self-gates on its capture — absent channels claim nothing', () => {
    expect(
      synthesizeOpeningAssertions('room-name-and-description', {
        info: [{ title: 'Mini' }],
      }),
    ).toEqual([
      { type: 'channel-is', channelId: 'info', channelPath: ['title'], channelExpected: 'Mini' },
    ]);
    expect(synthesizeOpeningAssertions('room-name-and-description', {})).toEqual([]);
  });

  it('no policy or no captures synthesize nothing', () => {
    expect(synthesizeOpeningAssertions(undefined, BOOT_CAPTURES)).toEqual([]);
    expect(synthesizeOpeningAssertions('all-emitted-text', undefined)).toEqual([]);
  });

  it('the runner evaluates them for a claim-less opening, as an (opening) row', async () => {
    const { transcript } = fixtureOnDisk(
      'title: T\nauto-assertion: room-name-and-description\n---\n> north\n',
    );
    const engine = roomEngine('room-name-and-description') as Record<string, unknown>;
    engine.bootChannelValues = BOOT_CAPTURES;
    const result = await runTranscript(transcript, engine as never, {});

    const opening = result.commands.find((row) => row.command.input === '(opening)');
    expect(opening).toBeDefined();
    expect(opening!.passed).toBe(true);
    expect(opening!.assertionResults).toHaveLength(3);
  });

  it('without boot captures the runner adds no opening row — the v1 path is unchanged', async () => {
    const { transcript } = fixtureOnDisk(
      'title: T\nauto-assertion: room-name-and-description\n---\n> north\n',
    );
    const result = await runTranscript(
      transcript,
      roomEngine('room-name-and-description') as never,
      {},
    );
    expect(result.commands.some((row) => row.command.input === '(opening)')).toBe(false);
    expect(result.status).toBe('passed');
  });
});
