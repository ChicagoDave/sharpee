/**
 * golden-format.test.ts — the `.golden` recording format (ADR-294 D3/D7):
 * serialize → parse round trip is lossless, provenance is strict (all keys
 * required, unknown/duplicate keys rejected), and turns are recorded
 * verbatim including blank lines and event lines.
 *
 * Owner context: transcript-tester test suite (tooling).
 */
import { describe, expect, it } from 'vitest';
import { serializeGolden, parseGolden, GoldenFormatError } from '../src/golden.js';
import { GoldenRecording } from '../src/types.js';

function makeRecording(overrides: Partial<GoldenRecording> = {}): GoldenRecording {
  return {
    provenance: {
      transcript: 'wt-01-get-torch-early.transcript',
      story: 'dungeo',
      seed: 42,
      derivation: 1,
      saveFormat: '3.0.0',
      channels: ['main'],
      events: false,
      locale: 'en-US',
      forces: []
    },
    turns: [
      {
        command: 'north',
        output: ['North of House', 'You are facing the north side of a white house.']
      },
      { command: 'east', output: ['Behind House', '', 'There is a window here.'] }
    ],
    ...overrides
  };
}

describe('.golden serialization (D7)', () => {
  it('emits the exact ADR-294 block shape', () => {
    const text = serializeGolden(makeRecording());

    expect(text).toBe(
      '# sharpee golden v1\n' +
        'transcript: wt-01-get-torch-early.transcript\n' +
        'story: dungeo\n' +
        'seed: 42\n' +
        'derivation: 1\n' +
        'save-format: 3.0.0\n' +
        'channels: main\n' +
        'events: false\n' +
        'locale: en-US\n' +
        'forces: (none)\n' +
        '---\n' +
        '> north\n' +
        'North of House\n' +
        'You are facing the north side of a white house.\n' +
        '\n' +
        '> east\n' +
        'Behind House\n' +
        '\n' +
        'There is a window here.\n'
    );
  });

  it('round-trips: parse(serialize(r)) deep-equals r', () => {
    const recording = makeRecording();
    expect(parseGolden(serializeGolden(recording))).toEqual(recording);
  });

  it('round-trips byte-identically: serialize(parse(text)) === text', () => {
    const text = serializeGolden(makeRecording());
    expect(serializeGolden(parseGolden(text))).toBe(text);
  });

  it('round-trips output that ends in blank lines', () => {
    const recording = makeRecording({
      turns: [
        { command: 'look', output: ['A room.', '', ''] },
        { command: 'wait', output: ['Time passes.'] }
      ]
    });
    expect(parseGolden(serializeGolden(recording))).toEqual(recording);
  });

  it('round-trips a recording with events (D6 opt-in)', () => {
    const recording = makeRecording({
      provenance: { ...makeRecording().provenance, events: true },
      turns: [
        {
          command: 'push button',
          output: ['Click.'],
          events: [
            { type: 'if.event.pushed', json: '{"target":"y09"}' },
            { type: 'if.event.lit', json: '{"room":"r12","source":"lamp"}' }
          ]
        }
      ]
    });

    const text = serializeGolden(recording);
    expect(text).toContain('• if.event.pushed {"target":"y09"}');
    expect(parseGolden(text)).toEqual(recording);
  });

  it('serializes declared forces and multiple channels', () => {
    const recording = makeRecording({
      provenance: {
        ...makeRecording().provenance,
        channels: ['main', 'status'],
        forces: ['dungeo.melee.blow.hero = DISARM']
      }
    });
    const text = serializeGolden(recording);

    expect(text).toContain('channels: main, status\n');
    expect(text).toContain('forces: dungeo.melee.blow.hero = DISARM\n');
    expect(parseGolden(text)).toEqual(recording);
  });
});

describe('.golden parsing errors (strict v1)', () => {
  const VALID = serializeGolden(makeRecording());

  it('rejects a file without the magic first line', () => {
    expect(() => parseGolden('# something else\n---\n> look\nA room.\n', 'x.golden'))
      .toThrow(GoldenFormatError);
    expect(() => parseGolden('', 'x.golden')).toThrow(/first line must be/);
  });

  it('rejects a missing provenance key', () => {
    const text = VALID.replace('locale: en-US\n', '');
    expect(() => parseGolden(text, 'x.golden')).toThrow(/Missing provenance key "locale"/);
  });

  it('rejects an unknown provenance key', () => {
    const text = VALID.replace('---', 'extra: value\n---');
    expect(() => parseGolden(text, 'x.golden')).toThrow(/Unknown provenance key "extra"/);
  });

  it('rejects a duplicate provenance key', () => {
    const text = VALID.replace('---', 'seed: 43\n---');
    expect(() => parseGolden(text, 'x.golden')).toThrow(/Duplicate provenance key "seed"/);
  });

  it('rejects a non-integer seed or derivation', () => {
    expect(() => parseGolden(VALID.replace('seed: 42', 'seed: abc'), 'x.golden'))
      .toThrow(/Invalid seed "abc"/);
    expect(() => parseGolden(VALID.replace('derivation: 1', 'derivation: one'), 'x.golden'))
      .toThrow(/Invalid derivation "one"/);
  });

  it('rejects an invalid events value', () => {
    expect(() => parseGolden(VALID.replace('events: false', 'events: maybe'), 'x.golden'))
      .toThrow(/Invalid events "maybe"/);
  });

  it('rejects a missing --- separator', () => {
    expect(() => parseGolden('# sharpee golden v1\nstory: dungeo\n', 'x.golden'))
      .toThrow(/Missing "---" separator/);
  });

  it('rejects a recording with no turns', () => {
    const headerOnly = VALID.slice(0, VALID.indexOf('> north'));
    expect(() => parseGolden(headerOnly, 'x.golden')).toThrow(/Recording has no turns/);
  });

  it('rejects body content before the first "> command" line', () => {
    const text = VALID.replace('> north', 'stray prose\n> north');
    expect(() => parseGolden(text, 'x.golden')).toThrow(/Expected a "> command" line/);
  });

  it('rejects an output line after event lines within a turn', () => {
    const text =
      '# sharpee golden v1\n' +
      'transcript: t.transcript\nstory: dungeo\nseed: 1\nderivation: 1\n' +
      'save-format: 3.0.0\nchannels: main\nevents: true\nlocale: en-US\nforces: (none)\n' +
      '---\n> push\nClick.\n• if.event.pushed {"a":1}\ntrailing prose\n';
    expect(() => parseGolden(text, 'x.golden')).toThrow(/events must come last/);
  });

  it('names the file and line in its errors', () => {
    try {
      parseGolden('# wrong\n', 'stories/dungeo/walkthroughs/wt-01.golden');
      expect.unreachable('should have thrown');
    } catch (e) {
      expect(e).toBeInstanceOf(GoldenFormatError);
      expect((e as Error).message).toContain('stories/dungeo/walkthroughs/wt-01.golden:1:');
    }
  });

  it('treats event-shaped lines as output when provenance says events: false', () => {
    const recording = makeRecording({
      turns: [{ command: 'look', output: ['• not an event {"but":"prose"}'] }]
    });
    expect(parseGolden(serializeGolden(recording))).toEqual(recording);
  });
});
