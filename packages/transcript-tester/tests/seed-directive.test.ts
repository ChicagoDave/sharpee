/**
 * seed-directive.test.ts — `[SEED: N]` parsing (ADR-293 D14, Phase A/3).
 *
 * Derived from the Behavior Statement: a valid directive pins
 * `transcript.seed` once; duplicates and non-integer values are parse
 * errors surfaced through `validateTranscript`. The chain rule (later
 * member's pin is a loud error) is enforced by the CLI, not the parser.
 *
 * Owner context: transcript-tester test suite (tooling).
 */
import { describe, expect, it } from 'vitest';
import { parseTranscript, validateTranscript } from '../src/parser.js';

const HEADER = 'title: Seed Test\n---\n';
const COMMAND = '> look\n[OK]\n';

describe('[SEED:] directive', () => {
  it('pins the transcript seed and records its line', () => {
    const transcript = parseTranscript(`${HEADER}[SEED: 12345]\n${COMMAND}`);

    expect(transcript.seed).toBe(12345);
    expect(transcript.seedLineNumber).toBe(3);
    expect(transcript.parseErrors).toBeUndefined();
    // The directive is file-level metadata, not a runnable item.
    expect(transcript.items!.some((item) => item.type === 'directive')).toBe(false);
  });

  it('parses without a seed when no directive is present', () => {
    const transcript = parseTranscript(`${HEADER}${COMMAND}`);

    expect(transcript.seed).toBeUndefined();
    expect(transcript.seedLineNumber).toBeUndefined();
  });

  it('rejects a duplicate [SEED:] with a parse error and keeps the first pin', () => {
    const transcript = parseTranscript(
      `${HEADER}[SEED: 1]\n[SEED: 2]\n${COMMAND}`
    );

    expect(transcript.seed).toBe(1);
    expect(validateTranscript(transcript)).toEqual(
      expect.arrayContaining([expect.stringMatching(/Line 4: Duplicate \[SEED:\]/)])
    );
  });

  it('rejects a non-integer seed value with a parse error and no pin', () => {
    const transcript = parseTranscript(`${HEADER}[SEED: abc]\n${COMMAND}`);

    expect(transcript.seed).toBeUndefined();
    expect(validateTranscript(transcript)).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/Line 3: Invalid \[SEED:\] value "abc"/)
      ])
    );
  });

  it('is case-insensitive like the other bracket directives', () => {
    const transcript = parseTranscript(`${HEADER}[seed: 77]\n${COMMAND}`);

    expect(transcript.seed).toBe(77);
  });
});
