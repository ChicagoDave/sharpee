/**
 * channel-assert.test.ts — ADR-300 D13/D14: the assertion vocabulary covers
 * every channel content type, and the capture set is inferred.
 *
 * v1 could only substring-match a flattened rendering of a channel, so a test
 * about the banner's title had to match text that also contained the version
 * lines and the credits. D7 made a channel's value real structure; these are
 * the assertions that can finally read it.
 *
 * Owner context: branch-tester test suite (tooling).
 */
import { describe, expect, it } from 'vitest';
import { parseTranscript } from '../src/parser.js';
import { serializeTranscript } from '../src/serializer.js';
import {
  checkChannelAssertion,
  channelsReferencedBy,
  resolveChannelPath,
} from '../src/channel-assert.js';
import type { Assertion } from '../src/types.js';

/** Parse one assertion out of a one-command transcript. */
function assertionOf(tag: string): Assertion {
  const transcript = parseTranscript(`title: T\n---\n\n> look\n${tag}\n`);
  return transcript.commands[0].assertions[0];
}

/** The banner shape ADR-300 D7 specifies, as the engine emits it. */
const BANNER = {
  title: 'DUNGEON',
  storyVersion: '4.3.0',
  credits: ['Tim Anderson', 'Marc Blank'],
  tail: ['Type HELP for instructions.'],
};

const captured = (value: Record<string, unknown[]>) => value;

const check = (tag: string, channels: Record<string, unknown[]>) =>
  checkChannelAssertion(assertionOf(tag), channels);

describe('dotted-path addressing into records (ADR-300 D13)', () => {
  it('names one piece of a record instead of matching the whole rendering', () => {
    const result = check('[CHANNEL: banner.title, contains "DUNGEON"]', captured({ banner: [BANNER] }));
    expect(result.passed).toBe(true);
  });

  it('a path that names the wrong piece fails, even when the text is elsewhere', () => {
    // The point of addressing: "DUNGEON" IS in the banner, but not in
    // storyVersion. v1's flattened match would have passed this.
    const result = check(
      '[CHANNEL: banner.storyVersion, contains "DUNGEON"]',
      captured({ banner: [BANNER] }),
    );
    expect(result.passed).toBe(false);
    expect(result.message).toMatch(/banner\.storyVersion/);
  });

  it('a member the record does not carry says what it does carry', () => {
    const result = check('[CHANNEL: banner.subtitle, contains "x"]', captured({ banner: [BANNER] }));
    expect(result.passed).toBe(false);
    expect(result.message).toMatch(/emitted no "subtitle"/);
  });

  it('addresses the channel as a whole when no path is given', () => {
    expect(check('[CHANNEL: prologue, contains "rain"]', captured({ prologue: ['The rain fell.'] })).passed).toBe(true);
  });
});

describe('list any-element matching (ADR-300 D13)', () => {
  it('matches when any element matches', () => {
    // `credits` has no index a test could usefully name, and asserting on
    // position would break the moment an author adds a name.
    expect(check('[CHANNEL: banner.credits, contains "Marc Blank"]', captured({ banner: [BANNER] })).passed).toBe(true);
    expect(check('[CHANNEL: banner.credits, contains "Tim Anderson"]', captured({ banner: [BANNER] })).passed).toBe(true);
  });

  it('fails when no element matches, showing the list', () => {
    const result = check('[CHANNEL: banner.credits, contains "Nobody"]', captured({ banner: [BANNER] }));
    expect(result.passed).toBe(false);
    expect(result.message).toMatch(/Tim Anderson/);
  });

  it('`not contains` over a list means no element matches', () => {
    expect(check('[CHANNEL: banner.credits, not contains "Nobody"]', captured({ banner: [BANNER] })).passed).toBe(true);
    expect(check('[CHANNEL: banner.credits, not contains "Marc Blank"]', captured({ banner: [BANNER] })).passed).toBe(false);
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
    expect(check('[CHANNEL: turn, is 5]', captured({ turn: [5] })).passed).toBe(true);
    expect(check('[CHANNEL: turn, is 6]', captured({ turn: [5] })).passed).toBe(false);
  });

  it('compares text', () => {
    expect(check('[CHANNEL: location, is "Cave"]', captured({ location: ['Cave'] })).passed).toBe(true);
  });

  it('compares into a record', () => {
    expect(check('[CHANNEL: score.current, is 10]', captured({ score: [{ current: 10, max: null }] })).passed).toBe(true);
  });

  it('`is not` is the negation', () => {
    expect(check('[CHANNEL: turn, is not 6]', captured({ turn: [5] })).passed).toBe(true);
    expect(check('[CHANNEL: turn, is not 5]', captured({ turn: [5] })).passed).toBe(false);
  });

  it('a wrong-type comparison fails BY NAME, not by never matching', () => {
    // The whole reason the parser preserves the literal's type. Coercing would
    // make the vocabulary weaker than the values it reads.
    const result = check('[CHANNEL: location, is 5]', captured({ location: ['5'] }));
    expect(result.passed).toBe(false);
    expect(result.message).toMatch(/carries a string/);
    expect(result.message).toMatch(/compares it to a number/);
    // And it suggests the form that would compare like with like.
    expect(result.message).toMatch(/is "5"/);
  });

  it('the reverse wrong-type also fails by name', () => {
    const result = check('[CHANNEL: turn, is "5"]', captured({ turn: [5] }));
    expect(result.passed).toBe(false);
    expect(result.message).toMatch(/carries a number/);
  });

  it('compares booleans', () => {
    expect(check('[CHANNEL: flag, is true]', captured({ flag: [true] })).passed).toBe(true);
    expect(check('[CHANNEL: flag, is false]', captured({ flag: [true] })).passed).toBe(false);
  });
});

describe('sparse-channel silence (ADR-300 D13)', () => {
  it('`is absent` passes when the channel said nothing', () => {
    expect(check('[CHANNEL: death, is absent]', captured({})).passed).toBe(true);
  });

  it('`is absent` fails when it spoke, showing what it said', () => {
    const result = check('[CHANNEL: death, is absent]', captured({ death: ['You have died.'] }));
    expect(result.passed).toBe(false);
    expect(result.message).toMatch(/You have died/);
  });

  it('`is present` is the converse', () => {
    expect(check('[CHANNEL: death, is present]', captured({ death: ['x'] })).passed).toBe(true);
    expect(check('[CHANNEL: death, is present]', captured({})).passed).toBe(false);
  });

  it('a member absent from a present record is absent', () => {
    expect(check('[CHANNEL: banner.subtitle, is absent]', captured({ banner: [BANNER] })).passed).toBe(true);
    expect(check('[CHANNEL: banner.title, is absent]', captured({ banner: [BANNER] })).passed).toBe(false);
  });

  it('a silent channel under any other form points at `is absent`', () => {
    // Rather than passing a `not contains` for the wrong reason.
    const result = check('[CHANNEL: death, not contains "died"]', captured({}));
    expect(result.passed).toBe(false);
    expect(result.message).toMatch(/is absent/);
  });
});

describe('capture inference (ADR-300 D14)', () => {
  it('the capture set is what the assertions read', () => {
    const transcript = parseTranscript(
      'title: T\n---\n\n' +
        '> look\n[CHANNEL: banner.title, contains "D"]\n[CHANNEL: score.current, is 0]\n\n' +
        '> north\n[CHANNEL: death, is absent]\n',
    );
    const assertions = transcript.commands.flatMap((c) => c.assertions);
    expect(channelsReferencedBy(assertions)).toEqual(['banner', 'death', 'score']);
  });

  it('infers the channel, not the path — a path addresses within one capture', () => {
    const transcript = parseTranscript('title: T\n---\n\n> look\n[CHANNEL: banner.credits, contains "x"]\n');
    expect(channelsReferencedBy(transcript.commands[0].assertions)).toEqual(['banner']);
  });

  it('a transcript asserting on nothing infers nothing', () => {
    const transcript = parseTranscript('title: T\n---\n\n> look\n[OK: contains "x"]\n');
    expect(channelsReferencedBy(transcript.commands[0].assertions)).toEqual([]);
  });
});

describe('grammar round-trip', () => {
  it('every new form survives parse → serialize → parse', () => {
    const tags = [
      '[CHANNEL: banner.title, contains "DUNGEON"]',
      '[CHANNEL: banner.credits, not contains "Nobody"]',
      '[CHANNEL: turn, is 5]',
      '[CHANNEL: location, is "Cave"]',
      '[CHANNEL: flag, is true]',
      '[CHANNEL: turn, is not 6]',
      '[CHANNEL: death, is absent]',
      '[CHANNEL: death, is present]',
    ];
    for (const tag of tags) {
      const text = serializeTranscript(parseTranscript(`title: T\n---\n\n> look\n${tag}\n`));
      expect(text, tag).toContain(tag);
      // And the reparse is the same assertion, not merely the same text.
      expect(parseTranscript(text).commands[0].assertions[0], tag).toEqual(assertionOf(tag));
    }
  });

  it('preserves the literal\'s type through a round trip', () => {
    // `is 5` and `is "5"` are different assertions; a serializer that lost the
    // quoting would silently merge them.
    expect(assertionOf('[CHANNEL: turn, is 5]').channelExpected).toBe(5);
    expect(assertionOf('[CHANNEL: turn, is "5"]').channelExpected).toBe('5');
  });

  it('parses a multi-segment path', () => {
    const assertion = assertionOf('[CHANNEL: quest.steps.name, contains "x"]');
    expect(assertion.channelId).toBe('quest');
    expect(assertion.channelPath).toEqual(['steps', 'name']);
  });
});
