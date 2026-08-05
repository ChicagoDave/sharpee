/**
 * fenced-payloads.test.ts — ADR-287 D1: literal `text` blocks.
 *
 * (Filename kept from the backtick-fence era so the file's history stays
 * intact; the form it covers is now `text` … `end text`.)
 *
 * Derived line-by-line from the parser's Behavior Statement: each DOES line is
 * a functional test below, each REJECTS WHEN line a rejection test.
 *
 * Scope is the PARSER only — attachment, literal capture, and loud validation.
 * Comparison semantics (`[OK]` + block = exact, `[OK: contains]` + block =
 * normalized contains) are the runner's, tested in fenced-runner.test.ts.
 *
 * Imported from ../src/parser.js rather than the package barrel: the barrel
 * re-exports the runner and drags in the whole engine, which a parser test has
 * no business needing.
 *
 * Owner context: branch-tester test suite (tooling).
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

describe('ADR-287 D1 — block attaches to [OK]', () => {
  it('captures bracket, quote, > and # lines verbatim, uninterpreted', () => {
    const transcript = parseClean(
      'title: T\n---\n\n> read sign\n[OK]\ntext\n' +
        '[Notice] The vault closes at dusk.\n' +
        'Beware the "night porter."\n' +
        '> not a command\n' +
        '# not a comment\n' +
        'end text\n',
    );

    const command = transcript.commands[0];
    expect(command.assertions).toHaveLength(1);
    expect(command.assertions[0].type).toBe('ok');
    expect(command.assertions[0].block).toEqual([
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

  it('preserves blank lines and leading whitespace inside the block', () => {
    const transcript = parseClean(
      'title: T\n---\n\n> look\n[OK]\ntext\nFirst.\n\n    Indented.\nend text\n',
    );
    expect(transcript.commands[0].assertions[0].block).toEqual(['First.', '', '    Indented.']);
  });

  it('preserves a payload whose EVERY line is indented', () => {
    // The case that ruled indentation out as the delimiter (ADR-287 Context):
    // with no line at column 0 there is no recoverable common indent, so a
    // dedenting reader would silently return this text flush left.
    const transcript = parseClean(
      'title: T\n---\n\n> read leaflet\n[OK]\ntext\n' +
        '                         WELCOME TO DUNGEON\n' +
        '      Indented body line.\n' +
        'end text\n',
    );
    expect(transcript.commands[0].assertions[0].block).toEqual([
      '                         WELCOME TO DUNGEON',
      '      Indented body line.',
    ]);
  });

  it('stamps the assertion line number for failure display', () => {
    const transcript = parseClean('title: T\n---\n\n> look\n[OK]\ntext\nA den.\nend text\n');
    // Line 5 is the `[OK]` tag: header(1) + separator(2) + blank(3) + command(4).
    expect(transcript.commands[0].assertions[0].lineNumber).toBe(5);
  });
});

describe('ADR-287 D1 — block attaches to payload-less [OK: contains]', () => {
  it('parses to ok-contains with the block as the fragment and no inline value', () => {
    const transcript = parseClean(
      'title: T\n---\n\n> read sign\n[OK: contains]\ntext\nthe vault closes\nat dusk\nend text\n',
    );
    const assertion = transcript.commands[0].assertions[0];
    expect(assertion.type).toBe('ok-contains');
    expect(assertion.value).toBeUndefined();
    expect(assertion.block).toEqual(['the vault closes', 'at dusk']);
  });

  it('is case-insensitive and whitespace-tolerant, like the inline form', () => {
    const transcript = parseClean('title: T\n---\n\n> look\n[ok:   CONTAINS]\ntext\na den\nend text\n');
    expect(transcript.commands[0].assertions[0].type).toBe('ok-contains');
    expect(transcript.commands[0].assertions[0].block).toEqual(['a den']);
  });
});

describe('ADR-287 D1 — the delimiters live at column 0', () => {
  it('an INDENTED end text is content, not a close', () => {
    // This is what lets a story — or Sharpee's own tutorial — quote the syntax.
    const transcript = parseClean(
      'title: T\n---\n\n> read manual\n[OK]\ntext\nTo close a block, write:\n  end text\nDone.\nend text\n',
    );
    expect(transcript.commands[0].assertions[0].block).toEqual([
      'To close a block, write:',
      '  end text',
      'Done.',
    ]);
  });

  it('trailing whitespace on a delimiter is forgiven', () => {
    const transcript = parseClean('title: T\n---\n\n> look\n[OK]\ntext  \nA den.\nend text  \n');
    expect(transcript.commands[0].assertions[0].block).toEqual(['A den.']);
  });
});

describe('ADR-287 D1 — the reserved end text line fails loudly, never silently', () => {
  // David's ruling (2026-07-28): `end text` at column 0 is reserved syntax and
  // there is no escape. That is only safe because the collision cannot produce
  // a plausible-looking assertion — in EVERY arrangement it is a validation
  // error with a line number. These three tests are that guarantee (AC-2).

  it('rejects a colliding line in the MIDDLE of the payload', () => {
    const errors = errorsFor(
      'title: T\n---\n\n> read manual\n[OK]\ntext\nbefore\nend text\nafter\nend text\n',
    );
    // Block closes early at line 8; "after" and the true terminator fall through
    // to expected-output, so the command now carries both forms.
    expect(errors[0]).toMatch(/carries both a text block and a classic expected-output block/);
  });

  it('rejects a colliding line at the END of the payload', () => {
    const errors = errorsFor(
      'title: T\n---\n\n> read manual\n[OK]\ntext\nbefore\nend text\nend text\n',
    );
    expect(errors[0]).toMatch(/carries both a text block and a classic expected-output block/);
  });

  it('rejects a colliding line at the START of the payload', () => {
    const errors = errorsFor('title: T\n---\n\n> read manual\n[OK]\ntext\nend text\nend text\n');
    // Closes immediately with nothing in it.
    expect(errors[0]).toBe('Line 6: Empty text block — a block must contain at least one line');
  });
});

describe('ADR-287 D1 — attachment is strictly the next line', () => {
  it('a blank line detaches the block, leaving `text` as ordinary prose (D2)', () => {
    const transcript = parseTranscript('title: T\n---\n\n> look\n[OK]\n\ntext\nA den.\nend text\n', 't.transcript');
    const command = transcript.commands[0];
    expect(command.assertions[0].block).toBeUndefined();
    // An unattached `text` line parses exactly as it did before blocks existed:
    // ordinary expected-output prose. No error — D2's collision window is prose.
    expect(command.expectedOutput).toContain('text');
    expect(transcript.parseErrors).toBeUndefined();
  });
});

describe('ADR-287 D1 — rejections are loud and line-numbered (AC4)', () => {
  it('rejects an unclosed block', () => {
    const errors = errorsFor('title: T\n---\n\n> look\n[OK]\ntext\nA den.\n');
    expect(errors[0]).toBe(
      'Line 6: Unclosed text block — expected a line reading "end text" before end of file',
    );
  });

  it('rejects an empty block', () => {
    const errors = errorsFor('title: T\n---\n\n> look\n[OK]\ntext\nend text\n');
    expect(errors[0]).toBe('Line 6: Empty text block — a block must contain at least one line');
  });

  it('rejects a block after a non-block assertion', () => {
    const errors = errorsFor('title: T\n---\n\n> look\n[SKIP]\ntext\nA den.\nend text\n');
    expect(errors[0]).toMatch(/^Line 6: A text block cannot follow "\[SKIP\]"/);
  });

  it('rejects a block after an inline-payload assertion', () => {
    const errors = errorsFor('title: T\n---\n\n> look\n[OK: contains "den"]\ntext\nA den.\nend text\n');
    expect(errors[0]).toMatch(/^Line 6: A text block cannot follow "\[OK: contains "den"\]"/);
  });

  it('rejects a block after a directive', () => {
    const errors = errorsFor('title: T\n---\n\n> look\n[SKIP]\n\n[GOAL: read the sign]\ntext\nA den.\nend text\n');
    expect(errors[0]).toMatch(/^Line 8: A text block cannot follow the directive "\[GOAL: read the sign\]"/);
  });

  it('rejects payload-less [OK: contains] with no block', () => {
    const errors = errorsFor('title: T\n---\n\n> look\n[OK: contains]\nA den.\n');
    expect(errors).toContain(
      'Line 5: [OK: contains] with no inline payload requires a text block on the next line',
    );
  });

  it('rejects a command carrying both a block and a classic expected-output block', () => {
    const errors = errorsFor('title: T\n---\n\n> look\n[OK]\ntext\nA den.\nend text\nAlso a den.\n');
    expect(errors[0]).toMatch(/carries both a text block and a classic expected-output block/);
    expect(errors[0]).toMatch(/^Line 5:/);
  });

  it('swallows an illegally-placed block so its content cannot cascade into a second error', () => {
    // The literal `> take lamp` inside would otherwise parse as a real command.
    const transcript = parseTranscript(
      'title: T\n---\n\n> look\n[SKIP]\ntext\n> take lamp\nend text\n',
      't.transcript',
    );
    expect(transcript.parseErrors).toHaveLength(1);
    expect(transcript.commands).toHaveLength(1);
    expect(transcript.commands[0].input).toBe('look');
  });
});

describe('ADR-287 D1 — blocks inside blocks and chains', () => {
  it('behaves identically inside a [GOAL] block — attachment is at the assertion level', () => {
    const transcript = parseClean(
      'title: T\n---\n\n[GOAL: read the sign]\n> read sign\n[OK]\ntext\n[Notice] Dusk.\nend text\n[END GOAL]\n',
    );
    const command = transcript.commands.find((c) => c.input === 'read sign');
    expect(command?.assertions[0].block).toEqual(['[Notice] Dusk.']);
    // The block structure survives — the text block consumed nothing it shouldn't.
    const directives = transcript.items!.filter((i) => i.type === 'directive');
    expect(directives.map((d) => d.directive!.type)).toEqual(['goal', 'end_goal']);
  });
});
