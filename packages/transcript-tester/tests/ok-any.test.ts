/**
 * ok-any.test.ts — the `[OK: any]` presence-only assertion (ADR-277 D5).
 *
 * Pins: the parser produces an `ok-any` assertion (case-insensitive, no
 * value), it satisfies the validator's every-command-needs-an-assertion
 * rule, and bare `[OK]` still parses as the exact-match `ok` type —
 * David's ruling keeps its semantics untouched.
 */
import { describe, expect, it } from 'vitest';
import { parseTranscript, validateTranscript } from '../src/index.js';
import { runTranscript } from '../src/runner.js';

describe('[OK: any] parsing', () => {
  it('parses to an ok-any assertion and satisfies validation', () => {
    const transcript = parseTranscript(
      'title: Recorded\n---\n\n> look\n[OK: any]\n# A small square den.\n',
      'recorded.transcript',
    );
    expect(transcript.commands).toHaveLength(1);
    expect(transcript.commands[0].assertions.map((a) => a.type)).toEqual(['ok-any']);
    expect(transcript.commands[0].expectedOutput).toEqual([]); // response stays commentary
    expect(validateTranscript(transcript)).toEqual([]);
  });

  it('is case-insensitive and whitespace-tolerant', () => {
    const transcript = parseTranscript(
      'title: T\n---\n\n> look\n[ok:   ANY]\n',
      't.transcript',
    );
    expect(transcript.commands[0].assertions.map((a) => a.type)).toEqual(['ok-any']);
  });

  it('bare [OK] still parses as the exact-match ok type (semantics untouched)', () => {
    const transcript = parseTranscript(
      'title: T\n---\n\n> look\nA small square den.\n[OK]\n',
      't.transcript',
    );
    expect(transcript.commands[0].assertions.map((a) => a.type)).toEqual(['ok']);
  });
});

describe('[OK: any] runner semantics', () => {
  const OK_ANY_TRANSCRIPT = 'title: T\n---\n\n> look\n[OK: any]\n';

  it('passes when the command produced any output — the text is never compared', async () => {
    const transcript = parseTranscript(OK_ANY_TRANSCRIPT, 't.transcript');
    // Scaffolding engine (the runner is the unit under test); the real-path
    // CLI proof lives in the Swift RecordingSessionTests re-run-green test.
    const result = await runTranscript(transcript, {
      executeCommand: () => 'Some RNG-varied response the recorder never pinned.',
    });
    expect(result.status).toBe('passed');
    expect(result.passed).toBe(1);
    expect(result.commands[0].assertionResults.every((a) => a.passed)).toBe(true);
  });

  it('fails on blank output — presence-only still requires presence', async () => {
    const transcript = parseTranscript(OK_ANY_TRANSCRIPT, 't.transcript');
    // Blank output trips the runner's generic blank-output guard before the
    // per-assertion loop (runner.ts "Blank output is always a failure") —
    // asserted here as the end-to-end semantic, whichever branch produces it.
    const result = await runTranscript(transcript, { executeCommand: () => '' });
    expect(result.status).toBe('failed');
    expect(result.failed).toBe(1);
    expect(result.commands[0].passed).toBe(false);
  });
});
