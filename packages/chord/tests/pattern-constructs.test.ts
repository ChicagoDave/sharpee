/**
 * pattern-constructs.test.ts — ADR-267 landing group 2 (D8/D9/D10):
 * `or`-alternation, `[word]` optional elements, and the greedy-slot
 * declarative line `the <slot> takes the rest of the line`, compile-side —
 * IR carriage and the named diagnostics for every malformed form.
 * (Loader emission shape is asserted in story-loader's
 * pattern-constructs-emission tests; production parse via transcripts.)
 */
import { describe, expect, it } from 'vitest';
import { compile } from '../src';

const HEADER = 'story\n  title: T\n  authors:\n    N\n  id: t\n  story-version: 0.0.1\n\n';
const WORLD = 'create the Barn\n  a room\n\n  A barn.\n\ncreate the player\n  starts in the Barn\n\n  You.\n';

const action = (lines: string) =>
  `${HEADER}define action testing\n${lines}  otherwise refuse cant\n\n  phrases en-US\n    cant:\n      No.\n\n${WORLD}`;

const errorsOf = (source: string) =>
  compile(source).diagnostics.filter((d) => d.severity === 'error');

const irAction = (source: string) => {
  const result = compile(source);
  expect(
    result.diagnostics.filter((d) => d.severity === 'error'),
  ).toEqual([]);
  return result.ir!.actions.find((a) => a.name === 'testing')!;
};

describe('alternation: `or` (ADR-267 D8)', () => {
  it('adjacent literals joined by `or` become one alt element in the IR', () => {
    const a = irAction(action('  grammar\n    look in or inside the target\n'));
    expect(a.patterns[0].parts).toEqual([
      { kind: 'word', word: 'look' },
      { kind: 'alt', words: ['in', 'inside'] },
      { kind: 'slot', word: 'target' },
    ]);
  });

  it('chains three or more alternates into one element', () => {
    const a = irAction(action('  grammar\n    put the item in or into or inside the box\n'));
    expect(a.patterns[0].parts).toContainEqual({ kind: 'alt', words: ['in', 'into', 'inside'] });
  });

  it('rejects a leading `or`, by name', () => {
    const errors = errorsOf(action('  grammar\n    or look the target\n'));
    expect(errors.some((e) => e.code === 'parse.pattern-or')).toBe(true);
  });

  it('rejects a trailing `or`, by name', () => {
    const errors = errorsOf(action('  grammar\n    look in or\n'));
    expect(errors.some((e) => e.code === 'parse.pattern-or')).toBe(true);
  });

  it('rejects `or` joining a slot, by name', () => {
    const errors = errorsOf(action('  grammar\n    look in or the target\n'));
    expect(errors.some((e) => e.code === 'parse.pattern-or')).toBe(true);
  });
});

describe('optional elements: `[word]` (ADR-267 D9)', () => {
  it('a bracketed word is the same element with optional set', () => {
    const a = irAction(action('  grammar\n    look [carefully] at the target\n'));
    expect(a.patterns[0].parts).toEqual([
      { kind: 'word', word: 'look' },
      { kind: 'word', word: 'carefully', optional: true },
      { kind: 'word', word: 'at' },
      { kind: 'slot', word: 'target' },
    ]);
  });

  it('brackets compose with alternation and slots', () => {
    const a = irAction(action('  grammar\n    look [in or inside] [the target]\n'));
    expect(a.patterns[0].parts).toEqual([
      { kind: 'word', word: 'look' },
      { kind: 'alt', words: ['in', 'inside'], optional: true },
      { kind: 'slot', word: 'target', optional: true },
    ]);
  });

  it('rejects empty `[]`, by name', () => {
    const errors = errorsOf(action('  grammar\n    look [] at the target\n'));
    expect(errors.some((e) => e.code === 'parse.pattern-bracket')).toBe(true);
  });

  it('rejects an unclosed `[`, by name', () => {
    const errors = errorsOf(action('  grammar\n    look [carefully at the target\n'));
    expect(errors.some((e) => e.code === 'parse.pattern-bracket')).toBe(true);
  });

  it('rejects nested brackets, by name', () => {
    const errors = errorsOf(action('  grammar\n    look [[carefully]] at the target\n'));
    expect(errors.some((e) => e.code === 'parse.pattern-bracket')).toBe(true);
  });
});

describe('greedy slot: `takes the rest of the line` (ADR-267 D10)', () => {
  it('carries the declared slot on the IR action', () => {
    const a = irAction(action('  grammar\n    write the message\n  the message takes the rest of the line\n'));
    expect(a.greedy).toEqual(['message']);
  });

  it('is absent from the IR when no greedy line is declared', () => {
    const a = irAction(action('  grammar\n    write the message\n'));
    expect(a.greedy).toBeUndefined();
  });

  it('rejects a greedy line naming a slot absent from every pattern (analysis.unknown-slot)', () => {
    const errors = errorsOf(action('  grammar\n    write the message\n  the text takes the rest of the line\n'));
    const err = errors.find((e) => e.code === 'analysis.unknown-slot');
    expect(err, errors.map((e) => `${e.code} ${e.message}`).join(' | ')).toBeDefined();
    expect(err!.message).toContain('`text`');
    expect(err!.message).toContain('message');
  });

  it('rejects a malformed greedy line, by name', () => {
    const errors = errorsOf(action('  grammar\n    write the message\n  the message takes the rest\n'));
    expect(errors.some((e) => e.code === 'parse.action-greedy')).toBe(true);
  });

  it('rejects trailing words after `line`, by name', () => {
    const errors = errorsOf(action('  grammar\n    write the message\n  the message takes the rest of the line always\n'));
    expect(errors.some((e) => e.code === 'parse.action-greedy')).toBe(true);
  });
});

describe('typed slots: `is an instrument` / `is a topic` (ADR-267 D11)', () => {
  it('carries {slot, type} pairs on the IR action', () => {
    const a = irAction(
      action('  grammar\n    unlock the target with the key\n  the key is an instrument\n'),
    );
    expect(a.slotTypes).toEqual([{ slot: 'key', type: 'instrument' }]);
  });

  it('accepts `is a topic` and is absent when undeclared', () => {
    const a = irAction(
      action('  grammar\n    consult the sage about the subject\n  the subject is a topic\n'),
    );
    expect(a.slotTypes).toEqual([{ slot: 'subject', type: 'topic' }]);
    const plain = irAction(action('  grammar\n    pet the animal\n'));
    expect(plain.slotTypes).toBeUndefined();
  });

  it('rejects an unknown type word, listing the supported set', () => {
    const errors = errorsOf(
      action('  grammar\n    unlock the target with the key\n  the key is an implement\n'),
    );
    const err = errors.find((e) => e.code === 'analysis.unknown-slot-type');
    expect(err, errors.map((e) => `${e.code} ${e.message}`).join(' | ')).toBeDefined();
    expect(err!.message).toContain('`implement`');
    expect(err!.message).toContain('instrument, topic');
  });

  it('rejects a typed-slot line naming a slot absent from every pattern (analysis.unknown-slot)', () => {
    const errors = errorsOf(
      action('  grammar\n    unlock the target\n  the key is an instrument\n'),
    );
    expect(errors.some((e) => e.code === 'analysis.unknown-slot')).toBe(true);
  });

  it('rejects a malformed typed-slot line, by name', () => {
    const errors = errorsOf(
      action('  grammar\n    unlock the target with the key\n  the key is instrument\n'),
    );
    expect(errors.some((e) => e.code === 'parse.action-slot-type')).toBe(true);
  });
});

describe('semantic defaults: `means <key> <value>` (ADR-267 D12)', () => {
  it('carries per-pattern means entries in the IR, absent when undeclared', () => {
    const a = irAction(
      action('  grammar\n    hide under the target\n      means position under\n    hide behind the target\n      means position behind\n    hide\n'),
    );
    expect(a.patterns[0].means).toEqual([{ key: 'position', value: 'under' }]);
    expect(a.patterns[1].means).toEqual([{ key: 'position', value: 'behind' }]);
    expect(a.patterns[2].means).toBeUndefined();
  });

  it('rejects a malformed means line, by name', () => {
    const errors = errorsOf(action('  grammar\n    hide under the target\n      means position\n'));
    expect(errors.some((e) => e.code === 'parse.action-means')).toBe(true);
  });

  it('rejects a means line with no pattern above it, by name', () => {
    const errors = errorsOf(action('  grammar\n    means position under\n'));
    expect(errors.some((e) => e.code === 'parse.action-means')).toBe(true);
  });
});

describe('direction map: `directions` block (ADR-267 D12)', () => {
  const sailing =
    '  grammar\n    sail the direction\n    the direction\n  directions\n    port or p\n    starboard or sb\n    fore\n    aft\n';

  it('carries canonical + aliases on the IR action', () => {
    const a = irAction(action(sailing));
    expect(a.directions).toEqual([
      { canonical: 'port', aliases: ['p'] },
      { canonical: 'starboard', aliases: ['sb'] },
      { canonical: 'fore', aliases: [] },
      { canonical: 'aft', aliases: [] },
    ]);
  });

  it('rejects a block when no pattern uses `the direction` (analysis.unknown-slot)', () => {
    const errors = errorsOf(action('  grammar\n    sail the heading\n  directions\n    port or p\n'));
    const err = errors.find((e) => e.code === 'analysis.unknown-slot');
    expect(err, errors.map((e) => `${e.code} ${e.message}`).join(' | ')).toBeDefined();
    expect(err!.message).toContain('directions');
  });

  it('rejects a duplicate word within the block, by name', () => {
    const errors = errorsOf(
      action('  grammar\n    sail the direction\n  directions\n    port or p\n    starboard or p\n'),
    );
    expect(errors.some((e) => e.code === 'analysis.duplicate-direction')).toBe(true);
  });

  it('rejects a second directions block, an empty block, and malformed alias lines, by name', () => {
    const twice = errorsOf(
      action('  grammar\n    sail the direction\n  directions\n    port or p\n  directions\n    fore\n'),
    );
    expect(twice.some((e) => e.code === 'parse.action-directions')).toBe(true);
    const empty = errorsOf(action('  grammar\n    sail the direction\n  directions\n'));
    expect(empty.some((e) => e.code === 'parse.action-directions')).toBe(true);
    const bad = errorsOf(action('  grammar\n    sail the direction\n  directions\n    port p\n'));
    expect(bad.some((e) => e.code === 'parse.action-directions')).toBe(true);
  });
});

describe('extend action shares the pattern-elem production (define verb removed, ADR-270 D7)', () => {
  it('alternation and optional parse in an extension pattern', () => {
    const source = `${HEADER}extend action examining\n  grammar\n    glance [quickly] at or toward the target\n\n${WORLD}`;
    const result = compile(source);
    expect(result.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    const ext = result.ir!.grammarExtensions!.find((e) => e.action === 'examining')!;
    expect(ext.patterns[0].parts).toEqual([
      { kind: 'word', word: 'glance' },
      { kind: 'word', word: 'quickly', optional: true },
      { kind: 'alt', words: ['at', 'toward'] },
      { kind: 'slot', word: 'target' },
    ]);
  });
});
