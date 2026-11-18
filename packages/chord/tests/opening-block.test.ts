/**
 * opening-block.test.ts — the story's opening block, `when the game starts
 * … end when`: what it compiles to, and each thing the compiler refuses
 * about it, by code, message and line.
 *
 * Public interface: none (test file).
 * Owner context: @sharpee/chord — parser (the block), analyzer (its gates),
 * validate-ir (the same rule over IR that reached no compile).
 */
import { describe, expect, it } from 'vitest';
import { compile, validateIR, type Diagnostic, type StoryIR } from '../src';

/**
 * A one-room story. `prologue` adds the header field; `block` is appended
 * after the start block, verbatim; `inStartBlock` adds a line to the start
 * block's body.
 */
function source(options: { prologue?: boolean; block?: string; inStartBlock?: string } = {}): string {
  const { prologue = true, block = '', inStartBlock = '' } = options;
  return `story
  title: The Quay
  authors:
    T
  id: quay
  story-version: 0.0.1
${prologue ? '  prologue:\n    The last ferry left an hour ago.\n' : ''}
create the Quay
  a room

  A stone quay.

create the keeper
  a person
  playable
  starts in the Quay

  You.

before the game starts
  change the player to the keeper
${inStartBlock}end before

${block}`;
}

function errors(text: string): Diagnostic[] {
  return compile(text).diagnostics.filter((d) => d.severity === 'error');
}

/** The 1-based line of the first line of `text` that reads exactly `needle` once trimmed, counting from `from`. */
function lineOf(text: string, needle: string, occurrence = 1): number {
  const lines = text.split('\n');
  let seen = 0;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim() === needle && ++seen === occurrence) return i + 1;
  }
  throw new Error(`no line reads \`${needle}\` (occurrence ${occurrence})`);
}

function compiled(text: string): StoryIR {
  const result = compile(text);
  expect(result.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
  return result.ir;
}

describe('the opening block compiles to the IR\'s opening list', () => {
  it('a story with no block carries null: the default routine', () => {
    expect(compiled(source()).opening).toBeNull();
  });

  it('the default order written out is the three names in that order', () => {
    const block = 'when the game starts\n  show-prologue\n  show-banner\n  do-first-look\nend when\n';
    expect(compiled(source({ block })).opening).toEqual(['show-prologue', 'show-banner', 'do-first-look']);
  });

  it('a reordered block keeps the author\'s order', () => {
    const block = 'when the game starts\n  show-prologue\n  do-first-look\n  show-banner\nend when\n';
    expect(compiled(source({ block })).opening).toEqual(['show-prologue', 'do-first-look', 'show-banner']);
  });

  it('a block that leaves routines out carries only what it names', () => {
    const block = 'when the game starts\n  show-banner\nend when\n';
    expect(compiled(source({ block })).opening).toEqual(['show-banner']);
  });

  it('an empty block is allowed and carries an empty list, not null', () => {
    const block = 'when the game starts\nend when\n';
    expect(compiled(source({ block })).opening).toEqual([]);
  });

  it('a story with no prologue may still have a block that does not name show-prologue', () => {
    const block = 'when the game starts\n  do-first-look\n  show-banner\nend when\n';
    expect(compiled(source({ prologue: false, block })).opening).toEqual(['do-first-look', 'show-banner']);
  });

  it('the block may come before the start block', () => {
    const text = source().replace('before the game starts', 'when the game starts\n  show-banner\nend when\n\nbefore the game starts');
    expect(compiled(text).opening).toEqual(['show-banner']);
  });

  it('the list survives a JSON round trip unchanged', () => {
    const block = 'when the game starts\n  do-first-look\n  show-prologue\nend when\n';
    const ir = compiled(source({ block }));
    expect((JSON.parse(JSON.stringify(ir)) as StoryIR).opening).toEqual(['do-first-look', 'show-prologue']);
  });
});

describe('what the compiler refuses about the opening', () => {
  it('a routine named twice: analysis.opening-routine-repeated, on the second line', () => {
    const text = source({ block: 'when the game starts\n  show-banner\n  do-first-look\n  show-banner\nend when\n' });
    const found = errors(text);
    expect(found.map((d) => d.code)).toEqual(['analysis.opening-routine-repeated']);
    expect(found[0].message).toContain('`show-banner` is already in this block');
    expect(found[0].span.line).toBe(lineOf(text, 'show-banner', 2));
    // The refused line is left out of the list the IR carries.
    expect(compile(text).ir.opening).toEqual(['show-banner', 'do-first-look']);
  });

  it('show-prologue in a story with no prologue: analysis.opening-no-prologue, on its line', () => {
    const text = source({ prologue: false, block: 'when the game starts\n  show-prologue\n  show-banner\nend when\n' });
    const found = errors(text);
    expect(found.map((d) => d.code)).toEqual(['analysis.opening-no-prologue']);
    expect(found[0].message).toContain('the story header has no `prologue:` field');
    expect(found[0].span.line).toBe(lineOf(text, 'show-prologue'));
    expect(compile(text).ir.opening).toEqual(['show-banner']);
  });

  it.each([
    ['look', 'look'],
    ['phrase welcome', 'phrase welcome'],
    ['move the keeper to the Quay', 'move the keeper to the Quay'],
    ['show-banner now', 'show-banner now'],
    ['show-credits', 'show-credits'],
  ])('`%s` inside the block: parse.opening-statement, naming the line', (line, quoted) => {
    const text = source({ block: `when the game starts\n  show-banner\n  ${line}\nend when\n` });
    const found = errors(text);
    expect(found.map((d) => d.code)).toEqual(['parse.opening-statement']);
    expect(found[0].message).toContain(`\`${quoted}\` cannot go in a \`when the game starts\` block`);
    expect(found[0].message).toContain('`show-prologue`, `show-banner`, `do-first-look`');
    expect(found[0].span.line).toBe(lineOf(text, line));
  });

  it('a statement with lines under it is one refusal, and the routines around it still parse', () => {
    const text = source({
      block: 'when the game starts\n  show-prologue\n  select randomly\n    phrase one\n  or\n    phrase two\n  end select\n  do-first-look\nend when\n',
    });
    const found = errors(text);
    // `select randomly`, `or` and `end select` each sit at the block's indent.
    expect(found.every((d) => d.code === 'parse.opening-statement')).toBe(true);
    expect(found.map((d) => d.span.line)).toEqual([lineOf(text, 'select randomly'), lineOf(text, 'or'), lineOf(text, 'end select')]);
    expect(compile(text).ir.opening).toEqual(['show-prologue', 'do-first-look']);
  });

  it('a line indented under a routine is refused, even when it is a routine name, and stays out of the list', () => {
    const text = source({ block: 'when the game starts\n  show-prologue\n    show-banner\n  do-first-look\nend when\n' });
    const found = errors(text);
    expect(found.map((d) => d.code)).toEqual(['parse.opening-statement']);
    expect(found[0].message).toContain('`show-banner` cannot go in a `when the game starts` block');
    expect(found[0].span.line).toBe(lineOf(text, 'show-banner'));
    expect(compile(text).ir.opening).toEqual(['show-prologue', 'do-first-look']);
  });

  it.each(['show-prologue', 'show-banner', 'do-first-look'])(
    '`%s` in a statement body: parse.opening-routine-outside, on its line',
    (name) => {
      const text = source({ inStartBlock: `  ${name}\n` });
      const found = errors(text);
      expect(found.map((d) => d.code)).toEqual(['parse.opening-routine-outside']);
      expect(found[0].message).toContain(`\`${name}\` is a routine of the story's opening`);
      expect(found[0].message).toContain('`when the game starts` block');
      expect(found[0].span.line).toBe(lineOf(text, name));
    },
  );

  it.each(['show-prologue', 'show-banner', 'do-first-look'])(
    '`%s` at the top level: parse.opening-routine-outside, on its line',
    (name) => {
      const text = source({ block: `${name}\n` });
      const found = errors(text);
      expect(found.map((d) => d.code)).toEqual(['parse.opening-routine-outside']);
      expect(found[0].span.line).toBe(lineOf(text, name));
    },
  );

  it('a routine name in an `after` clause body is refused the same way', () => {
    const text = source().replace('  A stone quay.\n', '  A stone quay.\n\n  after the player waiting\n    do-first-look\n  end after\n');
    const found = errors(text);
    expect(found.map((d) => d.code)).toEqual(['parse.opening-routine-outside']);
    expect(found[0].span.line).toBe(lineOf(text, 'do-first-look'));
  });

  it('a routine name among a create block\'s lines is refused the same way, and the same words in its prose are not', () => {
    const text = source().replace('  a room\n', '  a room\n  show-banner\n');
    const found = errors(text);
    expect(found.map((d) => d.code)).toEqual(['parse.opening-routine-outside']);
    expect(found[0].span.line).toBe(lineOf(text, 'show-banner'));

    const prose = source().replace('  A stone quay.\n', '  A stone quay.\n  show-banner\n');
    expect(errors(prose)).toEqual([]);
  });

  it('a second block: analysis.duplicate-opening-block, on the second, and the first is the opening', () => {
    const text = source({
      block: 'when the game starts\n  show-banner\nend when\n\nwhen the game starts\n  do-first-look\nend when\n',
    });
    const found = errors(text);
    expect(found.map((d) => d.code)).toEqual(['analysis.duplicate-opening-block']);
    expect(found[0].message).toContain('this is the second');
    expect(found[0].span.line).toBe(lineOf(text, 'when the game starts', 2));
    expect(compile(text).ir.opening).toEqual(['show-banner']);
  });

  it('a block with no `end when` is an unterminated block', () => {
    const text = source({ block: 'when the game starts\n  show-banner\n' });
    expect(errors(text).map((d) => d.code)).toEqual(['parse.unterminated-block']);
  });

  it('any other top-level `when` is still the removed rule form', () => {
    const text = source({ block: 'when the player takes the lamp\n  win\nend when\n' });
    expect(errors(text).map((d) => d.code)).toContain('parse.removed-when');
    expect(errors(source({ block: 'when the game starts now\n  show-banner\nend when\n' })).map((d) => d.code)).toContain(
      'parse.removed-when',
    );
  });
});

describe('validateIR refuses an opening list no compile produced', () => {
  const base = (prologue = true): StoryIR => compiled(source({ prologue }));
  const codes = (ir: StoryIR) => validateIR(ir).filter((d) => d.severity === 'error').map((d) => d.code);

  it('a compiled list, an empty list, null and an absent field all pass', () => {
    expect(codes({ ...base(), opening: ['show-prologue', 'do-first-look', 'show-banner'] })).toEqual([]);
    expect(codes({ ...base(), opening: [] })).toEqual([]);
    expect(codes({ ...base(), opening: null })).toEqual([]);
    const absent: Partial<StoryIR> = { ...base() };
    delete absent.opening;
    expect(codes(absent as StoryIR)).toEqual([]);
  });

  it('a repeated routine is analysis.opening-routine-repeated', () => {
    expect(codes({ ...base(), opening: ['show-banner', 'show-banner'] })).toEqual(['analysis.opening-routine-repeated']);
  });

  it('show-prologue without a prologue is analysis.opening-no-prologue', () => {
    expect(codes({ ...base(false), opening: ['show-prologue'] })).toEqual(['analysis.opening-no-prologue']);
  });

  it('a name that is not a routine is analysis.opening-unknown-routine, naming it', () => {
    const ir = { ...base(), opening: ['show-banner', 'look'] } as unknown as StoryIR;
    const found = validateIR(ir).filter((d) => d.severity === 'error');
    expect(found.map((d) => d.code)).toEqual(['analysis.opening-unknown-routine']);
    expect(found[0].message).toContain('`look`');
  });
});
