/**
 * ok-any.test.ts — `[OK: any]` is removed grammar (ADR-294 D2).
 *
 * Pins: the parser rejects `[OK: any]` with a parse error naming the form
 * and its replacement (AC-4), no `ok-any` assertion is ever produced, and
 * bare `[OK]` still parses as the exact-match `ok` type — its semantics
 * are untouched by the removal.
 */
import { describe, expect, it } from 'vitest';
import { parseTranscript, validateTranscript } from '../src/index.js';

describe('[OK: any] removal', () => {
  it('is a parse error naming the form and its replacement — no assertion is produced', () => {
    const transcript = parseTranscript(
      'title: Recorded\n---\n\n> look\n[OK: any]\n',
      'recorded.transcript',
    );

    expect(transcript.commands[0].assertions.map((a) => a.type)).not.toContain('ok-any');
    expect(validateTranscript(transcript)).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/Line 5: \[OK: any\] was removed \(ADR-294 D2\).*\[OK: contains/)
      ])
    );
  });

  it('is rejected case-insensitively and whitespace-tolerantly', () => {
    const transcript = parseTranscript(
      'title: T\n---\n\n> look\n[ok:   ANY]\n',
      't.transcript',
    );

    expect(validateTranscript(transcript)).toEqual(
      expect.arrayContaining([expect.stringMatching(/\[OK: any\] was removed/)])
    );
  });

  it('bare [OK] still parses as the exact-match ok type (semantics untouched)', () => {
    const transcript = parseTranscript(
      'title: T\n---\n\n> look\nA small square den.\n[OK]\n',
      't.transcript',
    );

    expect(transcript.commands[0].assertions.map((a) => a.type)).toEqual(['ok']);
    expect(transcript.parseErrors).toBeUndefined();
  });
});
