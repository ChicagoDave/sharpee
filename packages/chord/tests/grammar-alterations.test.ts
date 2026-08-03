/**
 * grammar-alterations.test.ts — ADR-270 D2/D3/D6 (Phase 1): the story-level
 * `extend action <name>` and `remove from action <name>` alteration blocks —
 * parse forms, the grammar-surfaces-only gates, IR shape (additive, absent
 * when undeclared), and grammar-file-mode rejection. Target-name resolution
 * is compile-side since ADR-276 Phase 3 (alteration-targets.test.ts);
 * emission stays the loader's.
 */
import { describe, expect, it } from 'vitest';
import { compile } from '../src';

const errorsOf = (source: string) =>
  compile(source).diagnostics.filter((d) => d.severity === 'error');

const codesOf = (source: string) => errorsOf(source).map((d) => d.code);

const STORY =
  'story\n  title: T\n  authors: N\n\ncreate the Barn\n  a room\n\n  A barn.\n\ncreate the player\n  starts in the Barn\n\n  You.\n\n';

describe('extend action (ADR-270 D2/D6)', () => {
  it('an extension with patterns, means, and a constraint compiles clean into grammarExtensions', () => {
    const result = compile(
      `${STORY}extend action taking\n  grammar\n    snag the item\n    swipe the item\n      means manner quietly\n  the item must be reachable\n`,
    );
    expect(result.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    expect(result.ok).toBe(true);
    expect(result.ir!.grammarExtensions).toHaveLength(1);
    const ext = result.ir!.grammarExtensions![0];
    expect(ext.action).toBe('taking');
    expect(ext.patterns).toHaveLength(2);
    expect(ext.patterns[1].means).toEqual([{ key: 'manner', value: 'quietly' }]);
    expect(ext.constraints).toEqual([
      expect.objectContaining({ slot: 'item', requirement: 'reachable' }),
    ]);
    // An extension is not an action definition — nothing joins ir.actions.
    expect(result.ir!.actions.find((a) => a.name === 'taking')).toBeUndefined();
  });

  it('typed slots, greedy slots, and directions are grammar surfaces — legal in an extension', () => {
    const result = compile(
      `${STORY}extend action going\n  grammar\n    scurry the direction\n  directions\n    north or n\n\n` +
        `extend action answering\n  grammar\n    reply the message\n  the message takes the rest of the line\n\n` +
        `extend action unlocking\n  grammar\n    jimmy the target with the tool\n  the tool is an instrument\n`,
    );
    expect(result.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    const exts = result.ir!.grammarExtensions!;
    expect(exts.map((e) => e.action)).toEqual(['going', 'answering', 'unlocking']);
    expect(exts[0].directions).toEqual([{ canonical: 'north', aliases: ['n'] }]);
    expect(exts[1].greedy).toEqual(['message']);
    expect(exts[2].slotTypes).toEqual([{ slot: 'tool', type: 'instrument' }]);
  });

  it.each([
    ['a must requirement', '  the item must be open: not-open\n'],
    ['a refusal line', '  refuse without item: take-what\n'],
    ['otherwise refuse', '  otherwise refuse cant\n'],
    ['a score line', '  score grabbed worth 5\n'],
    ['a phrases block', '  phrases en-US\n    cant:\n      No.\n'],
    ['a body statement', '  phrase taken-msg\n'],
  ])('%s in an extension is analysis.alteration-behavior', (_what, line) => {
    const codes = codesOf(`${STORY}extend action taking\n  grammar\n    snag the item\n${line}`);
    expect(codes).toContain('analysis.alteration-behavior');
  });

  it('an extension with no pattern lines is analysis.empty-extension', () => {
    expect(codesOf(`${STORY}extend action taking\n`)).toContain('analysis.empty-extension');
  });

  it('an unknown requirement word in an extension is analysis.unknown-requirement', () => {
    expect(
      codesOf(`${STORY}extend action taking\n  grammar\n    snag the item\n  the item must be purple\n`),
    ).toContain('analysis.unknown-requirement');
  });

  it('a constraint on a slot no extension pattern carries is analysis.unknown-slot', () => {
    expect(
      codesOf(`${STORY}extend action taking\n  grammar\n    snag the item\n  the target must be reachable\n`),
    ).toContain('analysis.unknown-slot');
  });

  it('`extend` without `action` is parse.extend-action', () => {
    expect(codesOf(`${STORY}extend taking\n  grammar\n    snag the item\n`)).toContain('parse.extend-action');
  });

  it('trailing tokens after the action name are parse.extend-action', () => {
    expect(codesOf(`${STORY}extend action taking now\n  grammar\n    snag the item\n`)).toContain(
      'parse.extend-action',
    );
  });
});

describe('remove from action (ADR-270 D3/D6)', () => {
  it('removal lines compile clean into grammarRemovals, shapes only', () => {
    const result = compile(`${STORY}remove from action taking\n  get the item\n  take up the item\n`);
    expect(result.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    expect(result.ir!.grammarRemovals).toHaveLength(1);
    const removal = result.ir!.grammarRemovals![0];
    expect(removal.action).toBe('taking');
    expect(removal.patterns).toHaveLength(2);
    expect(removal.patterns[0].parts.map((p) => p.kind)).toEqual(['word', 'slot']);
  });

  it('a `means` line in a removal is analysis.removal-shape', () => {
    expect(
      codesOf(`${STORY}remove from action taking\n  get the item\n    means manner quietly\n`),
    ).toContain('analysis.removal-shape');
  });

  it('`→` cardinality in a removal is analysis.removal-shape', () => {
    expect(codesOf(`${STORY}remove from action taking\n  get the item → each reachable item\n`)).toContain(
      'analysis.removal-shape',
    );
  });

  it('an empty removal block is parse.remove-from-action', () => {
    expect(codesOf(`${STORY}remove from action taking\n`)).toContain('parse.remove-from-action');
  });

  it('top-level `remove` without `from action` is parse.remove-from-action with the body-statement pointer', () => {
    const errs = errorsOf(`${STORY}remove the coin\n`);
    expect(errs.map((e) => e.code)).toContain('parse.remove-from-action');
    expect(errs.find((e) => e.code === 'parse.remove-from-action')!.message).toContain('behavior statement');
  });
});

describe('alterations and file kinds (ADR-270 D8)', () => {
  it('a story IR without alterations carries neither field', () => {
    const result = compile(STORY.trimEnd() + '\n');
    expect(result.ir!.grammarExtensions).toBeUndefined();
    expect(result.ir!.grammarRemovals).toBeUndefined();
  });

  it('alteration blocks are rejected in a grammar file (base kind, ADR-269 D8)', () => {
    const codes = codesOf(
      'grammar "standard-en-us"\n\nextend action taking\n  grammar\n    snag the item\n\nremove from action taking\n  get the item\n',
    );
    expect(codes.filter((c) => c === 'analysis.grammar-file-declaration')).toHaveLength(2);
  });
});
