/**
 * from-play.test.ts — createTranscriptFromPlay (ADR-305 D2/D5/D6).
 *
 * Derived from the Behavior Statement: each DOES line asserts on the
 * serialized text (the state this function produces) by parsing it back
 * through the real parser — never on intermediate structures; each REJECTS
 * WHEN line asserts the refusal names the turn and returns nothing.
 * Owner context: @sharpee/branch-tester tests.
 */
import { describe, it, expect } from 'vitest';
import { createTranscriptFromPlay, FromPlayError, PlayedTurnRecord } from '../src/from-play.js';
import { parseTranscript } from '../src/parser.js';

/** A played turn with the noise fields defaulted. */
function turn(over: Partial<PlayedTurnRecord> & Pick<PlayedTurnRecord, 'turn' | 'command'>): PlayedTurnRecord {
  return { output: 'Something happened.', selected: false, ...over };
}

const ROOM_CAPTURES = [
  { channel: 'room-name', values: ['Den'] },
  { channel: 'room-description', values: [{ content: ['A small square den.'] }] }
];

describe('createTranscriptFromPlay', () => {
  it('writes seed header, carries origin..last-selected, trims trailing unselected', () => {
    const text = createTranscriptFromPlay({
      policy: 'all-emitted-text',
      seed: 42,
      turns: [
        turn({ turn: 1, command: 'north' }),
        turn({ turn: 2, command: 'take torch', selected: true, output: 'Taken.' }),
        turn({ turn: 3, command: 'inventory' })
      ]
    });
    const parsed = parseTranscript(text, 'from-play.transcript');
    expect(parsed.config.seeds).toEqual([42]);
    // The grammar requires a title or story header; creation defaults one.
    expect(parsed.header.title).toBe('Created from play');
    // Trailing unselected turn 3 is trimmed; 1..2 carried in order.
    expect(parsed.commands.map(c => c.input)).toEqual(['north', 'take torch']);
  });

  it('selected turn under all-emitted-text gets [OK] + the literal output block', () => {
    const text = createTranscriptFromPlay({
      policy: 'all-emitted-text',
      seed: 7,
      turns: [turn({ turn: 1, command: 'look', selected: true, output: 'Den\nA small square den.' })]
    });
    const parsed = parseTranscript(text, 'from-play.transcript');
    expect(parsed.commands[0].assertions).toEqual([
      expect.objectContaining({ type: 'ok', block: ['Den', 'A small square den.'] })
    ]);
  });

  it('selected turn under a room policy gets contains-form from structured captures', () => {
    const text = createTranscriptFromPlay({
      policy: 'room-name-and-description',
      seed: 7,
      turns: [turn({ turn: 1, command: 'look', selected: true, captures: ROOM_CAPTURES })]
    });
    const parsed = parseTranscript(text, 'from-play.transcript');
    expect(parsed.commands[0].assertions).toEqual([
      expect.objectContaining({ type: 'ok-contains', value: 'Den' }),
      expect.objectContaining({ type: 'ok-contains', value: 'A small square den.' })
    ]);
  });

  it('selected turn under a room policy with no room emissions gets [SKIP]', () => {
    const text = createTranscriptFromPlay({
      policy: 'room-description',
      seed: 7,
      turns: [turn({ turn: 1, command: 'wait', selected: true })]
    });
    const parsed = parseTranscript(text, 'from-play.transcript');
    expect(parsed.commands[0].assertions).toEqual([expect.objectContaining({ type: 'skip' })]);
  });

  it('unselected setup turns get [SKIP]; selection gaps are carried as [SKIP]', () => {
    const text = createTranscriptFromPlay({
      policy: 'all-emitted-text',
      seed: 7,
      turns: [
        turn({ turn: 1, command: 'north' }),
        turn({ turn: 2, command: 'south', selected: true, output: 'Back.' }),
        turn({ turn: 3, command: 'east' }),
        turn({ turn: 4, command: 'west', selected: true, output: 'Again.' })
      ]
    });
    const parsed = parseTranscript(text, 'from-play.transcript');
    expect(parsed.commands.map(c => c.assertions[0]?.type)).toEqual(['skip', 'ok', 'skip', 'ok']);
  });

  it('under "let me decide" (no policy) selected turns get the [SKIP] placeholder', () => {
    const text = createTranscriptFromPlay({
      seed: 7,
      turns: [turn({ turn: 1, command: 'look', selected: true })]
    });
    const parsed = parseTranscript(text, 'from-play.transcript');
    expect(parsed.commands[0].assertions).toEqual([expect.objectContaining({ type: 'skip' })]);
  });

  it('a selected turn with blank output stays bare — what the runner would leave', () => {
    const text = createTranscriptFromPlay({
      policy: 'all-emitted-text',
      seed: 7,
      turns: [turn({ turn: 1, command: 'look', selected: true, output: '  \n ' })]
    });
    const parsed = parseTranscript(text, 'from-play.transcript');
    expect(parsed.commands[0].assertions).toEqual([]);
  });

  it('round-trips: the serialized text parses cleanly with no parse errors', () => {
    const text = createTranscriptFromPlay({
      policy: 'room-name-and-description',
      seed: 42,
      turns: [
        turn({ turn: 1, command: 'north' }),
        turn({ turn: 2, command: 'look', selected: true, captures: ROOM_CAPTURES })
      ]
    });
    const parsed = parseTranscript(text, 'from-play.transcript');
    expect(parsed.parseErrors).toBeUndefined();
  });

  it('rejects an empty selection, returning nothing', () => {
    expect(() =>
      createTranscriptFromPlay({ seed: 7, turns: [turn({ turn: 1, command: 'look' })] })
    ).toThrow(FromPlayError);
  });

  it('rejects a record with a blank command, naming the turn', () => {
    expect(() =>
      createTranscriptFromPlay({
        seed: 7,
        turns: [turn({ turn: 3, command: '  ', selected: true })]
      })
    ).toThrow(/turn 3/);
  });

  it('rejects a record with a missing output, naming the turn', () => {
    expect(() =>
      createTranscriptFromPlay({
        seed: 7,
        turns: [
          { turn: 5, command: 'look', output: undefined as unknown as string, selected: true }
        ]
      })
    ).toThrow(/turn 5/);
  });

  it('rejects a record with a non-finite ordinal', () => {
    expect(() =>
      createTranscriptFromPlay({
        seed: 7,
        turns: [turn({ turn: Number.NaN, command: 'look', selected: true })]
      })
    ).toThrow(FromPlayError);
  });
});
