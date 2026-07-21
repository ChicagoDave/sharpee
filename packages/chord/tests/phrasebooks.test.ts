/**
 * phrasebooks.test.ts — ADR-250 Phase 4 (compile side): `define phrasebook`
 * block grammar, `use phrasebook <name> [while <cond>]` header lines,
 * `import phrasebook "<file>"` host-resolved splicing, IR lowering in
 * arbitration order, and every ADR-250 D7 compile diagnostic. Covers
 * AC-1/AC-2 plus the AC-5 compile half (manifest seam).
 */
import { afterEach, describe, expect, it } from 'vitest';
import { compile, PHRASEBOOK_REGISTRY } from '../src';
import type { IRPhrasebook } from '../src';

const errorCodes = (source: string, options?: Parameters<typeof compile>[1]) =>
  compile(source, options).diagnostics.filter((d) => d.severity === 'error').map((d) => d.code);
const warningCodes = (source: string) =>
  compile(source).diagnostics.filter((d) => d.severity === 'warning').map((d) => d.code);

/** Minimal valid story; `header` splices into the story header body, `mid` between the creates. */
const story = (mid: string, header = '') => `story "T" by "A"
  id: t
  version: 0.0.1
  states: evening, midnight
${header}
create the Cave
  a room

  A cave.

${mid}create the player
  starts in the Cave

  You.
`;

/** A book whose key is referenced nowhere — pure declaration tests. */
const WINTER_BOOK = `define phrasebook winter while midnight
  cold-returns, first-time:
    The cold finds you.
  or
    The cold again.

  hearth-call:
    The fire is still lit.
end phrasebook

`;

afterEach(() => {
  PHRASEBOOK_REGISTRY.clear();
});

describe('define phrasebook (ADR-250 D1/D3)', () => {
  it('compiles a predicated book and a default book; IR carries arbitration order', () => {
    const src = story(`${WINTER_BOOK}define phrasebook springtime
  cold-returns:
    A last thread of chill.
end phrasebook

`);
    const result = compile(src);
    expect(result.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    const books = result.ir.phrasebooks;
    expect(books.map((b: IRPhrasebook) => b.name)).toEqual(['winter', 'springtime']);
    expect(books[0].source).toBe('define');
    expect(books[0].condition).not.toBeNull();
    expect(books[0].entries?.['cold-returns'].strategy).toBe('first-time');
    expect(books[0].entries?.['cold-returns'].variants).toHaveLength(2);
    expect(books[0].entries?.['hearth-call'].strategy).toBeNull();
    // predicate-less = the default phrasebook (David, 2026-07-21)
    expect(books[1].condition).toBeNull();
    expect(books[1].entries?.['cold-returns'].variants).toHaveLength(1);
  });

  it('a plain story IR gains phrasebooks: []', () => {
    expect(compile(story('')).ir.phrasebooks).toEqual([]);
  });

  it('the same key across two books is legal (competing definitions are the point)', () => {
    const src = story(`${WINTER_BOOK}define phrasebook other
  cold-returns:
    Different voice.
end phrasebook

`);
    expect(errorCodes(src)).toEqual([]);
  });

  it('entry-level while raises analysis.phrasebook-entry-gate', () => {
    const src = story('define phrasebook moody\n  cold-returns while midnight:\n    Text.\nend phrasebook\n\n');
    expect(errorCodes(src)).toContain('analysis.phrasebook-entry-gate');
  });

  it('a dotted platform ID as an entry key raises analysis.phrasebook-dotted-key', () => {
    const src = story('define phrasebook noir\n  if.action.taking.taken:\n    Snatched.\nend phrasebook\n\n');
    expect(errorCodes(src)).toContain('analysis.phrasebook-dotted-key');
  });

  it('a reserved channel key raises analysis.phrasebook-reserved-key', () => {
    const src = story('define phrasebook sneaky\n  present:\n    Lurking.\nend phrasebook\n\n');
    expect(errorCodes(src)).toContain('analysis.phrasebook-reserved-key');
  });

  it('the same key twice in ONE book raises analysis.phrasebook-duplicate-key', () => {
    const src = story('define phrasebook echo\n  cold-returns:\n    One.\n\n  cold-returns:\n    Two.\nend phrasebook\n\n');
    expect(errorCodes(src)).toContain('analysis.phrasebook-duplicate-key');
  });

  it('two books with the same name raise analysis.duplicate-phrasebook', () => {
    const src = story(`${WINTER_BOOK}define phrasebook winter
  hearth-call:
    Again.
end phrasebook

`);
    expect(errorCodes(src)).toContain('analysis.duplicate-phrasebook');
  });

  it('a malformed header raises parse.phrasebook-header', () => {
    expect(errorCodes(story('define phrasebook\n  k:\n    T.\nend phrasebook\n\n'))).toContain('parse.phrasebook-header');
    expect(errorCodes(story('define phrasebook winter junk here\n  k:\n    T.\nend phrasebook\n\n'))).toContain('parse.phrasebook-header');
  });

  it('a missing end phrasebook raises parse.phrasebook-end', () => {
    expect(errorCodes(story('define phrasebook drifty\n  cold-returns:\n    Text.\n\n'))).toContain('parse.phrasebook-end');
  });

  it('a ## comment inside a book raises parse.comment-inside-block (ADR-249)', () => {
    const src = story('define phrasebook noted\n  cold-returns:\n    Text.\n\n## margin note\n\nend phrasebook\n\n');
    expect(errorCodes(src)).toContain('parse.comment-inside-block');
  });

  it('an unbound marker in a book entry reports with the book-qualified label', () => {
    const src = story('define phrasebook marky\n  cold-returns:\n    See {no-such-producer}.\nend phrasebook\n\n');
    const diags = compile(src).diagnostics;
    const marker = diags.find((d) => d.code === 'analysis.unbound-marker');
    expect(marker?.message).toContain('marky.cold-returns');
  });
});

describe('book coverage vs the missing-phrase gate (ADR-250 D4.6)', () => {
  const reference = (books: string) =>
    story(`${books}create the lamp
  a thing, portable
  starts in the Cave

  A lamp.

  on taking it
    phrase cold-returns
  end on

`);

  it('a key defined only in a book passes the missing-phrase gate', () => {
    const src = reference('define phrasebook base\n  cold-returns:\n    Text.\nend phrasebook\n\n');
    expect(errorCodes(src)).toEqual([]);
    expect(warningCodes(src)).toEqual([]);
  });

  it('predicated-only coverage warns analysis.phrasebook-partial-coverage', () => {
    const src = reference(WINTER_BOOK);
    expect(errorCodes(src)).toEqual([]);
    expect(warningCodes(src)).toContain('analysis.phrasebook-partial-coverage');
  });

  it('an unreferenced, uncovered key still errors analysis.missing-phrase', () => {
    const src = story('create the lamp\n  a thing, portable\n  starts in the Cave\n\n  A lamp.\n\n  on taking it\n    phrase never-declared\n  end on\n\n');
    expect(errorCodes(src)).toContain('analysis.missing-phrase');
  });
});

describe('use phrasebook (ADR-250 D2/D3)', () => {
  it('a registered book activates with a use-site predicate; stacking order = header order', () => {
    PHRASEBOOK_REGISTRY.set('candlewick-gothic', { name: 'candlewick-gothic', keys: ['cold-returns'] });
    PHRASEBOOK_REGISTRY.set('plain-country', { name: 'plain-country', keys: ['cold-returns'] });
    const src = story(WINTER_BOOK, '  use phrasebook candlewick-gothic while midnight\n  use phrasebook plain-country');
    const result = compile(src);
    expect(result.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    const books = result.ir.phrasebooks;
    expect(books.map((b: IRPhrasebook) => [b.name, b.source])).toEqual([
      ['candlewick-gothic', 'use'],
      ['plain-country', 'use'],
      ['winter', 'define'],
    ]);
    expect(books[0].condition).not.toBeNull();
    expect(books[0].entries).toBeUndefined();
    expect(books[1].condition).toBeNull();
  });

  it('an unknown book raises analysis.unknown-phrasebook with a nearest-match suggestion', () => {
    PHRASEBOOK_REGISTRY.set('plain-country', { name: 'plain-country', keys: [] });
    const src = story('', '  use phrasebook plain-countre');
    const diags = compile(src).diagnostics.filter((d) => d.code === 'analysis.unknown-phrasebook');
    expect(diags).toHaveLength(1);
    expect(diags[0].message).toContain('plain-country');
  });

  it('a used-book key satisfies the missing-phrase gate via the manifest key list', () => {
    PHRASEBOOK_REGISTRY.set('voices', { name: 'voices', keys: ['cold-returns'] });
    const src = story('create the lamp\n  a thing, portable\n  starts in the Cave\n\n  A lamp.\n\n  on taking it\n    phrase cold-returns\n  end on\n\n', '  use phrasebook voices');
    expect(errorCodes(src)).toEqual([]);
  });

  it('use + define sharing a name raises analysis.duplicate-phrasebook', () => {
    PHRASEBOOK_REGISTRY.set('winter', { name: 'winter', keys: [] });
    const src = story(WINTER_BOOK, '  use phrasebook winter');
    expect(errorCodes(src)).toContain('analysis.duplicate-phrasebook');
  });

  it('a malformed use phrasebook line raises parse.use-phrasebook', () => {
    expect(errorCodes(story('', '  use phrasebook'))).toContain('parse.use-phrasebook');
    expect(errorCodes(story('', '  use phrasebook a-book trailing junk'))).toContain('parse.use-phrasebook');
  });

  it('plain one-word use <extension> grammar is untouched', () => {
    expect(errorCodes(story('', '  use state-machines'))).toEqual([]);
    expect(errorCodes(story('', '  use combat extra'))).toContain('parse.use');
  });
});

describe('import phrasebook (ADR-250 D2)', () => {
  const FRAGMENT = '## the winter voice, in its own file\n\ndefine phrasebook winter\n  cold-returns:\n    The cold finds you.\nend phrasebook\n';

  it('splices the fragment at the import position', () => {
    const src = story('import phrasebook "voices/winter.story"\n\ndefine phrasebook base\n  hearth-call:\n    Warmth.\nend phrasebook\n\n');
    const result = compile(src, { importResolver: (path) => (path === 'voices/winter.story' ? FRAGMENT : null) });
    expect(result.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    expect(result.ir.phrasebooks.map((b: IRPhrasebook) => b.name)).toEqual(['winter', 'base']);
    expect(result.ir.phrasebooks[0].source).toBe('define');
  });

  it('no resolver raises analysis.import-unresolved', () => {
    expect(errorCodes(story('import phrasebook "voices/winter.story"\n\n'))).toContain('analysis.import-unresolved');
  });

  it('a resolver miss raises analysis.import-unresolved', () => {
    expect(errorCodes(story('import phrasebook "gone.story"\n\n'), { importResolver: () => null })).toContain('analysis.import-unresolved');
  });

  it('non-phrasebook fragment content raises analysis.import-fragment-content', () => {
    const bad = 'create the Shed\n  a room\n\n  A shed.\n';
    expect(errorCodes(story('import phrasebook "bad.story"\n\n'), { importResolver: () => bad })).toContain('analysis.import-fragment-content');
  });

  it('a fragment with a story header raises analysis.import-fragment-content', () => {
    const bad = 'story "Nope" by "X"\n  id: nope\n';
    expect(errorCodes(story('import phrasebook "bad.story"\n\n'), { importResolver: () => bad })).toContain('analysis.import-fragment-content');
  });

  it('a non-.story path raises parse.import-form', () => {
    expect(errorCodes(story('import phrasebook "winter.txt"\n\n'))).toContain('parse.import-form');
  });

  it('bare import "<file>" is reserved and raises parse.import-form', () => {
    expect(errorCodes(story('import "winter.story"\n\n'))).toContain('parse.import-form');
  });
});
