/**
 * fenced-runner.test.ts — ADR-287 D1 comparison semantics.
 *
 * Fence content is lossless as STORAGE; matching uses the runner's existing
 * normalized semantics. These pin both halves, plus the deliberate divergence
 * between the fenced and inline `contains` forms.
 *
 * Scaffolding note (rule 13a): these drive a stub `executeCommand` because the
 * unit under test is the comparison logic, not the engine. The real-path proof —
 * fences matching real story output through the shipped bundle — lives in
 * stories/dungeo/tests/transcripts/fenced-*.transcript, run headless via
 * `node dist/cli/sharpee.js --test`.
 *
 * Owner context: transcript-tester test suite (tooling).
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

describe('ADR-287 — [OK] + fence is an exact match', () => {
  it('passes on content that the bare grammar could never express', async () => {
    // Every line here is a shape the pre-fence parser would have eaten:
    // a bracket tag, a quoted line, a `>` command, and a `#` comment.
    const result = await runAgainst(
      'title: T\n---\n\n> read sign\n[OK]\n```\n' +
        '[Notice] The vault closes at dusk.\n' +
        'Beware the "night porter."\n' +
        '> not a command\n' +
        '# not a comment\n' +
        '```\n',
      '[Notice] The vault closes at dusk.\nBeware the "night porter."\n> not a command\n# not a comment',
    );
    expect(result.status).toBe('passed');
    expect(result.commands[0].assertionResults[0].passed).toBe(true);
  });

  it('fails when the response differs, naming the mismatch', async () => {
    const result = await runAgainst(
      'title: T\n---\n\n> read sign\n[OK]\n```\n' + SIGN_RESPONSE + '\n```\n',
      '[Notice] The vault closes at DAWN.\nBeware the "night porter."',
    );
    expect(result.status).toBe('failed');
    const assertionResult = result.commands[0].assertionResults[0];
    expect(assertionResult.passed).toBe(false);
    expect(assertionResult.message).toBe('Output did not match expected');
    // The fence survives onto the result so the reporter can display it (AC1).
    expect(assertionResult.assertion.fence).toEqual(SIGN_RESPONSE.split('\n'));
  });

  it('normalizes both sides — trailing whitespace and CRLF do not flap', async () => {
    const result = await runAgainst(
      'title: T\n---\n\n> read sign\n[OK]\n```\n   A small square den.   \n```\n',
      'A small square den.\r\n',
    );
    expect(result.status).toBe('passed');
  });

  it('round-trips a four-backtick fence wrapping three-backtick content', async () => {
    const response = 'Here is code:\n```\nnot a fence\n```\nDone.';
    const result = await runAgainst(
      'title: T\n---\n\n> read note\n[OK]\n````\n' + response + '\n````\n',
      response,
    );
    expect(result.status).toBe('passed');
  });
});

describe('ADR-287 — [OK: contains] + fence is a multi-line contains', () => {
  it('matches a fragment spanning lines inside a longer response', async () => {
    const result = await runAgainst(
      'title: T\n---\n\n> read sign\n[OK: contains]\n```\nThe vault closes at dusk.\nBeware\n```\n',
      'You read it slowly.\nThe vault closes at dusk.\nBeware the "night porter."\nThen you stop.',
    );
    expect(result.status).toBe('passed');
  });

  it('matches case-insensitively, like the inline form', async () => {
    const result = await runAgainst(
      'title: T\n---\n\n> read sign\n[OK: contains]\n```\nTHE VAULT CLOSES\n```\n',
      'the vault closes at dusk.',
    );
    expect(result.status).toBe('passed');
  });

  it('fails when the fragment is absent, without quoting a nonexistent value', async () => {
    const result = await runAgainst(
      'title: T\n---\n\n> read sign\n[OK: contains]\n```\nthe vault opens\n```\n',
      'The vault closes at dusk.',
    );
    expect(result.status).toBe('failed');
    const assertionResult = result.commands[0].assertionResults[0];
    expect(assertionResult.passed).toBe(false);
    // Not `does not contain "undefined"` — a payload-less assertion has no value.
    expect(assertionResult.message).toBe('Output does not contain the fenced fragment');
  });
});

describe('ADR-287 — the inline contains form is untouched', () => {
  // The fenced fragment is normalized (it may span lines); the inline value is
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

  it('DOES normalize the same text inside a fence', async () => {
    const result = await runAgainst(
      'title: T\n---\n\n> look\n[OK: contains]\n```\n den \n```\n',
      RESPONSE,
    );
    expect(result.status).toBe('passed');
  });
});
