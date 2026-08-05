/**
 * fenced-runner.test.ts — ADR-287 D1 comparison semantics.
 *
 * Block content is lossless as STORAGE; matching uses the runner's existing
 * normalized semantics. These pin both halves, plus the deliberate divergence
 * between the text-block and inline `contains` forms.
 *
 * Scaffolding note (rule 13a): these drive a stub `executeCommand` because the
 * unit under test is the comparison logic, not the engine. The real-path proof —
 * blocks matching real story output through the shipped bundle — lives in
 * stories/dungeo/tests/transcripts/fenced-*.transcript, run headless via
 * `node dist/cli/sharpee.js --test`.
 *
 * Owner context: branch-tester test suite (tooling).
 */
import { describe, expect, it } from 'vitest';
import { parseTranscript } from '../src/parser.js';
import { runTranscript } from '../src/runner.js';

/** Run a one-command transcript against a fixed response. */
async function runAgainst(source: string, response: string) {
  const transcript = parseTranscript(source, 't.transcript');
  return runTranscript(transcript, { executeCommand: () => response } as never);
}

const SIGN_RESPONSE = '[Notice] The vault closes at dusk.\nBeware the "night porter."';

describe("ADR-287 — [OK] + text block is an exact match", () => {
  it('passes on content that the bare grammar could never express', async () => {
    // Every line here is a shape the pre-block parser would have eaten:
    // a bracket tag, a quoted line, a `>` command, and a `#` comment.
    const result = await runAgainst(
      'title: T\n---\n\n> read sign\n[OK]\ntext\n' +
        '[Notice] The vault closes at dusk.\n' +
        'Beware the "night porter."\n' +
        '> not a command\n' +
        '# not a comment\n' +
        'end text\n',
      '[Notice] The vault closes at dusk.\nBeware the "night porter."\n> not a command\n# not a comment',
    );
    expect(result.status).toBe('passed');
    expect(result.commands[0].assertionResults[0].passed).toBe(true);
  });

  it('fails when the response differs, naming the mismatch', async () => {
    const result = await runAgainst(
      'title: T\n---\n\n> read sign\n[OK]\ntext\n' + SIGN_RESPONSE + '\nend text\n',
      '[Notice] The vault closes at DAWN.\nBeware the "night porter."',
    );
    expect(result.status).toBe('failed');
    const assertionResult = result.commands[0].assertionResults[0];
    expect(assertionResult.passed).toBe(false);
    expect(assertionResult.message).toBe('Output did not match expected');
    // The block survives onto the result so the reporter can display it (AC1).
    expect(assertionResult.assertion.block).toEqual(SIGN_RESPONSE.split('\n'));
  });

  it('normalizes both sides — trailing whitespace and CRLF do not flap', async () => {
    const result = await runAgainst(
      'title: T\n---\n\n> read sign\n[OK]\ntext\n   A small square den.   \nend text\n',
      'A small square den.\r\n',
    );
    expect(result.status).toBe('passed');
  });

  it('round-trips a payload that quotes the block syntax itself', async () => {
    // `end text` at column 0 is reserved with no escape (David's ruling,
    // 2026-07-28), but INDENTED it is ordinary content — which is how a story,
    // or Sharpee's own tutorial, can print the syntax and still be blessed.
    const response = 'To close a block, write:\n  end text\nDone.';
    const result = await runAgainst(
      'title: T\n---\n\n> read note\n[OK]\ntext\n' + response + '\nend text\n',
      response,
    );
    expect(result.status).toBe('passed');
  });
});

describe("ADR-287 — [OK: contains] + text block is a multi-line contains", () => {
  it('matches a fragment spanning lines inside a longer response', async () => {
    const result = await runAgainst(
      'title: T\n---\n\n> read sign\n[OK: contains]\ntext\nThe vault closes at dusk.\nBeware\nend text\n',
      'You read it slowly.\nThe vault closes at dusk.\nBeware the "night porter."\nThen you stop.',
    );
    expect(result.status).toBe('passed');
  });

  it('matches case-insensitively, like the inline form', async () => {
    const result = await runAgainst(
      'title: T\n---\n\n> read sign\n[OK: contains]\ntext\nTHE VAULT CLOSES\nend text\n',
      'the vault closes at dusk.',
    );
    expect(result.status).toBe('passed');
  });

  it('fails when the fragment is absent, without quoting a nonexistent value', async () => {
    const result = await runAgainst(
      'title: T\n---\n\n> read sign\n[OK: contains]\ntext\nthe vault opens\nend text\n',
      'The vault closes at dusk.',
    );
    expect(result.status).toBe('failed');
    const assertionResult = result.commands[0].assertionResults[0];
    expect(assertionResult.passed).toBe(false);
    // Not `does not contain "undefined"` — a payload-less assertion has no value.
    expect(assertionResult.message).toBe('Output does not contain the text block fragment');
  });
});

describe('ADR-287 — the inline contains form is untouched', () => {
  // The block fragment is normalized (it may span lines); the inline value is
  // matched raw, exactly as before this ADR. This test exists to pin that
  // divergence deliberately rather than let a future refactor "unify" them.
  const RESPONSE = 'A small square den.';

  it('does NOT normalize an inline payload — surrounding spaces still count', async () => {
    const result = await runAgainst(
      'title: T\n---\n\n> look\n[OK: contains " den "]\n',
      RESPONSE,
    );
    expect(result.status).toBe('failed');
  });

  it("DOES normalize the same text inside a text block", async () => {
    const result = await runAgainst(
      'title: T\n---\n\n> look\n[OK: contains]\ntext\n den \nend text\n',
      RESPONSE,
    );
    expect(result.status).toBe('passed');
  });
});
