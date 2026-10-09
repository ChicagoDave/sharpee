/**
 * region-membership.test.ts — the `region` kind noun (ADR-236 D1) and region
 * membership as ADR-360 writes it: a room joins a region with an `in the
 * <region>` line in its own block (D4), `containing` is removed and regions
 * do not nest (D5). Through the real parse → analyze pipeline. Flagship
 * fixture: region-nesting.story, two flat regions (the file keeps its old
 * name). Every gate is asserted by its own diagnostic code, never just
 * "compile failed".
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { compile, parse, CreateDecl, KIND_NOUNS } from '../src';

const FIXTURE = readFileSync(join(__dirname, 'fixtures', 'region-nesting.story'), 'utf8');

const errorCodes = (source: string) =>
  compile(source).diagnostics.filter((d) => d.severity === 'error').map((d) => d.code);

const story = (body: string) => `story
  title: Regions
  authors:
    T
  id: regions
  story-version: 0.0.1

${body}
create Alex
  a person
  playable

  You.

before the game starts
  change the player to Alex
end before

`;

describe('region kind noun (ADR-236 D1, ratchet R1)', () => {
  it('joins KIND_NOUNS', () => {
    expect(KIND_NOUNS.has('region')).toBe(true);
  });

  it('parses `a region` as a kind composition with aka and description intact', () => {
    const result = parse(FIXTURE);
    expect(result.diagnostics.filter((d) => d.code !== 'analysis.missing-ifid')).toEqual([]);
    const underground = result.ast.declarations.find(
      (d): d is CreateDecl => d.kind === 'create' && d.name.words.join(' ') === 'Underground',
    )!;
    expect(underground.compositions).toMatchObject([{ article: 'a', words: ['region'] }]);
    expect(underground.aka).toEqual(['the deep places']);
    expect(underground.description?.text).toContain('sunless country');
  });
});

describe('`in the <region>` membership (ADR-360 D4)', () => {
  it('collects each room naming a region onto that region, and the room keeps no placement', () => {
    const result = compile(FIXTURE);
    expect(result.diagnostics.filter((d) => d.code !== 'analysis.missing-ifid')).toEqual([]);
    expect(result.ok).toBe(true);
    const byId = (id: string) => result.ir.entities.find((e) => e.id === id)!;
    expect(byId('underground').containing.map((m) => m.id)).toEqual(['round-room']);
    expect(byId('mines').containing.map((m) => m.id)).toEqual(['shaft-top', 'coal-seam']);
    for (const id of ['round-room', 'shaft-top', 'coal-seam']) expect(byId(id).placement).toBeNull();
  });

  it('a member may be declared before its region', () => {
    const result = compile(
      story(`create the Attic
  a room
  in the House

  A dusty attic.

create the House
  a region

`),
    );
    expect(result.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    expect(result.ir.entities.find((e) => e.id === 'house')!.containing.map((m) => m.id)).toEqual(['attic']);
  });
});

describe('membership gates (ADR-360 D4/D5, ADR-236 D2)', () => {
  it('a region name that does not resolve → analysis.unknown-entity', () => {
    expect(
      errorCodes(
        story(`create the House
  a region

create the Attic
  a room
  in the House

  A dusty attic.

create the Cellar
  a room
  in the Nowhere

  A damp cellar.

`),
      ),
    ).toEqual(['analysis.unknown-entity']);
  });

  it('a room `in` a room → analysis.room-in-non-region, naming the place', () => {
    const source = story(`create the Hall
  a room

  A hall.

create the Closet
  a room
  in the Hall

  A closet.

`);
    expect(errorCodes(source)).toEqual(['analysis.room-in-non-region']);
    const result = compile(source);
    const diagnostic = result.diagnostics.find((d) => d.code === 'analysis.room-in-non-region')!;
    expect(diagnostic.message).toContain('Hall');
    expect(diagnostic.span.line).toBe(15);
    // Refused, so nothing joins anything: the closet keeps its line and the hall gains no member.
    expect(result.ir.entities.find((e) => e.id === 'closet')!.placement).toMatchObject({ relation: 'in', place: 'hall' });
    expect(result.ir.entities.find((e) => e.id === 'hall')!.containing).toEqual([]);
  });

  it('a room with two `in` lines → analysis.room-two-regions at the second line', () => {
    const source = story(`create the East Wing
  a region

create the West Wing
  a region

create the Hall
  a room
  in the East Wing
  in the West Wing

  A hall.

`);
    const result = compile(source);
    const errors = result.diagnostics.filter((d) => d.severity === 'error');
    expect(errors.map((d) => d.code)).toContain('analysis.room-two-regions');
    const diagnostic = errors.find((d) => d.code === 'analysis.room-two-regions')!;
    expect(diagnostic.span.line).toBe(17);
    expect(diagnostic.message).toMatch(/line 16/);
    // Refused, so the hall joins neither wing.
    for (const wing of ['east-wing', 'west-wing']) {
      expect(result.ir.entities.find((e) => e.id === wing)!.containing).toEqual([]);
    }
  });

  it('a thing placed in a region → analysis.thing-in-region, asking which room', () => {
    const source = story(`create the House
  a region

create the Attic
  a room
  in the House

  A dusty attic.

create the trunk
  a container
  in the House

  A trunk.

`);
    expect(errorCodes(source)).toEqual(['analysis.thing-in-region']);
    const diagnostic = compile(source).diagnostics.find((d) => d.code === 'analysis.thing-in-region')!;
    expect(diagnostic.message).toContain('trunk');
    expect(diagnostic.message).toContain('rooms');
  });

  it('a door or a region placed in a region keeps its own gate, not thing-in-region', () => {
    const codes = errorCodes(
      story(`create the House
  a region

create the Attic
  a room
  in the House
  down to the Cellar through the hatch

  A dusty attic.

create the Cellar
  a room

  A damp cellar.

create the hatch
  a door
  in the House

  A hatch.

`),
    );
    expect(codes).toContain('analysis.door-placement');
    expect(codes).not.toContain('analysis.thing-in-region');
  });

  it('a region whose members all come from `in` lines, or all from a group, is not memberless', () => {
    expect(
      errorCodes(
        story(`create the House
  a region

create the Attic
  a room
  in the House

  A dusty attic.

create the Maze
  a region

  rooms Maze 1 to 2

    Twisty passages.

`),
      ),
    ).toEqual([]);
  });

  it('memberless region → analysis.region-memberless (hard error, no warning tier)', () => {
    const source = story(`create the Hall
  a room

  A hall.

create the Empty Quarter
  a region

  A region of nothing at all.

`);
    expect(errorCodes(source)).toEqual(['analysis.region-memberless']);
    const diagnostic = compile(source).diagnostics.find((d) => d.code === 'analysis.region-memberless')!;
    expect(diagnostic.message).toContain('`rooms` group');
    expect(diagnostic.message).toContain('in the Empty Quarter');
  });

  it('placement line on a region block → analysis.region-placement', () => {
    expect(
      errorCodes(
        story(`create the Hall
  a room
  in the House

  A hall.

create the House
  a region
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
  in the House

  A hall.

create the House
  a region
  starts in the Hall

`),
      ),
    ).toEqual(['analysis.region-placement']);
  });

  it('a region `in` another region is refused, so regions cannot nest (D5)', () => {
    expect(
      errorCodes(
        story(`create the Underground
  a region

create the Mines
  a region
  in the Underground

create the Pit
  a room
  in the Mines

  A pit.

`),
      ),
    ).toEqual(['analysis.region-placement', 'analysis.region-memberless']);
  });
});

describe('`containing` is removed (ADR-360 D5, AC-5)', () => {
  it('is a parse error naming groups and `in` lines, and the line is consumed', () => {
    const result = compile(
      story(`create the Hall
  a room
  in the House

  A hall.

create the House
  a region
  containing the Hall

`),
    );
    const errors = result.diagnostics.filter((d) => d.severity === 'error');
    expect(errors.map((d) => d.code)).toEqual(['parse.removed-containing']);
    expect(errors[0].message).toContain('rooms <name> <first> to <last>');
    expect(errors[0].message).toContain('in the <region>');
    expect(errors[0].span.line).toBe(16);
  });
});
