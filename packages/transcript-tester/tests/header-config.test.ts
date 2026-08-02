/**
 * header-config.test.ts — the ADR-294 D3 header run-configuration fields:
 * `seeds:` (D8), `channels:` (D15), `events:` (D6), `locale:` (D19),
 * `forces:` (D13 hook). Defaults applied when absent; invalid values are
 * parse errors surfaced through `validateTranscript`.
 *
 * Owner context: transcript-tester test suite (tooling).
 */
import { describe, expect, it } from 'vitest';
import { parseTranscript, validateTranscript } from '../src/parser.js';

const BODY = '---\n> look\n[OK]\nA room.\n';

describe('header run configuration (ADR-294 D3)', () => {
  it('applies defaults when no config fields are present', () => {
    const transcript = parseTranscript(`title: T\n${BODY}`);

    expect(transcript.config).toEqual({
      seeds: [],
      channels: ['main'],
      events: false,
      forces: []
    });
  });

  it('keeps raw values in the header map alongside the typed config', () => {
    const transcript = parseTranscript(`title: T\nseed: 42\nchannels: main, status\n${BODY}`);

    expect(transcript.header['seed']).toBe('42');
    expect(transcript.header['channels']).toBe('main, status');
  });

  describe('seeds: (D8 matrices)', () => {
    it('parses a comma-separated list', () => {
      const transcript = parseTranscript(`title: T\nseeds: 42, 777, 4242\n${BODY}`);

      expect(transcript.config!.seeds).toEqual([42, 777, 4242]);
      // The singular CLI-facing pin stays unset for a matrix; the runner
      // threads matrix seeds per-recording (Phase 3).
      expect(transcript.seed).toBeUndefined();
      expect(transcript.parseErrors).toBeUndefined();
    });

    it('rejects an empty list', () => {
      const transcript = parseTranscript(`title: T\nseeds:\n${BODY}`);

      expect(validateTranscript(transcript)).toEqual(
        expect.arrayContaining([expect.stringMatching(/seeds: declares no values/)])
      );
    });

    it('rejects a duplicate seed value — each seed gets its own recording', () => {
      const transcript = parseTranscript(`title: T\nseeds: 42, 42\n${BODY}`);

      expect(validateTranscript(transcript)).toEqual(
        expect.arrayContaining([expect.stringMatching(/Duplicate seed 42 in seeds:/)])
      );
    });

    it('rejects a non-integer entry', () => {
      const transcript = parseTranscript(`title: T\nseeds: 42, abc\n${BODY}`);

      expect(transcript.config!.seeds).toEqual([]);
      expect(validateTranscript(transcript)).toEqual(
        expect.arrayContaining([expect.stringMatching(/Invalid seeds: value "abc"/)])
      );
    });

    it('is mutually exclusive with seed:', () => {
      const transcript = parseTranscript(`title: T\nseed: 1\nseeds: 2, 3\n${BODY}`);

      expect(validateTranscript(transcript)).toEqual(
        expect.arrayContaining([expect.stringMatching(/seed: and seeds: are mutually exclusive/)])
      );
      // The first declaration wins; the conflicting one is rejected.
      expect(transcript.seed).toBe(1);
      expect(transcript.config!.seeds).toEqual([1]);
    });
  });

  describe('channels: (D15)', () => {
    it('defaults to ["main"]', () => {
      const transcript = parseTranscript(`title: T\n${BODY}`);
      expect(transcript.config!.channels).toEqual(['main']);
    });

    it('parses a declared list', () => {
      const transcript = parseTranscript(`title: T\nchannels: main, status\n${BODY}`);
      expect(transcript.config!.channels).toEqual(['main', 'status']);
    });

    it('parses a single non-text channel', () => {
      const transcript = parseTranscript(`title: T\nchannels: audio\n${BODY}`);
      expect(transcript.config!.channels).toEqual(['audio']);
    });

    it('rejects an empty list', () => {
      const transcript = parseTranscript(`title: T\nchannels:\n${BODY}`);
      expect(validateTranscript(transcript)).toEqual(
        expect.arrayContaining([expect.stringMatching(/channels: declares no values/)])
      );
    });

    it('rejects a duplicate channel', () => {
      const transcript = parseTranscript(`title: T\nchannels: main, main\n${BODY}`);
      expect(validateTranscript(transcript)).toEqual(
        expect.arrayContaining([expect.stringMatching(/Duplicate channel "main"/)])
      );
    });
  });

  describe('events: (D6)', () => {
    it('defaults to false', () => {
      const transcript = parseTranscript(`title: T\n${BODY}`);
      expect(transcript.config!.events).toBe(false);
    });

    it('parses true and false', () => {
      expect(parseTranscript(`title: T\nevents: true\n${BODY}`).config!.events).toBe(true);
      expect(parseTranscript(`title: T\nevents: false\n${BODY}`).config!.events).toBe(false);
    });

    it('rejects any other value', () => {
      const transcript = parseTranscript(`title: T\nevents: yes\n${BODY}`);
      expect(transcript.config!.events).toBe(false);
      expect(validateTranscript(transcript)).toEqual(
        expect.arrayContaining([expect.stringMatching(/Invalid events: value "yes"/)])
      );
    });
  });

  describe('locale: (D19)', () => {
    it('is absent by default — the story\'s primary locale', () => {
      const transcript = parseTranscript(`title: T\n${BODY}`);
      expect(transcript.config!.locale).toBeUndefined();
    });

    it('parses a declared locale', () => {
      const transcript = parseTranscript(`title: T\nlocale: en-US\n${BODY}`);
      expect(transcript.config!.locale).toBe('en-US');
    });

    it('rejects an empty value', () => {
      const transcript = parseTranscript(`title: T\nlocale:\n${BODY}`);
      expect(validateTranscript(transcript)).toEqual(
        expect.arrayContaining([expect.stringMatching(/locale: declares no value/)])
      );
    });
  });

  describe('forces: (D13 hook — parsed, not acted on)', () => {
    it('treats (none) and empty as no forces', () => {
      expect(parseTranscript(`title: T\nforces: (none)\n${BODY}`).config!.forces).toEqual([]);
      expect(parseTranscript(`title: T\n${BODY}`).config!.forces).toEqual([]);
    });

    it('parses declared forces as raw strings', () => {
      const transcript = parseTranscript(
        `title: T\nforces: dungeo.melee.blow.hero = DISARM\n${BODY}`
      );
      expect(transcript.config!.forces).toEqual(['dungeo.melee.blow.hero = DISARM']);
    });
  });

  it('rejects a duplicate config field naming the earlier line', () => {
    const transcript = parseTranscript(`title: T\nchannels: main\nchannels: status\n${BODY}`);

    expect(transcript.config!.channels).toEqual(['main']);
    expect(validateTranscript(transcript)).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/Line 3: Duplicate header field "channels:" — already declared on line 2/)
      ])
    );
  });
});
