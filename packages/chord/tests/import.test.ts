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

/** Minimal valid main story with `importLine` fixed at line 7. */
const mainWith = (importLine: string) =>
  [
    'story', //              1
    '  id: x', //            2
    '  title: X', //         3
    '  authors:', //         4
    '    N', //              5
    '', //                   6
    importLine, //          7
    '', //                   8
    'create Alex', //        9
    '  a person', //        10
    '  playable', //        11
    '', //                  12
    '  You.', //            13
    '', //                  14
    'before the game starts', // 15
    '  change the player to Alex', // 16
    'end before', //        17
    '', //                  18
  ].join('\n');

describe('ADR-251 Acceptance — worked example', () => {
  it('splices a multi-declaration fragment and resolves a cross-file reference (D4)', () => {
    const main = [
      'story',
      '  id: harbor',
      '  title: Harbor',
      '  authors:',
      '    N',
      '',
      'create the Lighthouse',
      '  a room',
      '',
      '  A tall lighthouse.',
      '',
      'import "regions/harbor"',
      '',
      'create Alex',
      '  a person',
      '  playable',
      '  starts in the Lighthouse',
      '',
      '  You.',
      '',
      'before the game starts',
      '  change the player to Alex',
      'end before',
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
    expect(d.span.line).toBe(7); //             the import line in the MAIN file
    expect(d.message.startsWith('[')).toBe(false); // not a fragment-prefixed diagnostic
  });

  it('fragment story header → analysis.import-fragment-story at the fragment span', () => {
    const frag = 'story\n  title: Nope\n  authors:\n    Z\n  id: nope\n';
    const d = byCode(mainWith('import "frag"'), (n) => (n === 'frag.chord' ? frag : null))['analysis.import-fragment-story'];
    expect(d).toBeDefined();
    expect(d.message).toContain('[frag.chord]');
    expect(d.span.line).toBe(1); //             the fragment's own line 1 (its story header)
  });

  it('import cycle → analysis.import-cycle at the import line in the file that closes the loop', () => {
    const frags: Record<string, string> = {
      'a.chord': 'create the shed\n  a room\n\n  A shed.\n\nimport "b"\n',
      'b.chord': 'import "a"\n',
    };
    const d = byCode(mainWith('import "a"'), (n) => frags[n] ?? null)['analysis.import-cycle'];
    expect(d).toBeDefined();
    expect(d.message).toContain('a.chord → b.chord → a.chord');
    expect(d.span.file).toBe('b.chord');
    expect(d.span.line).toBe(1); //             the `import "a"` line WITHIN b.chord
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
    expect(d.span.line).toBe(7); //             the import line in the MAIN file
  });
});

describe('ADR-251 D6 (amended 2026-08-22) — spliced spans carry the fragment file (GH #301)', () => {
  /** Fragment whose room fires an undefined phrase at its line 6 — an ANALYZER error, raised post-splice. */
  const fragment = [
    'create the Market', //      1
    '  a room', //               2
    '', //                       3
    '  Stalls.', //              4
    '', //                       5
    '  after the player entering', //    6
    '    phrase no-such-key', // 7
    '  end after', //            8
    '',
  ].join('\n');
  const resolver: Resolver = (name) => (name === 'regions/market.chord' ? fragment : null);

  it('an analyzer diagnostic inside a fragment names the fragment file and its own line', () => {
    const diags = errorsOf(mainWith('import "regions/market"'), resolver);
    const missing = diags.find((d) => d.code === 'analysis.missing-phrase');
    expect(missing).toBeDefined();
    expect(missing!.span.file).toBe('regions/market.chord');
    expect(missing!.span.line).toBe(7);
  });

  it('in one compile, the fragment error names the fragment and the main-file error names no file', () => {
    // Main story with its OWN missing phrase at line 13 of the main file.
    const main = [
      'story', //                 1
      '  id: x', //               2
      '  title: X', //            3
      '  authors:', //            4
      '    N', //                 5
      '', //                      6
      'import "regions/market"', // 7
      '', //                      8
      'create Alex', //           9
      '  a person', //           10
      '  playable', //           11
      '', //                     12
      '  You.', //               13
      '', //                     14
      '  after the player entering', // 15
      '    phrase main-missing', //     16
      '  end after', //          17
      '', //                     18
      'before the game starts', // 19
      '  change the player to Alex', // 20
      'end before', //           21
      '',
    ].join('\n');
    const missing = errorsOf(main, resolver).filter((d) => d.code === 'analysis.missing-phrase');
    expect(missing).toHaveLength(2);
    const inFragment = missing.find((d) => d.message.includes('no-such-key'));
    const inMain = missing.find((d) => d.message.includes('main-missing'));
    expect(inFragment?.span).toMatchObject({ file: 'regions/market.chord', line: 7 });
    expect(inMain?.span.file).toBeUndefined();
    expect(inMain?.span.line).toBe(16);
  });

  it('a fragment PARSE diagnostic also carries the fragment file', () => {
    const broken: Resolver = (name) => (name === 'bad.chord' ? 'xyzzy not a declaration\n' : null);
    const content = byCode(mainWith('import "bad"'), broken)['analysis.import-fragment-content'];
    expect(content.span.file).toBe('bad.chord');
  });

  it('the unresolved-import diagnostic stays on the main file (no file on its span)', () => {
    const d = byCode(mainWith('import "nowhere"'), () => null)['analysis.import-unresolved'];
    expect(d.span.file).toBeUndefined();
    expect(d.span.line).toBe(7);
  });
});

describe('ADR-251 D5 (amended 2026-08-22) — imports nest (GH #302)', () => {
  const room = (name: string, extra = '') => `create ${name}\n  a room\n\n  ${name}.\n${extra}`;
  const mk = (frags: Record<string, string>): Resolver => (n) => frags[n] ?? null;

  it('a fragment\'s own import is spliced: declarations two levels down reach the IR', () => {
    const r = compile(mainWith('import "regions/market"'), {
      importResolver: mk({
        'regions/market.chord': room('the Market', '\nimport "npcs/teisha"\n'),
        'npcs/teisha.chord': room('the Silk Tent'),
      }),
    });
    // `mainWith`'s player is `a room` (analysis.player-kind) — filter to import diagnostics.
    expect(r.diagnostics.filter((d) => d.code.startsWith('analysis.import-'))).toEqual([]);
    const ids = r.ir.entities.map((e) => e.id);
    expect(ids).toContain('market');
    expect(ids).toContain('silk-tent');
  });

  it('paths inside a fragment are story-rooted: the resolver sees the same string it would from the main file', () => {
    const asked: string[] = [];
    compile(mainWith('import "regions/market"'), {
      importResolver: (n) => {
        asked.push(n);
        if (n === 'regions/market.chord') return 'import "npcs/teisha"\n';
        if (n === 'npcs/teisha.chord') return room('the Silk Tent');
        return null;
      },
    });
    expect(asked).toEqual(['regions/market.chord', 'npcs/teisha.chord']);
  });

  it('paste order is depth-first at each import line (D4 unchanged)', () => {
    const r = compile(mainWith('import "outer"'), {
      importResolver: mk({
        'outer.chord': room('the First') + '\nimport "inner"\n\n' + room('the Third'),
        'inner.chord': room('the Second'),
      }),
    });
    const order = r.ir.entities.map((e) => e.id).filter((id) => id !== 'player');
    expect(order).toEqual(['first', 'second', 'third', 'alex']);
  });

  it('a span two levels down names ITS file, not the fragment that imported it', () => {
    const diags = errorsOf(mainWith('import "regions/market"'), mk({
      'regions/market.chord': room('the Market', '\nimport "npcs/teisha"\n'),
      'npcs/teisha.chord': room('the Silk Tent', '\n  after the player entering\n    phrase no-such-key\n  end after\n'),
    }));
    const missing = diags.find((d) => d.code === 'analysis.missing-phrase');
    expect(missing).toBeDefined();
    expect(missing!.span.file).toBe('npcs/teisha.chord');
    expect(missing!.span.line).toBe(7);
  });

  it('after a cycle is dropped the rest of the splice continues', () => {
    const r = compile(mainWith('import "a"'), {
      importResolver: mk({
        'a.chord': 'import "b"\n\n' + room('the Shed'),
        'b.chord': 'import "a"\n\n' + room('the Barn'),
      }),
    });
    const codes = r.diagnostics.filter((d) => d.code.startsWith('analysis.import-')).map((d) => d.code);
    expect(codes).toEqual(['analysis.import-cycle']);
    const ids = r.ir.entities.map((e) => e.id);
    expect(ids).toContain('shed');
    expect(ids).toContain('barn');
  });

  it('a self-import is the one-element cycle', () => {
    const d = byCode(mainWith('import "a"'), mk({ 'a.chord': 'import "a"\n' }))['analysis.import-cycle'];
    expect(d).toBeDefined();
    expect(d.message).toContain('a.chord → a.chord');
  });

  it('a diamond is pasted twice and collides as an ordinary duplicate, not an import diagnostic', () => {
    const r = compile(mainWith('import "left"\nimport "right"'), {
      importResolver: mk({
        'left.chord': 'import "shared"\n',
        'right.chord': 'import "shared"\n',
        'shared.chord': room('the Well'),
      }),
    });
    const codes = r.diagnostics.filter((d) => d.severity === 'error').map((d) => d.code);
    expect(codes.some((c) => c.startsWith('analysis.import-'))).toBe(false);
    expect(codes).toContain('analysis.duplicate-entity');
  });

  it('a fragment carrying a story header is rejected wherever it is reached (the main file is never importable)', () => {
    const d = byCode(mainWith('import "outer"'), mk({
      'outer.chord': 'import "main-copy"\n',
      'main-copy.chord': mainWith(''),
    }))['analysis.import-fragment-story'];
    expect(d).toBeDefined();
    expect(d.span.file).toBe('main-copy.chord');
  });
});
