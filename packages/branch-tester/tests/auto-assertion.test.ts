/**
 * auto-assertion.test.ts — the auto-assertion policy at the tier boundary.
 *
 * Derived from the Behavior Statement: under a policy, a bare command's run
 * synthesizes the policy's assertions from the turn's REAL output, pushes
 * them onto the in-memory transcript, evaluates them normally, and marks the
 * result `autoAsserted`; without a policy the ADR-294 D2 tier-boundary
 * failure stands; deliberate skips and engine errors are never touched.
 *
 * Post-ADR-307 cutover the runner never writes to disk — record-time
 * persistence is the Testing tab's job, and a document run assumes nothing.
 * Transcripts here are built in memory, the same shape the tree-walker
 * synthesizes from document lines.
 *
 * Owner context: branch-tester test suite (tooling).
 */
import { describe, expect, it } from 'vitest';
import { EngineRandomService } from '@sharpee/engine';
import { synthesizeOpeningAssertions } from '../src/auto-assertion.js';
import { runTranscript } from '../src/runner.js';
import type { Assertion, AutoAssertionPolicy, Transcript, TranscriptCommand, TranscriptItem } from '../src/types.js';

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

describe('all-emitted-text writes [OK] + the literal turn', () => {
  it('a bare command passes, is marked autoAsserted, and gains the block in memory', async () => {
    const transcript = transcriptOf({ input: 'north' });
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

  it('authored assertions are never synthesized over', async () => {
    const transcript = transcriptOf(
      { input: 'wait', assertions: [{ type: 'ok-contains', value: 'You wait.' }] },
      { input: 'north' },
    );
    const result = await runTranscript(transcript, roomEngine('all-emitted-text') as never, {});

    expect(result.status).toBe('passed');
    expect(result.commands[0].autoAsserted).toBeUndefined();
    expect(transcript.commands[0].assertions).toEqual([{ type: 'ok-contains', value: 'You wait.' }]);
    expect(result.commands[1].autoAsserted).toBe(true);
  });
});

describe('room policies write contains-form from the room channel captures', () => {
  it('room-name-and-description asserts both, from the emissions', async () => {
    const transcript = transcriptOf({ input: 'north' });
    const result = await runTranscript(transcript, roomEngine('room-name-and-description') as never, {});

    expect(result.status).toBe('passed');
    expect(result.commands[0].autoAsserted).toBe(true);
    const written = transcript.commands[0].assertions;
    expect(written.map(a => [a.type, a.value])).toEqual([
      ['ok-contains', 'Meadow'],
      ['ok-contains', 'Wildflowers nod in the wind.']
    ]);
  });

  it('room-description asserts the description only', async () => {
    const transcript = transcriptOf({ input: 'north' });
    const result = await runTranscript(transcript, roomEngine('room-description') as never, {});

    expect(result.status).toBe('passed');
    const written = transcript.commands[0].assertions;
    expect(written.map(a => [a.type, a.value])).toEqual([
      ['ok-contains', 'Wildflowers nod in the wind.']
    ]);
  });

  it('a turn emitting neither room channel gets a deliberate skip', async () => {
    const transcript = transcriptOf({ input: 'take scythe' });
    const result = await runTranscript(transcript, roomEngine('room-description') as never, {});

    expect(result.status).toBe('passed');
    expect(result.commands[0].skipped).toBe(true);
    expect(result.commands[0].autoAsserted).toBe(true);
    expect(transcript.commands[0].assertions.map(a => a.type)).toEqual(['skip']);
  });
});

describe('the boundary and its exclusions hold', () => {
  it('without a policy, the ADR-294 D2 tier-boundary failure stands', async () => {
    const transcript = transcriptOf({ input: 'north' });
    const result = await runTranscript(transcript, roomEngine(undefined) as never, {});

    expect(result.status).toBe('failed');
    expect(result.commands[0].error).toMatch(/has no assertion — add one, or declare an auto-assertion: policy/);
  });

  it('a deliberate skip is never trampled', async () => {
    const transcript = transcriptOf({ input: 'north', assertions: [{ type: 'skip' }] });
    const result = await runTranscript(transcript, roomEngine('all-emitted-text') as never, {});

    expect(result.status).toBe('passed');
    expect(result.commands[0].skipped).toBe(true);
    expect(result.commands[0].autoAsserted).toBeUndefined();
    expect(transcript.commands[0].assertions.map(a => a.type)).toEqual(['skip']);
  });

  it('an engine error on a bare command fails without writing an assertion', async () => {
    const transcript = transcriptOf({ input: 'crash' });
    const result = await runTranscript(transcript, roomEngine('all-emitted-text') as never, {});

    expect(result.status).toBe('failed');
    expect(result.commands[0].autoAsserted).toBeUndefined();
    expect(transcript.commands[0].assertions).toEqual([]);
  });

  it('blank output on a bare command keeps the blank-output failure, unwritten', async () => {
    const transcript = transcriptOf({ input: 'blank' });
    const result = await runTranscript(transcript, roomEngine('all-emitted-text') as never, {});

    expect(result.status).toBe('failed');
    expect(result.commands[0].error).toBe('blank output');
    expect(transcript.commands[0].assertions).toEqual([]);
  });
});

/** Boot captures as bootstrap snapshots them: prologue prose + info payload. */
const BOOT_CAPTURES: Record<string, unknown[]> = {
  prologue: [{ content: ['A cold night settles over the estate.'] }],
  info: [{ title: 'The Folly at Fernhill', description: 'One cold winter night.' }],
};

describe('synthesizeOpeningAssertions — the opening defaults (ADR-307 open question D)', () => {
  // GH #280. Both shipped sample stories (ides-of-march, fernhill) declare
  // `title:`/`description:` and NO prologue, and both recorded an empty opening
  // card. The suite above did not catch it because its fixture hands the
  // synthesizer an `info` capture the real pipeline never produced —
  // `openingChannels` in @sharpee/bootstrap captured only ['banner','prologue'],
  // so `bootChannelValues['info']` was always undefined in production and the
  // title/description branch was unreachable. The fixture was right about the
  // shape and wrong about reality; this case pins the story shape that actually
  // ships.
  it('claims title and description when the story has no prologue', () => {
    const infoOnly = { info: [{ title: 'The Ides of March', description: 'Three days.' }] };
    const claims = synthesizeOpeningAssertions('room-name-and-description', infoOnly);
    expect(claims.length).toBeGreaterThan(0);
    expect(claims.some((c) => c.channelPath?.includes('title'))).toBe(true);
    expect(claims.some((c) => c.channelPath?.includes('description'))).toBe(true);
  });

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
    const transcript = transcriptOf({ input: 'north' });
    const engine = roomEngine('room-name-and-description') as Record<string, unknown>;
    engine.bootChannelValues = BOOT_CAPTURES;
    const result = await runTranscript(transcript, engine as never, {});

    const opening = result.commands.find((row) => row.command.input === '(opening)');
    expect(opening).toBeDefined();
    expect(opening!.passed).toBe(true);
    expect(opening!.assertionResults).toHaveLength(3);
  });

  it('without boot captures the runner adds no opening row — the path is unchanged', async () => {
    const transcript = transcriptOf({ input: 'north' });
    const result = await runTranscript(
      transcript,
      roomEngine('room-name-and-description') as never,
      {},
    );
    expect(result.commands.some((row) => row.command.input === '(opening)')).toBe(false);
    expect(result.status).toBe('passed');
  });
});
