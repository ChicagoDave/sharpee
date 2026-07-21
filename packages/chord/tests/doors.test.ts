/**
 * doors.test.ts — ADR-234 D1–D3 (ratchet R2): the `through the <door>`
 * exit-line tail through the real parse → analyze pipeline. Fixtures:
 * door-basic.story (one-line form) and door-redundant.story (mirrored
 * two-line agreement). Rejection tests cover every never-guess gate with
 * its specific diagnostic code (AC-3/AC-5), never just "compile failed".
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { compile } from '../src';

const BASIC = readFileSync(join(__dirname, 'fixtures', 'door-basic.story'), 'utf8');
const REDUNDANT = readFileSync(join(__dirname, 'fixtures', 'door-redundant.story'), 'utf8');

const errorCodes = (source: string) =>
  compile(source).diagnostics.filter((d) => d.severity === 'error').map((d) => d.code);

const story = (body: string) => `story "Doors" by "T"
  id: doors
  version: 0.0.1

${body}
create the player

  You.
`;

const TWO_ROOMS_AND_DOOR = `create the Kitchen
  a room
  north to the Hall through the oak door

create the Hall
  a room

create the oak door
  a door

`;

describe('`through` exit-line tail (ADR-234 D1/D2, ratchet R2)', () => {
  it('lowers the one-line form to IRExit.via with the door as a plain entity (AC-1 IR half)', () => {
    const result = compile(BASIC);
    expect(result.diagnostics).toEqual([]);
    expect(result.ok).toBe(true);
    const kitchen = result.ir.entities.find((e) => e.id === 'kitchen')!;
    expect(kitchen.exits).toMatchObject([{ direction: 'north', to: 'hall', via: 'oak-door' }]);
    const hall = result.ir.entities.find((e) => e.id === 'hall')!;
    expect(hall.exits).toEqual([]); // reverse is inferred, never written
    const door = result.ir.entities.find((e) => e.id === 'oak-door')!;
    expect(door.kinds.map((k) => k.name)).toEqual(['door']);
    expect(door.descriptionKey).not.toBeNull(); // door blocks compose like any entity
  });

  it('accepts the mirrored two-line agreement (redundant, D3)', () => {
    const result = compile(REDUNDANT);
    expect(result.diagnostics).toEqual([]);
    const kitchen = result.ir.entities.find((e) => e.id === 'kitchen')!;
    const hall = result.ir.entities.find((e) => e.id === 'hall')!;
    expect(kitchen.exits).toMatchObject([{ direction: 'north', to: 'hall', via: 'oak-door' }]);
    expect(hall.exits).toMatchObject([{ direction: 'south', to: 'kitchen', via: 'oak-door' }]);
  });

  it('plain exits carry via: null — the unadorned form is untouched', () => {
    const result = compile(
      story(`create the Attic
  a room
  down to the Cellar

create the Cellar
  a room

`),
    );
    expect(result.diagnostics).toEqual([]);
    const attic = result.ir.entities.find((e) => e.id === 'attic')!;
    expect(attic.exits).toMatchObject([{ direction: 'down', to: 'cellar', via: null }]);
  });

  it('rejects a bare `through` with no door name (parse.exit-through)', () => {
    expect(errorCodes(story(`create the Kitchen
  a room
  north to the Hall through

create the Hall
  a room

`))).toContain('parse.exit-through');
  });

  it('`, one-way` is a legible reservation error, on doored and plain exits alike (D4)', () => {
    const doored = errorCodes(story(`${TWO_ROOMS_AND_DOOR}`.replace(
      'north to the Hall through the oak door',
      'north to the Hall through the oak door, one-way',
    )));
    expect(doored).toContain('parse.exit-one-way-reserved');
    const plain = errorCodes(story(`create the Kitchen
  a room
  north to the Hall, one-way

create the Hall
  a room

`));
    expect(plain).toContain('parse.exit-one-way-reserved');
  });

  it('rejects an unknown door name with the standard unresolved-entity error', () => {
    expect(errorCodes(story(`create the Kitchen
  a room
  north to the Hall through the ghost door

create the Hall
  a room

`))).toContain('analysis.unknown-entity');
  });
});

describe('ratchet R3 — keyless single-entity `with` config (ADR-234 D6, AC-6)', () => {
  const LOCK_STORY = (composition: string) => story(`create the Vault
  a room

create the strongbox
  a container
  in the Vault
  openable, ${composition}

create the brass key

`);

  it('the keyless form parses: empty key, name value', () => {
    const result = compile(LOCK_STORY('lockable with the brass key'));
    expect(result.diagnostics).toEqual([]);
    const strongbox = result.ir.entities.find((e) => e.id === 'strongbox')!;
    const lockable = strongbox.traits.find((t) => t.name === 'lockable')!;
    expect(lockable.config).toEqual([{ key: '', value: 'brass key', valueKind: 'name' }]);
  });

  it('`with key the …` is a parse error with the fix-it naming the new form', () => {
    const result = compile(LOCK_STORY('lockable with key the brass key'));
    const removed = result.diagnostics.find((d) => d.code === 'parse.removed-config-keyword')!;
    expect(removed).toBeDefined();
    expect(removed.message).toContain('`with the brass key`');
  });

  it('`with tool the …` is the same parse error', () => {
    expect(errorCodes(story(`create the crate
  openable with tool the crowbar

create the crowbar

`))).toContain('parse.removed-config-keyword');
  });

  it('keyed NAMED fields on authored traits keep their keyword (the carve-out)', () => {
    const result = compile(story(`define trait feedable
  data food: entity
end trait

create the goat
  feedable with food the handful of feed

create the handful of feed

`));
    const goat = result.ir.entities.find((e) => e.id === 'goat')!;
    const feedable = goat.traits.find((t) => t.name === 'feedable')!;
    expect(feedable.config).toMatchObject([{ key: 'food', value: 'handful of feed', valueKind: 'name' }]);
  });

  it('word-valued configs keep their keyword (`with position behind`)', () => {
    const result = compile(story(`create the sofa

create the mouse
  hiding-spot with position behind

`));
    const mouse = result.ir.entities.find((e) => e.id === 'mouse')!;
    const spot = mouse.traits.find((t) => t.name === 'hiding-spot')!;
    expect(spot.config).toMatchObject([{ key: 'position', value: 'behind', valueKind: 'word' }]);
  });
});

describe('door never-guess gates (ADR-234 D3, AC-5)', () => {
  it('rejects `through` naming a non-door (analysis.door-through-kind)', () => {
    expect(errorCodes(story(`create the Kitchen
  a room
  north to the Hall through the rug

create the Hall
  a room

create the rug

  A threadbare rug.

`))).toContain('analysis.door-through-kind');
  });

  it('rejects a door resolving to two room pairs (analysis.door-multi-pair)', () => {
    expect(errorCodes(story(`${TWO_ROOMS_AND_DOOR}create the Pantry
  a room
  east to the Scullery through the oak door

create the Scullery
  a room

`))).toContain('analysis.door-multi-pair');
  });

  it('rejects a mirror line with the wrong direction (analysis.door-pair-mismatch)', () => {
    expect(errorCodes(story(`create the Kitchen
  a room
  north to the Hall through the oak door

create the Hall
  a room
  east to the Kitchen through the oak door

create the oak door
  a door

`))).toContain('analysis.door-pair-mismatch');
  });

  it('rejects a same-side restatement (analysis.door-pair-mismatch)', () => {
    expect(errorCodes(story(`create the Kitchen
  a room
  north to the Hall through the oak door
  up to the Hall through the oak door

create the Hall
  a room

create the oak door
  a door

`))).toContain('analysis.door-pair-mismatch');
  });

  it('rejects a declared door no `through` references (analysis.door-unconnected — hard, no warning tier)', () => {
    expect(errorCodes(story(`create the Kitchen
  a room

create the oak door
  a door

`))).toContain('analysis.door-unconnected');
  });

  it('rejects a placement line on a door block (analysis.door-placement)', () => {
    expect(errorCodes(story(`${TWO_ROOMS_AND_DOOR.replace(`create the oak door
  a door

`, `create the oak door
  a door
  in the Kitchen

`)}`))).toContain('analysis.door-placement');
  });
});
