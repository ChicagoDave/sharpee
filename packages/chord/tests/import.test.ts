/**
 * import.test.ts — ADR-251 Acceptance gate for generalized `import "<file>"`.
 *
 * The worked example (a main `.story` splicing a multi-declaration fragment,
 * including a cross-file reference — proving D4's "an import is a paste, one
 * namespace") and every D6 rejection case asserted on BOTH the diagnostic
 * code AND its span attribution: fragment span for the `-fragment-*` family,
 * main-file import-line span for `-unresolved` / `parse.import-form`. Uses an
 * in-memory resolver keyed on the compiler-appended `<name>.chord`; the real
 * fs and browser hosts are covered by @sharpee/devkit's REAL-PATH suites.
 */
import { describe, expect, it } from 'vitest';
import { compile } from '../src';

type Resolver = (name: string) => string | null;

const errorsOf = (src: string, resolver?: Resolver) =>
  compile(src, resolver ? { importResolver: resolver } : undefined).diagnostics.filter((d) => d.severity === 'error');
const byCode = (src: string, resolver?: Resolver) =>
  Object.fromEntries(errorsOf(src, resolver).map((d) => [d.code, d] as const));

/** Minimal valid main story with `importLine` fixed at line 5. */
const mainWith = (importLine: string) =>
  [
    'story "X" by "Y"', //   1
    '  id: x', //            2
    '  version: 0.0.1', //   3
    '', //                   4
    importLine, //          5
    '', //                   6
    'create the player', //  7
    '  a room', //           8
    '', //                   9
    '  You.', //            10
    '', //                  11
  ].join('\n');

describe('ADR-251 Acceptance — worked example', () => {
  it('splices a multi-declaration fragment and resolves a cross-file reference (D4)', () => {
    const main = [
      'story "Harbor" by "T"',
      '  id: harbor',
      '  version: 0.0.1',
      '',
      'create the Lighthouse',
      '  a room',
      '',
      '  A tall lighthouse.',
      '',
      'import "regions/harbor"',
      '',
      'create the player',
      '  starts in the Lighthouse',
      '',
      '  You.',
      '',
    ].join('\n');
    // Two creates + a cross-file reference: the gull is placed in the
    // Lighthouse, a ROOM declared in the MAIN file (D4 one namespace).
    const fragment = [
      'create the pier',
      '  a room',
      '',
      '  A wooden pier.',
      '',
      'create the brass gull',
      '  in the Lighthouse',
      '',
      '  A brass gull perches here.',
      '',
    ].join('\n');
    const result = compile(main, { importResolver: (n) => (n === 'regions/harbor.chord' ? fragment : null) });

    // A clean compile is itself the cross-reference proof: an unresolved
    // `in the Lighthouse` would raise analysis.unknown-entity.
    expect(result.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    const ids = result.ir.entities.map((e) => e.id);
    expect(ids).toContain('pier'); //          spliced from the fragment
    expect(ids).toContain('brass-gull'); //     spliced from the fragment
    expect(ids).toContain('lighthouse'); //     from the main file
  });
});

describe('ADR-251 Acceptance — D6 rejection cases with span attribution', () => {
  it('missing file → analysis.import-unresolved at the main-file import line', () => {
    const d = byCode(mainWith('import "gone"'), () => null)['analysis.import-unresolved'];
    expect(d).toBeDefined();
    expect(d.span.line).toBe(5); //             the import line in the MAIN file
    expect(d.message.startsWith('[')).toBe(false); // not a fragment-prefixed diagnostic
  });

  it('fragment story header → analysis.import-fragment-story at the fragment span', () => {
    const frag = 'story "Nope" by "Z"\n  id: nope\n';
    const d = byCode(mainWith('import "frag"'), (n) => (n === 'frag.chord' ? frag : null))['analysis.import-fragment-story'];
    expect(d).toBeDefined();
    expect(d.message).toContain('[frag.chord]');
    expect(d.span.line).toBe(1); //             the fragment's own line 1 (its story header)
  });

  it('nested import → analysis.import-fragment-nested at the fragment span', () => {
    const frag = 'create the shed\n  a room\n\n  A shed.\n\nimport "deeper"\n';
    const d = byCode(mainWith('import "frag"'), (n) => (n === 'frag.chord' ? frag : null))['analysis.import-fragment-nested'];
    expect(d).toBeDefined();
    expect(d.message).toContain('[frag.chord]');
    expect(d.span.line).toBe(6); //             the nested `import "deeper"` line WITHIN the fragment
  });

  it('malformed fragment → analysis.import-fragment-content at the fragment span', () => {
    const frag = 'xyzzy not a declaration\n';
    const d = byCode(mainWith('import "frag"'), (n) => (n === 'frag.chord' ? frag : null))['analysis.import-fragment-content'];
    expect(d).toBeDefined();
    expect(d.message).toContain('[frag.chord]');
    expect(d.span.line).toBe(1); //             the offending fragment line
  });

  it('import without a file string → parse.import-form at the main-file import line', () => {
    const d = byCode(mainWith('import'))['parse.import-form'];
    expect(d).toBeDefined();
    expect(d.span.line).toBe(5); //             the import line in the MAIN file
  });
});
