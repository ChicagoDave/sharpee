/**
 * zoo-surfaces-phase2.test.ts — Z2 chord half (chord-zoo-surfaces Phase 2,
 * 2026-07-14): the trailing `while` header gate on `define phrase` (CP1' →
 * `IRPhrase.condition`), and the never-guess description-marker diagnostics
 * (ADR-211): AC-3 bare-fragment load error with its fix-it, the clause-site
 * terminator lint, and the verbatim-at-marker load error. `nothing` is the
 * explicit empty variant and is exempt from all of them.
 */
import { describe, expect, it } from 'vitest';
import { compile } from '../src';

const HEADER = 'story "T" by "N"\n  id: t\n  version: 0.0.1\n\n';

/** A lab room whose description carries `{frag}` at a CLAUSE site. */
const CLAUSE_ROOM = `create the Lab
  a room

  Shelves of glassware line the walls{frag}. A door leads north.

create the player
  in the Lab

  You.

`;

function diagnosticsOf(source: string) {
  return compile(source).diagnostics;
}

describe('Z2: trailing `while` on the define-phrase header (CP1\')', () => {
  it('parses and resolves into IRPhrase.condition', () => {
    const result = compile(
      `${HEADER}${CLAUSE_ROOM}create the cat\n  in the Lab\n\n  A cat.\n\ndefine phrase frag, cycling while the cat is here\n  and a cat glares from the top shelf\nor\n  nothing\nend phrase\n`,
    );
    expect(result.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    const frag = result.ir.phrases.locales['en-US']['frag'];
    expect(frag.condition).toMatchObject({
      kind: 'predicate',
      pred: 'is-here',
      subject: { kind: 'entity', id: 'cat' },
    });
  });

  it('an ungated phrase carries no condition field', () => {
    const result = compile(
      `${HEADER}${CLAUSE_ROOM}define phrase frag, cycling\n  and dust motes drift in the light\nor\n  nothing\nend phrase\n`,
    );
    expect(result.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    expect(result.ir.phrases.locales['en-US']['frag'].condition).toBeUndefined();
  });

  it('the gate may reference an entity declared after the phrase (pass-2 resolution)', () => {
    const result = compile(
      `${HEADER}${CLAUSE_ROOM}define phrase frag, cycling while the owl is here\n  and an owl blinks slowly\nor\n  nothing\nend phrase\n\ncreate the owl\n  in the Lab\n\n  An owl.\n`,
    );
    expect(result.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    expect(result.ir.phrases.locales['en-US']['frag'].condition).toMatchObject({
      kind: 'predicate',
      pred: 'is-here',
      subject: { kind: 'entity', id: 'owl' },
    });
  });
});

describe('Z2: description-marker diagnostics (ADR-211 never-guess)', () => {
  it('AC-3: a separator-led variant is a load error with the bare-fragment fix-it', () => {
    const diags = diagnosticsOf(
      `${HEADER}${CLAUSE_ROOM}define phrase frag, cycling\n  , and a spinning rack of pins wobbles by\nor\n  nothing\nend phrase\n`,
    );
    const errors = diags.filter((d) => d.severity === 'error');
    expect(errors.map((e) => e.code)).toContain('analysis.fragment-not-bare');
    const bare = errors.find((e) => e.code === 'analysis.fragment-not-bare')!;
    expect(bare.message).toContain('write the fragment bare');
    expect(bare.message).toContain('platform-owned');
  });

  it('AC-3 fires once per phrase, not once per site', () => {
    const twoSites = `create the Lab
  a room
  first time
    First light spills over the benches{frag}. Quiet.

  Shelves of glassware line the walls{frag}. A door leads north.

create the player
  in the Lab

  You.

`;
    const diags = diagnosticsOf(
      `${HEADER}${twoSites}define phrase frag, cycling\n  , wrongly led\nor\n  nothing\nend phrase\n`,
    );
    expect(diags.filter((d) => d.code === 'analysis.fragment-not-bare')).toHaveLength(1);
  });

  it('a clause-site fragment ending in a sentence terminator is a lint warning', () => {
    const diags = diagnosticsOf(
      `${HEADER}${CLAUSE_ROOM}define phrase frag, cycling\n  and the kettle is boiling.\nor\n  nothing\nend phrase\n`,
    );
    expect(diags.filter((d) => d.severity === 'error')).toEqual([]);
    const warnings = diags.filter((d) => d.severity === 'warning');
    expect(warnings.map((w) => w.code)).toContain('analysis.fragment-terminator');
  });

  it('the same terminator variant at a SENTENCE site draws no lint', () => {
    const sentenceRoom = `create the Lab
  a room

  Shelves of glassware line the walls. {frag} A door leads north.

create the player
  in the Lab

  You.

`;
    const diags = diagnosticsOf(
      `${HEADER}${sentenceRoom}define phrase frag, cycling\n  The kettle is boiling.\nor\n  nothing\nend phrase\n`,
    );
    expect(diags.filter((d) => d.code === 'analysis.fragment-terminator')).toEqual([]);
    expect(diags.filter((d) => d.severity === 'error')).toEqual([]);
  });

  it('a `verbatim` phrase at a description marker is a load error', () => {
    const diags = diagnosticsOf(
      `${HEADER}${CLAUSE_ROOM}define phrase frag, verbatim\n  ASCII ART\nend phrase\n`,
    );
    expect(diags.filter((d) => d.severity === 'error').map((e) => e.code)).toContain(
      'analysis.verbatim-marker',
    );
  });

  it('`nothing` variants are exempt from the bare-fragment error', () => {
    const diags = diagnosticsOf(
      `${HEADER}${CLAUSE_ROOM}define phrase frag, cycling\n  and all is well\nor\n  nothing\nend phrase\n`,
    );
    expect(diags.filter((d) => d.severity === 'error')).toEqual([]);
  });

  it('a single-variant plain phrase at a marker compiles clean (string-entry shape is the loader\'s)', () => {
    const diags = diagnosticsOf(
      `${HEADER}${CLAUSE_ROOM}define phrase frag\n  and a lone plant wilts on the sill\nend phrase\n`,
    );
    expect(diags.filter((d) => d.severity === 'error')).toEqual([]);
  });

  it('a marker on a NON-room description is not a snippet site — no fragment diagnostics', () => {
    const itemMarker = `create the Lab
  a room

  A lab.

create the player
  in the Lab

  You.

create the jar
  in the Lab

  A jar of oddments{frag}. Best not to shake it.

`;
    const diags = diagnosticsOf(
      `${HEADER}${itemMarker}define phrase frag, cycling\n  , wrongly led\nor\n  nothing\nend phrase\n`,
    );
    expect(diags.filter((d) => d.code === 'analysis.fragment-not-bare')).toEqual([]);
  });
});
