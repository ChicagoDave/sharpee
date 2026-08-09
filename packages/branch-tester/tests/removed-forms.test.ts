/**
 * removed-forms.test.ts — ADR-294 AC-4: every removed grammar form is a parse
 * error naming the form and its replacement; nothing is silently ignored and
 * no directive/assertion is produced for it. ADR-300 D5 adds `[EVENTS: N]` to
 * the set (issue #222).
 *
 * Owner context: branch-tester test suite (tooling).
 */
import { describe, expect, it } from 'vitest';
import { parseTranscript, validateTranscript } from '../src/parser.js';

const HEADER = 'title: Removed Forms\n---\n';

/** Each removed form with the fragments its error must name. */
const CASES: Array<{ line: string; form: string; names: RegExp }> = [
  { line: '[SEED: 42]', form: '[SEED: N]', names: /seed: N above the --- separator/ },
  { line: '[WHILE: player.location != kitchen]', form: '[WHILE:]', names: /fixed command list/ },
  { line: '[END WHILE]', form: '[END WHILE]', names: /fixed command list/ },
  { line: '[RETRY: max=5]', form: '[RETRY:]', names: /fixed command list/ },
  { line: '[END RETRY]', form: '[END RETRY]', names: /fixed command list/ },
  { line: '[DO]', form: '[DO]', names: /fixed command list/ },
  { line: '[UNTIL "You win"]', form: '[UNTIL]', names: /fixed command list/ },
  { line: '[ENSURES: not entity "troll" alive]', form: '[ENSURES:]', names: /transcript's own assertions/ },
  { line: '[REQUIRES: player.alive]', form: '[REQUIRES:]', names: /deterministic at a pinned seed/ },
  { line: '[IF: player.location = kitchen]', form: '[IF:]', names: /write the branch that actually happens/ },
  { line: '[END IF]', form: '[END IF]', names: /write the branch that actually happens/ },
  { line: '[NAVIGATE TO: "Round Room"]', form: '[NAVIGATE TO:]', names: /literal movement commands/ },
  { line: '[OK: any]', form: '[OK: any]', names: /\[OK: contains "\.\.\."\]/ },
  { line: '[OK: contains_any "a" "b"]', form: '[OK: contains_any]', names: /\[OK: contains "\.\.\."\]/ },
  { line: '[OK: matches /^You win/]', form: '[OK: matches]', names: /\[OK: contains "\.\.\."\]/ },
  // ADR-300 D5 / issue #222 — a bare count names no event and breaks whenever
  // any unrelated event is added anywhere in the turn.
  { line: '[EVENTS: 3]', form: '[EVENTS: N]', names: /\[EVENT: true, type="\.\.\."\]/ }
];

describe('removed grammar forms (ADR-294 AC-4)', () => {
  for (const { line, form, names } of CASES) {
    it(`rejects ${form}, naming the form and its replacement`, () => {
      const transcript = parseTranscript(`${HEADER}> look\nA room.\n${line}\n`);

      const errors = validateTranscript(transcript);
      const escaped = form.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      expect(errors).toEqual(
        expect.arrayContaining([expect.stringMatching(new RegExp(escaped))])
      );
      expect(errors).toEqual(
        expect.arrayContaining([expect.stringMatching(names)])
      );
      // Nothing is produced for the removed line — no directive item.
      expect(transcript.items!.filter((i) => i.type === 'directive')).toEqual([]);
    });
  }

  it('rejects removed forms case-insensitively', () => {
    const transcript = parseTranscript(`${HEADER}[while: anything]\n> look\n[OK]\nA room.\n`);

    expect(validateTranscript(transcript)).toEqual(
      expect.arrayContaining([expect.stringMatching(/\[WHILE:\] was removed/)])
    );
  });

  it('rejects a [SEED:] above the --- separator — the old silent-placement trap errors loudly', () => {
    const transcript = parseTranscript(`title: T\n[SEED: 42]\n---\n> look\n[OK]\nA room.\n`);

    expect(transcript.seed).toBeUndefined();
    // The bracket line must NOT have been swallowed as a header key.
    expect(Object.keys(transcript.header)).not.toContain('[seed');
    expect(validateTranscript(transcript)).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/Line 2: \[SEED: N\] was removed \(ADR-294 D3\)/)
      ])
    );
  });

  it('keeps the retained assertion DSL parsing untouched', () => {
    const transcript = parseTranscript(
      `${HEADER}> look\n[OK: contains "room"]\n> inventory\n[OK: not contains "sword"]\n> wait\n[SKIP]\n> die\n[FAIL: expected]\n`
    );

    expect(transcript.parseErrors).toBeUndefined();
    expect(transcript.commands.map((c) => c.assertions[0].type)).toEqual([
      'ok-contains',
      'ok-not-contains',
      'skip',
      'fail'
    ]);
  });

  it('leaves removed-form text inside an ADR-287 literal block uninterpreted', () => {
    const transcript = parseTranscript(
      `${HEADER}> read sign\n[OK]\ntext\n[OK: any] and [WHILE: x] are written on the sign.\nend text\n`
    );

    expect(transcript.parseErrors).toBeUndefined();
    expect(transcript.commands[0].assertions[0].block).toEqual([
      '[OK: any] and [WHILE: x] are written on the sign.'
    ]);
  });
});
