/**
 * grammar-file.test.ts — ADR-269 D8/D10 (Phase 1): the `grammar "<name>"`
 * top-level header, grammar-file mode's named gates (behavior and story
 * declarations rejected), the header exclusivity rules, and the IR
 * `grammarFile` marker. The build-step id validation (D10's name check
 * against the stdlib set) is the consuming tool's, not chord's — not here.
 */
import { describe, expect, it } from 'vitest';
import { compile } from '../src';

const errorsOf = (source: string) =>
  compile(source).diagnostics.filter((d) => d.severity === 'error');

const codesOf = (source: string) => errorsOf(source).map((d) => d.code);

const GRAMMAR = 'grammar "standard-en-us"\n\n';

describe('the grammar header (ADR-269 D8)', () => {
  it('a grammar file with define-action grammar surfaces compiles clean and marks the IR', () => {
    const result = compile(
      `${GRAMMAR}define action taking\n  grammar\n    take the item\n    get the item\n  the item must be reachable\n`,
    );
    expect(result.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    expect(result.ok).toBe(true);
    expect(result.ir!.grammarFile).toEqual({ name: 'standard-en-us' });
    const action = result.ir!.actions.find((a) => a.name === 'taking')!;
    expect(action.patterns).toHaveLength(2);
    expect(action.constraints).toEqual([
      expect.objectContaining({ slot: 'item', requirement: 'reachable' }),
    ]);
  });

  it('typed slots, greedy slots, directions, and means are grammar surfaces — legal', () => {
    const result = compile(
      `${GRAMMAR}define action going\n  grammar\n    go the direction\n    the direction\n  directions\n    north or n\n    south or s\n\n` +
      `define action writing\n  grammar\n    write the message\n  the message takes the rest of the line\n\n` +
      `define action unlocking\n  grammar\n    unlock the target with the key\n      means manner quietly\n  the key is an instrument\n`,
    );
    expect(result.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    expect(result.ir!.grammarFile).toEqual({ name: 'standard-en-us' });
  });

  it('a story IR never carries the grammarFile marker', () => {
    const result = compile(
      'story\n  title: T\n  authors: N\n\ncreate the Barn\n  a room\n\n  A barn.\n\ncreate the player\n  starts in the Barn\n\n  You.\n',
    );
    expect(result.ir!.grammarFile).toBeUndefined();
  });

  it('an unquoted grammar name is parse.grammar-name', () => {
    expect(codesOf('grammar standard\n')).toContain('parse.grammar-name');
  });

  it('an indented body under the header is parse.grammar-header-body', () => {
    expect(codesOf('grammar "g"\n  id: g\n')).toContain('parse.grammar-header-body');
  });

  it('a duplicate grammar header is parse.duplicate-grammar-header', () => {
    expect(codesOf('grammar "a"\n\ngrammar "b"\n')).toContain('parse.duplicate-grammar-header');
  });

  it('grammar and story headers are mutually exclusive, both orders', () => {
    expect(codesOf('grammar "g"\n\nstory\n  title: T\n  authors: N\n')).toContain('parse.mixed-headers');
    expect(codesOf('story\n  title: T\n  authors: N\n\ngrammar "g"\n')).toContain('parse.mixed-headers');
  });
});

describe('grammar-file mode gates (ADR-269 D4/D8)', () => {
  it('a non-define-action declaration is analysis.grammar-file-declaration', () => {
    const codes = codesOf(`${GRAMMAR}create the Barn\n  a room\n\n  A barn.\n`);
    expect(codes).toContain('analysis.grammar-file-declaration');
  });

  it.each([
    ['a refusal line', '  refuse without item: take-what\n'],
    ['otherwise refuse', '  otherwise refuse cant\n'],
    ['a must requirement', '  the item must be open: not-open\n'],
    ['a score line', '  score grabbed worth 5\n'],
    ['a phrases block', '  phrases en-US\n    cant:\n      No.\n'],
    ['a body statement', '  phrase taken-msg\n'],
  ])('%s in a grammar file is analysis.grammar-file-behavior', (_what, line) => {
    const codes = codesOf(
      `${GRAMMAR}define action taking\n  grammar\n    take the item\n${line}`,
    );
    expect(codes).toContain('analysis.grammar-file-behavior');
  });
});
