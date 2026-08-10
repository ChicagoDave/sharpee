/**
 * opening-and-channels.test.ts — asserting on the banner and the prologue.
 *
 * The banner, the prologue and the first command's response used to arrive as
 * one lump of main-channel text, so a transcript could only assert on all three
 * at once. The banner now travels on its own channel, `[CHANNEL: id, …]` reads a
 * named channel, and an assertion written above the first command is about the
 * opening rather than silently discarded.
 *
 * Owner context: branch-tester test suite (tooling).
 */
import { describe, expect, it } from 'vitest';
import { parseTranscript } from '../src/parser.js';
import { serializeTranscript } from '../src/serializer.js';

const BODY = '> look\n[OK: contains "West of House"]\n';

describe('channel assertions', () => {
  it('parses a contains form against a named channel', () => {
    const t = parseTranscript(
      `title: T\nchannels: main, banner\n---\n> look\n[CHANNEL: banner, contains "DUNGEON"]\n`
    );

    expect(t.commands[0].assertions).toEqual([
      { type: 'channel-contains', channelId: 'banner', value: 'DUNGEON' }
    ]);
  });

  it('parses a not-contains form against a named channel', () => {
    const t = parseTranscript(
      `title: T\n---\n> look\n[CHANNEL: prologue, not contains "spoiler"]\n`
    );

    expect(t.commands[0].assertions).toEqual([
      { type: 'channel-not-contains', channelId: 'prologue', value: 'spoiler' }
    ]);
  });

  it('round-trips both forms through the serializer', () => {
    const src =
      `title: T\nchannels: main, banner\n---\n> look\n` +
      `[CHANNEL: banner, contains "DUNGEON"]\n[CHANNEL: prologue, not contains "spoiler"]\n`;
    const once = serializeTranscript(parseTranscript(src));

    expect(once).toContain('[CHANNEL: banner, contains "DUNGEON"]');
    expect(once).toContain('[CHANNEL: prologue, not contains "spoiler"]');
    expect(serializeTranscript(parseTranscript(once))).toBe(once);
  });
});

describe('opening assertions', () => {
  it('collects an assertion written above the first command', () => {
    const t = parseTranscript(
      `title: T\nchannels: main, banner\n---\n[CHANNEL: banner, contains "DUNGEON"]\n\n${BODY}`
    );

    expect(t.opening).toEqual([
      { type: 'channel-contains', channelId: 'banner', value: 'DUNGEON' }
    ]);
    // and it did not attach itself to the first command
    expect(t.commands[0].assertions).toEqual([
      { type: 'ok-contains', value: 'West of House' }
    ]);
  });

  it('leaves opening absent when the transcript makes no claim about it', () => {
    const t = parseTranscript(`title: T\n---\n${BODY}`);

    expect(t.opening).toBeUndefined();
  });

  it('writes opening assertions back above the first command', () => {
    const src = `title: T\nchannels: main, banner\n---\n[CHANNEL: banner, contains "DUNGEON"]\n\n${BODY}`;
    const once = serializeTranscript(parseTranscript(src));

    expect(once).toContain('---\n\n[CHANNEL: banner, contains "DUNGEON"]\n\n> look');
    expect(serializeTranscript(parseTranscript(once))).toBe(once);
  });

  it('keeps ordinary assertion forms usable in the opening', () => {
    const t = parseTranscript(
      `title: T\n---\n[CHANNEL: prologue, contains "The house is quiet"]\n[CHANNEL: banner, contains "DUNGEON"]\n\n${BODY}`
    );

    expect(t.opening).toHaveLength(2);
    expect(t.opening![0].channelId).toBe('prologue');
    expect(t.opening![1].channelId).toBe('banner');
  });
});

describe('opening prose claims read what the player saw (David 2026-08-09)', () => {
  /** Story layer whose first command carries banner + prologue channel
   *  captures, the way the engine flushes the opening. */
  function bannerEngine() {
    return {
      executeCommand: (cmd: string) => `You ${cmd}.`,
      world: {},
      lastChannelValues: {
        banner: ['The Folly at Fernhill', 'Story v0.3.0', 'By The Sharpee Project'],
        prologue: ['One cold winter night.'],
      },
    };
  }

  it('a plain [OK: contains] opening claim passes against banner and prologue text', async () => {
    const { runTranscript } = await import('../src/runner.js');
    const t = parseTranscript(
      'title: T\n---\n[OK: contains "Story v0.3.0"]\n[OK: contains "One cold winter night."]\n\n' +
      '> look\n[OK: contains "You look."]\n'
    );

    const result = await runTranscript(t, bannerEngine() as never, {});

    expect(result.status).toBe('passed');
    const opening = result.commands.find((c) => c.command.input === '(opening)');
    expect(opening?.passed).toBe(true);
  });

  it('a wrong opening claim still fails with the runner message', async () => {
    const { runTranscript } = await import('../src/runner.js');
    const t = parseTranscript(
      'title: T\n---\n[OK: contains "not said anywhere"]\n\n> look\n[OK: contains "You look."]\n'
    );

    const result = await runTranscript(t, bannerEngine() as never, {});

    expect(result.status).toBe('failed');
    const opening = result.commands.find((c) => c.command.input === '(opening)');
    expect(opening?.failure).toBe('Output does not contain "not said anywhere"');
  });

  it('the first command\'s own output is part of the opening text', async () => {
    const { runTranscript } = await import('../src/runner.js');
    const t = parseTranscript(
      'title: T\n---\n[OK: contains "You look."]\n\n> look\n[OK: contains "You look."]\n'
    );

    const result = await runTranscript(t, bannerEngine() as never, {});
    expect(result.status).toBe('passed');
  });
});
