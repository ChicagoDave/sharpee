/**
 * fenced-payloads.test.ts — ADR-287 D1: fenced literal blocks.
 *
 * Derived line-by-line from the parser's Behavior Statement: each DOES line is
 * a functional test below, each REJECTS WHEN line a rejection test.
 *
 * Scope is the PARSER only — attachment, literal capture, and loud validation.
 * Comparison semantics (`[OK]` + fence = exact, `[OK: contains]` + fence =
 * normalized contains) are the runner's, tested in Phase 2.
 *
 * Imported from ../src/parser.js rather than the package barrel: the barrel
 * re-exports the runner and drags in the whole engine, which a parser test has
 * no business needing.
 *
 * Owner context: transcript-tester test suite (tooling).
 */
import { describe, expect, it } from 'vitest';
import { parseTranscript, validateTranscript } from '../src/parser.js';

/** Parse, and assert the transcript is clean — returns it for further assertions. */
function parseClean(source: string) {
  const transcript = parseTranscript(source, 't.transcript');
  expect(validateTranscript(transcript), 'expected a clean parse').toEqual([]);
  return transcript;
}

/** Parse and return the validator's complaints. */
function errorsFor(source: string): string[] {
  return validateTranscript(parseTranscript(source, 't.transcript'));
}

describe('ADR-287 D1 — fence attaches to [OK]', () => {
  it('captures bracket, quote, > and # lines verbatim, uninterpreted', () => {
    const transcript = parseClean(
      'title: T\n---\n\n> read sign\n[OK]\n```\n' +
        '[Notice] The vault closes at dusk.\n' +
        'Beware the "night porter."\n' +
        '> not a command\n' +
        '# not a comment\n' +
        '```\n',
    );

    const command = transcript.commands[0];
    expect(command.assertions).toHaveLength(1);
    expect(command.assertions[0].type).toBe('ok');
    expect(command.assertions[0].fence).toEqual([
      '[Notice] The vault closes at dusk.',
      'Beware the "night porter."',
      '> not a command',
      '# not a comment',
    ]);
    // The four literal lines produced no commands, comments, or expected output.
    expect(transcript.commands).toHaveLength(1);
    expect(transcript.comments).toEqual([]);
    expect(command.expectedOutput).toEqual([]);
  });

  it('preserves blank lines and leading whitespace inside the fence', () => {
    const transcript = parseClean(
      'title: T\n---\n\n> look\n[OK]\n```\nFirst.\n\n    Indented.\n```\n',
    );
    expect(transcript.commands[0].assertions[0].fence).toEqual(['First.', '', '    Indented.']);
  });

  it('stamps the assertion line number for failure display', () => {
    const transcript = parseClean('title: T\n---\n\n> look\n[OK]\n```\nA den.\n```\n');
    // Line 5 is the `[OK]` tag: header(1) + separator(2) + blank(3) + command(4).
    expect(transcript.commands[0].assertions[0].lineNumber).toBe(5);
  });
});

describe('ADR-287 D1 — fence attaches to payload-less [OK: contains]', () => {
  it('parses to ok-contains with the fence as the fragment and no inline value', () => {
    const transcript = parseClean(
      'title: T\n---\n\n> read sign\n[OK: contains]\n```\nthe vault closes\nat dusk\n```\n',
    );
    const assertion = transcript.commands[0].assertions[0];
    expect(assertion.type).toBe('ok-contains');
    expect(assertion.value).toBeUndefined();
    expect(assertion.fence).toEqual(['the vault closes', 'at dusk']);
  });

  it('is case-insensitive and whitespace-tolerant, like the inline form', () => {
    const transcript = parseClean('title: T\n---\n\n> look\n[ok:   CONTAINS]\n```\na den\n```\n');
    expect(transcript.commands[0].assertions[0].type).toBe('ok-contains');
    expect(transcript.commands[0].assertions[0].fence).toEqual(['a den']);
  });
});

describe('ADR-287 D1 — fence lengths follow markdown', () => {
  it('a four-backtick fence carries a three-backtick line as content', () => {
    const transcript = parseClean(
      'title: T\n---\n\n> read note\n[OK]\n````\nHere is code:\n```\nnot a fence\n```\nDone.\n````\n',
    );
    expect(transcript.commands[0].assertions[0].fence).toEqual([
      'Here is code:',
      '```',
      'not a fence',
      '```',
      'Done.',
    ]);
  });

  it('a longer run than the opener is content, not a close', () => {
    const transcript = parseClean('title: T\n---\n\n> look\n[OK]\n```\na\n`````\nb\n```\n');
    expect(transcript.commands[0].assertions[0].fence).toEqual(['a', '`````', 'b']);
  });
});

describe('ADR-287 D1 — attachment is strictly the next line', () => {
  it('a blank line detaches the fence, leaving the backticks as ordinary prose (D2)', () => {
    const transcript = parseTranscript('title: T\n---\n\n> look\n[OK]\n\n```\nA den.\n```\n', 't.transcript');
    const command = transcript.commands[0];
    expect(command.assertions[0].fence).toBeUndefined();
    // Unattached backtick lines parse exactly as they did before fences existed:
    // ordinary expected-output prose. No error — D2's collision window is prose.
    expect(command.expectedOutput).toContain('```');
    expect(transcript.parseErrors).toBeUndefined();
  });
});

describe('ADR-287 D1 — rejections are loud and line-numbered (AC4)', () => {
  it('rejects an unclosed fence', () => {
    const errors = errorsFor('title: T\n---\n\n> look\n[OK]\n```\nA den.\n');
    expect(errors[0]).toBe(
      'Line 6: Unclosed fenced block — expected a closing line of exactly 3 backticks before end of file',
    );
  });

  it('rejects a close whose length does not match the opener', () => {
    // ```` opens; ``` cannot close it, so the fence runs to EOF unclosed.
    const errors = errorsFor('title: T\n---\n\n> look\n[OK]\n````\nA den.\n```\n');
    expect(errors[0]).toContain('Unclosed fenced block');
    expect(errors[0]).toContain('exactly 4 backticks');
    expect(errors[0]).toMatch(/^Line 6:/);
  });

  it('rejects an empty fence', () => {
    const errors = errorsFor('title: T\n---\n\n> look\n[OK]\n```\n```\n');
    expect(errors[0]).toBe('Line 6: Empty fenced block — a fence must contain at least one line');
  });

  it('rejects a fence after [OK: any]', () => {
    const errors = errorsFor('title: T\n---\n\n> look\n[OK: any]\n```\nA den.\n```\n');
    expect(errors[0]).toMatch(/^Line 6: Fenced block cannot follow "\[OK: any\]"/);
  });

  it('rejects a fence after an inline-payload assertion', () => {
    const errors = errorsFor('title: T\n---\n\n> look\n[OK: contains "den"]\n```\nA den.\n```\n');
    expect(errors[0]).toMatch(/^Line 6: Fenced block cannot follow "\[OK: contains "den"\]"/);
  });

  it('rejects a fence after a directive', () => {
    const errors = errorsFor('title: T\n---\n\n> look\n[OK: any]\n\n[ENSURES: player.alive]\n```\nA den.\n```\n');
    expect(errors[0]).toMatch(/^Line 8: Fenced block cannot follow the directive "\[ENSURES: player\.alive\]"/);
  });

  it('rejects payload-less [OK: contains] with no fence', () => {
    const errors = errorsFor('title: T\n---\n\n> look\n[OK: contains]\nA den.\n');
    expect(errors).toContain(
      'Line 5: [OK: contains] with no inline payload requires a fenced block on the next line',
    );
  });

  it('rejects a command carrying both a fence and a classic expected-output block', () => {
    const errors = errorsFor('title: T\n---\n\n> look\n[OK]\n```\nA den.\n```\nAlso a den.\n');
    expect(errors[0]).toMatch(/carries both a fenced block and a classic expected-output block/);
    expect(errors[0]).toMatch(/^Line 5:/);
  });

  it('swallows an illegally-placed fence so its content cannot cascade into a second error', () => {
    // The literal `> take lamp` inside would otherwise parse as a real command.
    const transcript = parseTranscript(
      'title: T\n---\n\n> look\n[OK: any]\n```\n> take lamp\n```\n',
      't.transcript',
    );
    expect(transcript.parseErrors).toHaveLength(1);
    expect(transcript.commands).toHaveLength(1);
    expect(transcript.commands[0].input).toBe('look');
  });
});

describe('ADR-287 D1 — fences inside blocks and chains', () => {
  it('behaves identically inside an [IF] block — attachment is at the assertion level', () => {
    const transcript = parseClean(
      'title: T\n---\n\n[IF: player.alive]\n> read sign\n[OK]\n```\n[Notice] Dusk.\n```\n[END IF]\n',
    );
    const command = transcript.commands.find((c) => c.input === 'read sign');
    expect(command?.assertions[0].fence).toEqual(['[Notice] Dusk.']);
    // The block structure survives — the fence consumed nothing it shouldn't have.
    const directives = transcript.items!.filter((i) => i.type === 'directive');
    expect(directives.map((d) => d.directive!.type)).toEqual(['if', 'end_if']);
  });
});
