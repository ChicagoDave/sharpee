/**
 * compose.test.ts — pins the segment→transcript composition (ADR-306
 * Phase 4). Every composed text is ROUND-TRIPPED through branch-tester's
 * real parser (imported from source): what the surface writes must be
 * exactly what `sharpee test --tree` reads.
 * Owner context: tools/ide — the testing play surface's web bundle.
 */

import { describe, expect, it } from 'vitest';
import { parseTranscript } from '@sharpee/branch-tester/parser';
import { composeSegmentTranscript, type TurnSource } from '../src/compose';
import { SessionModel } from '../src/model';

function playedSession(): SessionModel {
  const m = new SessionModel();
  m.addTurn({ ordinal: 1, command: 'look', room: 'Iron Gates', boot: true });
  m.addTurn({ ordinal: 2, command: 'north', room: 'Gravel Drive', boot: false });
  m.addTurn({ ordinal: 3, command: 'north', room: 'Fountain Court', boot: false });
  m.addTurn({ ordinal: 4, command: 'north', room: 'Entrance Hall', boot: false });
  return m;
}

const sources: Record<number, TurnSource> = {
  1: { output: 'Iron Gates\nWrought-iron gates stand open.', channelValues: { 'room-name': ['Iron Gates'] } },
  2: { output: 'Gravel Drive\nThe drive curves north.', channelValues: { 'room-name': ['Gravel Drive'] } },
  3: { output: 'Fountain Court\nA paved court.', channelValues: { 'room-name': ['Fountain Court'] } },
  4: { output: 'Entrance Hall\nThe heart of the house.', channelValues: { 'room-name': ['Entrance Hall'] } },
};
const source = (n: number) => sources[n];

const parse = (text: string) => {
  const transcript = parseTranscript(text, 'probe.transcript');
  expect(transcript.parseErrors ?? []).toEqual([]);
  return transcript;
};

describe('composeSegmentTranscript', () => {
  it('a root carries title + seed and [SKIP] ancestry before the range', () => {
    const m = playedSession();
    m.tick(2);
    m.tick(3);
    const { title, text } = composeSegmentTranscript({
      model: m, segment: m.segmentOf(2)!, seed: 42, source,
    });
    expect(title).toBe('iron-gates-to-fountain-court-2');
    const parsed = parse(text);
    expect(parsed.header.title).toBe(title);
    expect(parsed.header.seed).toBe('42');
    expect(parsed.header.continues).toBeUndefined();
    expect(parsed.commands.map(c => c.input)).toEqual(['look', 'north', 'north']);
    // Turn 1 rides as [SKIP] ancestry; in-range turns with no policy and no
    // claims carry the [SKIP] placeholder (6e's let-me-decide form).
    expect(parsed.commands[0].assertions.map(a => a.type)).toEqual(['skip']);
  });

  it('a continuation continues from its parent and starts after its end', () => {
    const m = playedSession();
    m.tick(1);
    m.tick(2);   // parent 1–2
    m.tick(3);
    m.tick(4);   // child 3–4
    const child = m.segmentOf(3)!;
    const { text } = composeSegmentTranscript({ model: m, segment: child, seed: 42, source });
    const parsed = parse(text);
    expect(parsed.header.continues).toBe('iron-gates-to-gravel-drive-2');
    expect(parsed.header.seed).toBeUndefined();
    expect(parsed.commands.map(c => c.input)).toEqual(['north', 'north']);
  });

  it('policy defaults synthesize through the real module when untouched', () => {
    const m = playedSession();
    m.tick(2);
    m.tick(2 + 0);
    const { text } = composeSegmentTranscript({
      model: m, segment: m.segmentOf(2)!, policy: 'room-name-and-description', seed: 42, source,
    });
    const parsed = parse(text);
    const assertions = parsed.commands.at(-1)!.assertions;
    expect(assertions.some(a => a.type === 'ok-contains' && a.value === 'Gravel Drive')).toBe(true);
  });

  it('authored claims serialize in every family, and narrowing drops defaults', () => {
    const m = playedSession();
    m.tick(2);
    m.addContains(2, 'drive curves');
    m.addNotContains(2, 'troll');
    m.addState(2, 'kettle.location = hall');
    m.addEvent(2, 'if.event.actor_moved');
    m.addChannel(2, { id: 'score', is: 0 });
    m.addChannel(2, { id: 'room-name', contains: 'Gravel' });
    const { text } = composeSegmentTranscript({
      model: m, segment: m.segmentOf(2)!, policy: 'room-name-and-description', seed: 42, source,
    });
    const parsed = parse(text);
    const assertions = parsed.commands.at(-1)!.assertions;
    const types = assertions.map(a => a.type);
    // Authored contains present, policy default 'Gravel Drive' NOT re-added
    // (contains non-empty → defaults withheld).
    expect(assertions.filter(a => a.type === 'ok-contains').map(a => a.value))
      .toEqual(['drive curves']);
    expect(types).toContain('ok-not-contains');
    expect(assertions.find(a => a.type === 'state-assert')?.stateExpression)
      .toBe('kettle.location = hall');
    expect(assertions.find(a => a.type === 'event-assert')?.eventType)
      .toBe('if.event.actor_moved');
    expect(assertions.find(a => a.type === 'channel-is')?.channelExpected).toBe(0);
    expect(assertions.find(a => a.type === 'channel-contains')?.value).toBe('Gravel');
  });

  it('Exact writes [OK] + the whole turn as a literal block, keeping non-prose families', () => {
    const m = playedSession();
    m.tick(2);
    m.setExact(2, true);
    m.addState(2, 'score = 0');
    m.addContains(2, 'superseded');
    const { text } = composeSegmentTranscript({
      model: m, segment: m.segmentOf(2)!, policy: 'room-name-and-description', seed: 42, source,
    });
    const parsed = parse(text);
    const assertions = parsed.commands.at(-1)!.assertions;
    const exact = assertions.find(a => a.type === 'ok');
    expect(exact?.block).toEqual(['Gravel Drive', 'The drive curves north.']);
    expect(assertions.some(a => a.type === 'state-assert')).toBe(true);
    expect(assertions.some(a => a.type === 'ok-contains')).toBe(false);
  });

  it('a pruned turn writes [SKIP] in place', () => {
    const m = playedSession();
    m.tick(2);
    m.tick(3);
    m.removeDefault(3, 0, []);   // pruned to nothing → demoted
    const { text } = composeSegmentTranscript({
      model: m, segment: m.segmentOf(2)!, policy: 'room-name-and-description', seed: 42, source,
    });
    const parsed = parse(text);
    expect(parsed.commands.at(-1)!.assertions.map(a => a.type)).toEqual(['skip']);
  });

  it('a segment from the opening writes authored opening claims above the first command', () => {
    const m = playedSession();
    m.tick(0);
    m.tick(2);
    m.addContains(0, 'auction notice');
    const { text } = composeSegmentTranscript({
      model: m, segment: m.segmentOf(0)!, seed: 42, source,
    });
    const parsed = parse(text);
    expect(parsed.opening?.some(a => a.type === 'ok-contains' && a.value === 'auction notice'))
      .toBe(true);
    expect(parsed.commands[0].input).toBe('look');
  });
});
