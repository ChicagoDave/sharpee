/**
 * ending.test.ts — the Ending read as state, and the guard it feeds.
 *
 * The defect these pin: a stopped engine refuses every command and returns
 * each refusal as a COMPLETED turn record. A driver that asks only "did a turn
 * land" therefore walks on forever. Every case below is one the real feed
 * produces — the channel's three answers (record, clear, silence) are
 * different claims, and reading silence as "not ended" is the specific mistake
 * that would reintroduce the walk.
 */
import { describe, expect, it } from 'vitest';
import { blocksCommand, endingOf } from '../src/ending.js';

const ending = (kind: string) => [{
  channel: 'story-ending',
  values: [{ kind, turn: 12 }],
}];

describe('endingOf', () => {
  it('reads a victory as ended', () => {
    expect(endingOf(ending('victory'))).toBe('ended');
  });

  it('reads a defeat as ended', () => {
    // The case that bit: a death inside a branch's prefix.
    expect(endingOf(ending('defeat'))).toBe('ended');
  });

  it('reads the clear signal as live', () => {
    // The channel sends null on the turn a reported Ending goes away — an UNDO
    // or a RESTORE back to a live turn — and the driver must resume.
    expect(endingOf([{ channel: 'story-ending', values: [null] }])).toBe('live');
  });

  it('says nothing when the channel said nothing', () => {
    // Silence is not "not ended": the channel is sparse, so most turns carry
    // no value at all, and treating those as live would clear a real Ending on
    // the very next turn.
    expect(endingOf([{ channel: 'room-name', values: ['Alley'] }])).toBeUndefined();
    expect(endingOf([])).toBeUndefined();
    expect(endingOf(undefined)).toBeUndefined();
  });

  it('takes the last value when a turn carried several', () => {
    expect(endingOf([{
      channel: 'story-ending',
      values: [{ kind: 'defeat' }, null],
    }])).toBe('live');
  });

  it('ignores a payload that is not an Ending', () => {
    // A story may put its own value on this channel; guessing at it would lock
    // the driver out of that story entirely.
    expect(endingOf([{ channel: 'story-ending', values: [{ kind: 'intermission' }] }]))
      .toBeUndefined();
    expect(endingOf([{ channel: 'story-ending', values: ['ended'] }])).toBeUndefined();
  });
});

describe('blocksCommand', () => {
  it('blocks an ordinary command', () => {
    expect(blocksCommand('take cap from satchel')).toBe(true);
    expect(blocksCommand('let go')).toBe(true);
  });

  it('lets restart through, which is the one way back', () => {
    // driveFreshBoot is built on typing `restart`; blocking it would strand the
    // driver at the ending it just detected.
    expect(blocksCommand('restart')).toBe(false);
  });

  it('lets the other meta commands through, as the engine does', () => {
    for (const command of ['restore', 'quit', 'undo']) {
      expect(blocksCommand(command)).toBe(false);
    }
  });

  it('is insensitive to case and surrounding space', () => {
    expect(blocksCommand('  RESTART ')).toBe(false);
  });
});
