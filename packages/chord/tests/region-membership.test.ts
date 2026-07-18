/**
 * region-membership.test.ts — ADR-236 D1–D3 (ratchet R1/R2): the `region`
 * kind noun, `containing <list>` membership, and nesting through the real
 * parse → analyze pipeline. Flagship fixture: region-nesting.story (a
 * nested region tree). Rejection tests cover every never-guess gate with
 * its specific diagnostic code (AC-3), never just "compile failed".
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { compile, parse, CreateDecl, KIND_NOUNS } from '../src';

const FIXTURE = readFileSync(join(__dirname, 'fixtures', 'region-nesting.story'), 'utf8');

const errorCodes = (source: string) =>
  compile(source).diagnostics.filter((d) => d.severity === 'error').map((d) => d.code);

const story = (body: string) => `story "Regions" by "T"
  id: regions
  version: 0.0.1

${body}
create the player

  You.
`;

describe('region kind noun (ADR-236 D1, ratchet R1)', () => {
  it('joins KIND_NOUNS', () => {
    expect(KIND_NOUNS.has('region')).toBe(true);
  });

  it('parses `a region` as a kind composition with aka and description intact', () => {
    const result = parse(FIXTURE);
    expect(result.diagnostics).toEqual([]);
    const underground = result.ast.declarations.find(
      (d): d is CreateDecl => d.kind === 'create' && d.name.words.join(' ') === 'Underground',
    )!;
    expect(underground.compositions).toMatchObject([{ article: 'a', words: ['region'] }]);
    expect(underground.aka).toEqual(['the deep places']);
    expect(underground.description?.text).toContain('sunless country');
  });
});

describe('containing membership + nesting (ADR-236 D2/D3, ratchet R2)', () => {
  it('lowers resolved member ids onto IREntity.containing (AC-1 IR half)', () => {
    const result = compile(FIXTURE);
    expect(result.diagnostics).toEqual([]);
    expect(result.ok).toBe(true);
    const underground = result.ir.entities.find((e) => e.id === 'underground')!;
    expect(underground.kinds.map((k) => k.name)).toEqual(['region']);
    expect(underground.containing.map((m) => m.id)).toEqual(['mines', 'round-room']);
    const mines = result.ir.entities.find((e) => e.id === 'mines')!;
    expect(mines.containing.map((m) => m.id)).toEqual(['shaft-top', 'coal-seam']);
  });

  it('is additive across several containing lines', () => {
    const result = compile(
      story(`create the Attic
  a room

create the Cellar
  a room

create the House
  a region
  containing the Attic
  containing the Cellar

`),
    );
    expect(result.diagnostics).toEqual([]);
    const house = result.ir.entities.find((e) => e.id === 'house')!;
    expect(house.containing.map((m) => m.id)).toEqual(['attic', 'cellar']);
  });

  it('accepts a plain two-name list joined by `and` alone', () => {
    const result = compile(
      story(`create the Attic
  a room

create the Cellar
  a room

create the House
  a region
  containing the Attic and the Cellar

`),
    );
    expect(result.diagnostics).toEqual([]);
    const house = result.ir.entities.find((e) => e.id === 'house')!;
    expect(house.containing.map((m) => m.id)).toEqual(['attic', 'cellar']);
  });
});

describe('never-guess gates (ADR-236 D2/D3, AC-3)', () => {
  it('unresolved member → analysis.unknown-entity', () => {
    expect(
      errorCodes(
        story(`create the Attic
  a room

create the House
  a region
  containing the Attic, the Nowhere

`),
      ),
    ).toEqual(['analysis.unknown-entity']);
  });

  it('member that is neither room nor region → analysis.region-member-kind naming the kind', () => {
    const source = story(`create the Attic
  a room

create the guard
  a person
  in the Attic

create the House
  a region
  containing the Attic, the guard

`);
    expect(errorCodes(source)).toEqual(['analysis.region-member-kind']);
    const diagnostic = compile(source).diagnostics.find((d) => d.code === 'analysis.region-member-kind')!;
    expect(diagnostic.message).toContain('guard');
    expect(diagnostic.message).toContain('person');
  });

  it('room listed in two regions → analysis.region-double-membership naming the first span', () => {
    const source = story(`create the Hall
  a room

create the East Wing
  a region
  containing the Hall

create the West Wing
  a region
  containing the Hall

`);
    expect(errorCodes(source)).toEqual(['analysis.region-double-membership']);
    const diagnostic = compile(source).diagnostics.find((d) => d.code === 'analysis.region-double-membership')!;
    expect(diagnostic.message).toContain('East Wing');
    expect(diagnostic.message).toMatch(/line \d+/);
  });

  it('room listed in both an ancestor and a descendant → same double-membership class', () => {
    expect(
      errorCodes(
        story(`create the Pit
  a room

create the Underground
  a region
  containing the Mines, the Pit

create the Mines
  a region
  containing the Pit

`),
      ),
    ).toEqual(['analysis.region-double-membership']);
  });

  it('room listed twice in the same region → same double-membership class', () => {
    expect(
      errorCodes(
        story(`create the Hall
  a room

create the House
  a region
  containing the Hall, the Hall

`),
      ),
    ).toEqual(['analysis.region-double-membership']);
  });

  it('memberless region → analysis.region-memberless (hard error, no warning tier)', () => {
    expect(
      errorCodes(
        story(`create the Hall
  a room

create the Empty Quarter
  a region

  A region of nothing at all.

`),
      ),
    ).toEqual(['analysis.region-memberless']);
  });

  it('region contained by two parents → analysis.region-two-parents', () => {
    expect(
      errorCodes(
        story(`create the Cell
  a room

create the Mines
  a region
  containing the Cell

create the Underground
  a region
  containing the Mines

create the Caverns
  a region
  containing the Mines

`),
      ),
    ).toEqual(['analysis.region-two-parents']);
  });

  it('containment cycle → analysis.region-cycle naming the cycle', () => {
    const source = story(`create the A Side
  a region
  containing the B Side

create the B Side
  a region
  containing the A Side

`);
    expect(errorCodes(source)).toEqual(['analysis.region-cycle']);
    const diagnostic = compile(source).diagnostics.find((d) => d.code === 'analysis.region-cycle')!;
    expect(diagnostic.message).toContain('A Side');
    expect(diagnostic.message).toContain('B Side');
  });

  it('self-containment is the one-region cycle', () => {
    expect(
      errorCodes(
        story(`create the Ouroboros
  a region
  containing the Ouroboros

`),
      ),
    ).toEqual(['analysis.region-cycle']);
  });

  it('placement line on a region block → analysis.region-placement', () => {
    expect(
      errorCodes(
        story(`create the Hall
  a room

create the House
  a region
  containing the Hall
  in the Hall

`),
      ),
    ).toEqual(['analysis.region-placement']);
  });

  it('`starts in` placement on a region block → the same placement gate', () => {
    expect(
      errorCodes(
        story(`create the Hall
  a room

create the House
  a region
  containing the Hall
  starts in the Hall

`),
      ),
    ).toEqual(['analysis.region-placement']);
  });

  it('containing on a non-region block → analysis.region-containing-host', () => {
    expect(
      errorCodes(
        story(`create the Hall
  a room

create the crate
  a container
  containing the Hall
  in the Hall

`),
      ),
    ).toEqual(['analysis.region-containing-host']);
  });
});
