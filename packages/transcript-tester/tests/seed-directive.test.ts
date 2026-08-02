/**
 * seed-directive.test.ts — the `seed:` header field (ADR-293 D14 as amended
 * by ADR-294 D3).
 *
 * A valid header field pins `transcript.seed` (and `config.seeds`) once;
 * duplicates, non-integer values, out-of-range values, and placement below
 * the `---` separator are parse errors surfaced through `validateTranscript`.
 * The chain rule (later member's pin is a loud error) stays with the CLI.
 *
 * Owner context: transcript-tester test suite (tooling).
 */
import { describe, expect, it } from 'vitest';
import { parseTranscript, validateTranscript } from '../src/parser.js';

const COMMAND = '> look\n[OK]\nA room.\n';

describe('seed: header field', () => {
  it('pins the transcript seed, records its line, and mirrors into config.seeds', () => {
    const transcript = parseTranscript(`title: Seed Test\nseed: 12345\n---\n${COMMAND}`);

    expect(transcript.seed).toBe(12345);
    expect(transcript.seedLineNumber).toBe(2);
    expect(transcript.config!.seeds).toEqual([12345]);
    expect(transcript.parseErrors).toBeUndefined();
  });

  it('parses without a seed when the field is absent', () => {
    const transcript = parseTranscript(`title: Seed Test\n---\n${COMMAND}`);

    expect(transcript.seed).toBeUndefined();
    expect(transcript.seedLineNumber).toBeUndefined();
    expect(transcript.config!.seeds).toEqual([]);
  });

  it('rejects a duplicate seed: field and keeps the first pin', () => {
    const transcript = parseTranscript(
      `title: T\nseed: 1\nseed: 2\n---\n${COMMAND}`
    );

    expect(transcript.seed).toBe(1);
    expect(validateTranscript(transcript)).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/Line 3: Duplicate header field "seed:"/)
      ])
    );
  });

  it('rejects a non-integer seed value with a parse error and no pin', () => {
    const transcript = parseTranscript(`title: T\nseed: abc\n---\n${COMMAND}`);

    expect(transcript.seed).toBeUndefined();
    expect(validateTranscript(transcript)).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/Line 2: Invalid seed: value "abc"/)
      ])
    );
  });

  it('rejects a seed beyond MAX_SAFE_INTEGER — the echo would not reproduce the run', () => {
    const transcript = parseTranscript(
      `title: T\nseed: 99999999999999999999\n---\n${COMMAND}`
    );

    expect(transcript.seed).toBeUndefined();
    expect(validateTranscript(transcript)).toEqual(
      expect.arrayContaining([expect.stringMatching(/out of range/)])
    );
  });

  it('accepts MAX_SAFE_INTEGER itself as the boundary', () => {
    const transcript = parseTranscript(
      `title: T\nseed: ${Number.MAX_SAFE_INTEGER}\n---\n${COMMAND}`
    );

    expect(transcript.seed).toBe(Number.MAX_SAFE_INTEGER);
    expect(transcript.parseErrors).toBeUndefined();
  });

  it('is case-insensitive like the other header keys', () => {
    const transcript = parseTranscript(`title: T\nSeed: 77\n---\n${COMMAND}`);

    expect(transcript.seed).toBe(77);
  });

  it('rejects a seed: line stranded below the --- separator', () => {
    const transcript = parseTranscript(`title: T\n---\nseed: 42\n${COMMAND}`);

    expect(transcript.seed).toBeUndefined();
    expect(validateTranscript(transcript)).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/Line 3: Header field "seed:" appears after the --- separator/)
      ])
    );
  });

  it('leaves prose containing "seed:" inside a command\'s expected output untouched', () => {
    const transcript = parseTranscript(
      `title: T\n---\n> read note\nseed: 42 is written here.\n[OK]\n`
    );

    expect(transcript.parseErrors).toBeUndefined();
    expect(transcript.commands[0].expectedOutput).toEqual(['seed: 42 is written here.']);
  });
});
