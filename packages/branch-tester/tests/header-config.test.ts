/**
 * header-config.test.ts — the ADR-294 D3 header run-configuration fields:
 * `seeds:` (D8), `channels:` (D15), `events:` (D6), `locale:` (D19),
 * `forces:` (D13 hook). Defaults applied when absent; invalid values are
 * parse errors surfaced through `validateTranscript`.
 *
 * Owner context: branch-tester test suite (tooling).
 */
import { describe, expect, it } from 'vitest';
import { parseTranscript, validateTranscript } from '../src/parser.js';

const BODY = '---\n> look\n[OK]\nA room.\n';

describe('header run configuration (ADR-294 D3)', () => {
  it('applies defaults when no config fields are present', () => {
    const transcript = parseTranscript(`title: T\n${BODY}`);

    expect(transcript.config).toEqual({
      seeds: [],
      channels: [],
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
    it('defaults to [] — the composed prose is not a declared channel (ADR-300 D8)', () => {
      const transcript = parseTranscript(`title: T\n${BODY}`);
      expect(transcript.config!.channels).toEqual([]);
    });

    it('parses a declared list', () => {
      const transcript = parseTranscript(`title: T\nchannels: score, status\n${BODY}`);
      expect(transcript.config!.channels).toEqual(['score', 'status']);
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

  describe('forces: (ADR-293 D8/D9 — Phase C header directive)', () => {
    it('treats (none) and empty as no forces', () => {
      expect(parseTranscript(`title: T\nforces: (none)\n${BODY}`).config!.forces).toEqual([]);
      expect(parseTranscript(`title: T\n${BODY}`).config!.forces).toEqual([]);
    });

    it('parses point[#occurrence]=CLASS entries into canonical strings and once-mode specs', () => {
      const transcript = parseTranscript(
        `title: T\nforces: dungeo.melee.blow.hero = DISARM, dungeo.melee.blow.villain#2=SERIOUS_WOUND\n${BODY}`
      );

      expect(transcript.parseErrors).toBeUndefined();
      expect(transcript.config!.forces).toEqual([
        'dungeo.melee.blow.hero=DISARM',
        'dungeo.melee.blow.villain#2=SERIOUS_WOUND'
      ]);
      expect(transcript.config!.forceSpecs).toEqual([
        { point: 'dungeo.melee.blow.hero', cls: 'DISARM', mode: 'once' },
        { point: 'dungeo.melee.blow.villain', occurrence: 2, cls: 'SERIOUS_WOUND', mode: 'once' }
      ]);
      expect(transcript.config!.forcesLineNumber).toBe(2);
    });

    it('rejects a malformed entry as a parse error', () => {
      const transcript = parseTranscript(`title: T\nforces: dungeo.thief.steal\n${BODY}`);

      expect(validateTranscript(transcript)).toEqual(
        expect.arrayContaining([expect.stringMatching(/Invalid forces: entry "dungeo.thief.steal"/)])
      );
      expect(transcript.config!.forceSpecs).toBeUndefined();
      expect(transcript.config!.forces).toEqual([]);
    });

    it('rejects duplicate force keys — a load error, not last-wins (D9)', () => {
      const transcript = parseTranscript(
        `title: T\nforces: dungeo.thief.steal=yes, dungeo.thief.steal=no\n${BODY}`
      );

      expect(validateTranscript(transcript)).toEqual(
        expect.arrayContaining([expect.stringMatching(/Duplicate force key "dungeo.thief.steal"/)])
      );
      // Entry 1 validated before entry 2 errored — the config must stay
      // exactly empty, never partially populated.
      expect(transcript.config!.forces).toEqual([]);
      expect(transcript.config!.forceSpecs).toBeUndefined();
    });

    it('treats indexed and unindexed keys on one point as distinct', () => {
      const transcript = parseTranscript(
        `title: T\nforces: dungeo.thief.steal=yes, dungeo.thief.steal#3=no\n${BODY}`
      );

      expect(transcript.parseErrors).toBeUndefined();
      expect(transcript.config!.forces).toEqual([
        'dungeo.thief.steal=yes',
        'dungeo.thief.steal#3=no'
      ]);
    });

    it('rejects a zero occurrence index', () => {
      const transcript = parseTranscript(`title: T\nforces: dungeo.thief.steal#0=yes\n${BODY}`);

      expect(validateTranscript(transcript)).toEqual(
        expect.arrayContaining([expect.stringMatching(/occurrence index must be a positive integer/)])
      );
      expect(transcript.config!.forces).toEqual([]);
      expect(transcript.config!.forceSpecs).toBeUndefined();
    });
  });

  describe('point-seed: (ADR-293 D11 — per-point stream override)', () => {
    it('parses point=seed entries', () => {
      const transcript = parseTranscript(
        `title: T\npoint-seed: dungeo.thief.steal=1234, dungeo.forest.ambience = 42\n${BODY}`
      );

      expect(transcript.parseErrors).toBeUndefined();
      expect(transcript.config!.pointSeeds).toEqual([
        { point: 'dungeo.thief.steal', seed: 1234 },
        { point: 'dungeo.forest.ambience', seed: 42 }
      ]);
      expect(transcript.config!.pointSeedsLineNumber).toBe(2);
    });

    it('is absent from the config when not declared', () => {
      expect(parseTranscript(`title: T\n${BODY}`).config!.pointSeeds).toBeUndefined();
    });

    it('rejects a non-integer seed as a parse error', () => {
      const transcript = parseTranscript(`title: T\npoint-seed: dungeo.thief.steal=abc\n${BODY}`);

      expect(validateTranscript(transcript)).toEqual(
        expect.arrayContaining([expect.stringMatching(/Invalid point-seed: entry/)])
      );
    });

    it('rejects a duplicate point', () => {
      const transcript = parseTranscript(
        `title: T\npoint-seed: dungeo.thief.steal=1, dungeo.thief.steal=2\n${BODY}`
      );

      expect(validateTranscript(transcript)).toEqual(
        expect.arrayContaining([expect.stringMatching(/Duplicate point "dungeo.thief.steal"/)])
      );
    });

    it('rejects an empty list', () => {
      const transcript = parseTranscript(`title: T\npoint-seed:\n${BODY}`);

      expect(validateTranscript(transcript)).toEqual(
        expect.arrayContaining([expect.stringMatching(/point-seed: declares no entries/)])
      );
    });
  });

  it('rejects a duplicate config field naming the earlier line', () => {
    const transcript = parseTranscript(`title: T\nchannels: score\nchannels: status\n${BODY}`);

    expect(transcript.config!.channels).toEqual(['score']);
    expect(validateTranscript(transcript)).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/Line 3: Duplicate header field "channels:" — already declared on line 2/)
      ])
    );
  });
});
