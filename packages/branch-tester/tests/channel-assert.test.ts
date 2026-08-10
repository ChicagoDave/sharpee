/**
 * channel-assert.test.ts — ADR-300 D13/D14: the assertion vocabulary covers
 * every channel content type, and the capture set is inferred.
 *
 * v1 could only substring-match a flattened rendering of a channel, so a test
 * about the banner's title had to match text that also contained the version
 * lines and the credits. D7 made a channel's value real structure; these are
 * the assertions that can finally read it.
 *
 * Post-ADR-307 cutover, assertions are built as objects (the tree document's
 * claims deserialize into the same shape) — the retired transcript-tag
 * grammar no longer exists to parse.
 *
 * Owner context: branch-tester test suite (tooling).
 */
import { describe, expect, it } from 'vitest';
import {
  checkChannelAssertion,
  channelsReferencedBy,
  resolveChannelPath,
} from '../src/channel-assert.js';
import type { Assertion } from '../src/types.js';

/** Build a channel assertion the way deserialized tree-document claims look. */
function channelAssertion(
  type: Assertion['type'],
  channelId: string,
  path: string[],
  payload?: { value?: string; expected?: string | number | boolean },
): Assertion {
  return {
    type,
    channelId,
    ...(path.length > 0 ? { channelPath: path } : {}),
    ...(payload?.value !== undefined ? { value: payload.value } : {}),
    ...(payload?.expected !== undefined ? { channelExpected: payload.expected } : {}),
  };
}

const contains = (id: string, path: string[], value: string) =>
  channelAssertion('channel-contains', id, path, { value });
const notContains = (id: string, path: string[], value: string) =>
  channelAssertion('channel-not-contains', id, path, { value });
const is = (id: string, path: string[], expected: string | number | boolean) =>
  channelAssertion('channel-is', id, path, { expected });
const isNot = (id: string, path: string[], expected: string | number | boolean) =>
  channelAssertion('channel-is-not', id, path, { expected });
const absent = (id: string, path: string[] = []) => channelAssertion('channel-absent', id, path);
const present = (id: string, path: string[] = []) => channelAssertion('channel-present', id, path);

/** The banner shape ADR-300 D7 specifies, as the engine emits it. */
const BANNER = {
  title: 'DUNGEON',
  storyVersion: '4.3.0',
  credits: ['Tim Anderson', 'Marc Blank'],
  tail: ['Type HELP for instructions.'],
};

const captured = (value: Record<string, unknown[]>) => value;

describe('dotted-path addressing into records (ADR-300 D13)', () => {
  it('names one piece of a record instead of matching the whole rendering', () => {
    const result = checkChannelAssertion(contains('banner', ['title'], 'DUNGEON'), captured({ banner: [BANNER] }));
    expect(result.passed).toBe(true);
  });

  it('a path that names the wrong piece fails, even when the text is elsewhere', () => {
    // The point of addressing: "DUNGEON" IS in the banner, but not in
    // storyVersion. v1's flattened match would have passed this.
    const result = checkChannelAssertion(
      contains('banner', ['storyVersion'], 'DUNGEON'),
      captured({ banner: [BANNER] }),
    );
    expect(result.passed).toBe(false);
    expect(result.message).toMatch(/banner\.storyVersion/);
  });

  it('a member the record does not carry says what it does carry', () => {
    const result = checkChannelAssertion(contains('banner', ['subtitle'], 'x'), captured({ banner: [BANNER] }));
    expect(result.passed).toBe(false);
    expect(result.message).toMatch(/emitted no "subtitle"/);
  });

  it('addresses the channel as a whole when no path is given', () => {
    expect(
      checkChannelAssertion(contains('prologue', [], 'rain'), captured({ prologue: ['The rain fell.'] })).passed,
    ).toBe(true);
  });
});

describe('list any-element matching (ADR-300 D13)', () => {
  it('matches when any element matches', () => {
    // `credits` has no index a test could usefully name, and asserting on
    // position would break the moment an author adds a name.
    expect(checkChannelAssertion(contains('banner', ['credits'], 'Marc Blank'), captured({ banner: [BANNER] })).passed).toBe(true);
    expect(checkChannelAssertion(contains('banner', ['credits'], 'Tim Anderson'), captured({ banner: [BANNER] })).passed).toBe(true);
  });

  it('fails when no element matches, showing the list', () => {
    const result = checkChannelAssertion(contains('banner', ['credits'], 'Nobody'), captured({ banner: [BANNER] }));
    expect(result.passed).toBe(false);
    expect(result.message).toMatch(/Tim Anderson/);
  });

  it('`not contains` over a list means no element matches', () => {
    expect(checkChannelAssertion(notContains('banner', ['credits'], 'Nobody'), captured({ banner: [BANNER] })).passed).toBe(true);
    expect(checkChannelAssertion(notContains('banner', ['credits'], 'Marc Blank'), captured({ banner: [BANNER] })).passed).toBe(false);
  });

  it('crosses a list mid-path, applying later segments to each element', () => {
    const value = { rows: [{ name: 'alpha' }, { name: 'beta' }] };
    const resolved = resolveChannelPath([value], ['rows', 'name']);
    expect(resolved.found).toBe(true);
    expect(resolved.values).toEqual(['alpha', 'beta']);
  });
});

describe('typed comparison (ADR-300 D13)', () => {
  it('compares numbers', () => {
    expect(checkChannelAssertion(is('turn', [], 5), captured({ turn: [5] })).passed).toBe(true);
    expect(checkChannelAssertion(is('turn', [], 6), captured({ turn: [5] })).passed).toBe(false);
  });

  it('compares text', () => {
    expect(checkChannelAssertion(is('location', [], 'Cave'), captured({ location: ['Cave'] })).passed).toBe(true);
  });

  it('compares into a record', () => {
    expect(checkChannelAssertion(is('score', ['current'], 10), captured({ score: [{ current: 10, max: null }] })).passed).toBe(true);
  });

  it('`is not` is the negation', () => {
    expect(checkChannelAssertion(isNot('turn', [], 6), captured({ turn: [5] })).passed).toBe(true);
    expect(checkChannelAssertion(isNot('turn', [], 5), captured({ turn: [5] })).passed).toBe(false);
  });

  it('a wrong-type comparison fails BY NAME, not by never matching', () => {
    // The whole reason the claim preserves the literal's type. Coercing would
    // make the vocabulary weaker than the values it reads.
    const result = checkChannelAssertion(is('location', [], 5), captured({ location: ['5'] }));
    expect(result.passed).toBe(false);
    expect(result.message).toMatch(/carries a string/);
    expect(result.message).toMatch(/compares it to a number/);
    // And it suggests the form that would compare like with like.
    expect(result.message).toMatch(/is "5"/);
  });

  it('the reverse wrong-type also fails by name', () => {
    const result = checkChannelAssertion(is('turn', [], '5'), captured({ turn: [5] }));
    expect(result.passed).toBe(false);
    expect(result.message).toMatch(/carries a number/);
  });

  it('compares booleans', () => {
    expect(checkChannelAssertion(is('flag', [], true), captured({ flag: [true] })).passed).toBe(true);
    expect(checkChannelAssertion(is('flag', [], false), captured({ flag: [true] })).passed).toBe(false);
  });
});

describe('sparse-channel silence (ADR-300 D13)', () => {
  it('`is absent` passes when the channel said nothing', () => {
    expect(checkChannelAssertion(absent('death'), captured({})).passed).toBe(true);
  });

  it('`is absent` fails when it spoke, showing what it said', () => {
    const result = checkChannelAssertion(absent('death'), captured({ death: ['You have died.'] }));
    expect(result.passed).toBe(false);
    expect(result.message).toMatch(/You have died/);
  });

  it('`is present` is the converse', () => {
    expect(checkChannelAssertion(present('death'), captured({ death: ['x'] })).passed).toBe(true);
    expect(checkChannelAssertion(present('death'), captured({})).passed).toBe(false);
  });

  it('a member absent from a present record is absent', () => {
    expect(checkChannelAssertion(absent('banner', ['subtitle']), captured({ banner: [BANNER] })).passed).toBe(true);
    expect(checkChannelAssertion(absent('banner', ['title']), captured({ banner: [BANNER] })).passed).toBe(false);
  });

  it('a silent channel under any other form points at `is absent`', () => {
    // Rather than passing a `not contains` for the wrong reason.
    const result = checkChannelAssertion(notContains('death', [], 'died'), captured({}));
    expect(result.passed).toBe(false);
    expect(result.message).toMatch(/is absent/);
  });
});

describe('capture inference (ADR-300 D14)', () => {
  it('the capture set is what the assertions read', () => {
    const assertions: Assertion[] = [
      contains('banner', ['title'], 'D'),
      is('score', ['current'], 0),
      absent('death'),
    ];
    expect(channelsReferencedBy(assertions)).toEqual(['banner', 'death', 'score']);
  });

  it('infers the channel, not the path — a path addresses within one capture', () => {
    expect(channelsReferencedBy([contains('banner', ['credits'], 'x')])).toEqual(['banner']);
  });

  it('assertions reading no channel infer nothing', () => {
    expect(channelsReferencedBy([{ type: 'ok-contains', value: 'x' }])).toEqual([]);
  });
});
