/**
 * adr-360-exit-table.test.ts — a region's exit table (ADR-360 D3) and two
 * exits in one direction across every place an exit is written (D3a).
 * Compile side, through the real parse → analyze pipeline; the loaded-world
 * and walking halves live in story-loader. Flagship fixture:
 * maze-sixteen.story, the UNDERGROUND maze's sixteen rows.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { compile } from '../src';

const MAZE = readFileSync(join(__dirname, 'fixtures', 'maze-sixteen.story'), 'utf8');

const story = (body: string) => `story
  title: Tables
  authors:
    T
  id: tables
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

const errors = (source: string) => compile(source).diagnostics.filter((d) => d.severity === 'error');
const errorCodes = (source: string) => errors(source).map((d) => d.code);

/** The Hall region with three member rooms, a non-member, and `tables` written into the region block. */
const hall = (tables: string, extraRooms = '') =>
  story(`create the House
  a region

  rooms Room 1 to 3

    A plain room.

${tables}
create the Garden
  a room

  A garden.
${extraRooms}`);

describe('the table lowers onto its rooms (D3, AC-1 sixteen rows)', () => {
  const result = compile(MAZE);
  const exitsOf = (id: string) =>
    result.ir.entities.find((e) => e.id === id)!.exits.map((x) => `${x.direction}>${x.to}`);

  it('compiles the sixteen-row maze with no diagnostic', () => {
    expect(result.diagnostics).toEqual([]);
  });

  it("gives each created room exactly its row's exits, every one one-way", () => {
    expect(exitsOf('maze-61')).toEqual(['east>maze-62', 'west>maze-63', 'south>sphere-room-34']);
    expect(exitsOf('maze-66')).toEqual([
      'north>maze-66', 'east>maze-66', 'west>maze-66', 'south>maze-66', 'up>maze-65', 'down>dead-end-74',
    ]);
    expect(exitsOf('dead-end-74')).toEqual(['down>dead-end-74']);
    const mazeRooms = result.ir.entities.filter((e) => /^(maze|dead-end)-\d+$/.test(e.id));
    expect(mazeRooms).toHaveLength(16);
    for (const room of mazeRooms) {
      expect(room.exits.length, room.id).toBeGreaterThan(0);
      for (const exit of room.exits) expect(exit.oneWay, `${room.id} ${exit.direction}`).toBe(true);
    }
  });

  it('gives each exit its own span on the row', () => {
    const [east, west] = result.ir.entities.find((e) => e.id === 'maze-61')!.exits;
    expect(east.span.line).toBe(west.span.line);
    expect(east.span.column).toBeLessThan(west.span.column);
  });

  it('a plain table infers nothing itself: its exits carry no `oneWay`', () => {
    const r = compile(hall(`  exits
    the Room 1: east to the Room 2
`));
    expect(r.diagnostics).toEqual([]);
    expect(r.ir.entities.find((e) => e.id === 'room-1')!.exits).toMatchObject([{ direction: 'east', to: 'room-2' }]);
    expect(r.ir.entities.find((e) => e.id === 'room-1')!.exits[0].oneWay).toBeUndefined();
  });

  it('a row may leave the region, and may pass through a door', () => {
    const r = compile(hall(`  exits
    the Room 1: east to the Garden through the gate
`, `
create the gate
  a door
  openable

  A gate.
`));
    expect(r.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    expect(r.ir.entities.find((e) => e.id === 'room-1')!.exits).toMatchObject([{ direction: 'east', to: 'garden', via: 'gate' }]);
  });

  it('a one-off member may use the table, and its own lines come first', () => {
    const r = compile(story(`create the House
  a region

  exits
    the Den: east to the Attic

create the Den
  a room
  in the House
  north to the Attic, one-way

  A den.

create the Attic
  a room
  in the House

  An attic.

`));
    expect(r.diagnostics).toEqual([]);
    expect(r.ir.entities.find((e) => e.id === 'den')!.exits.map((x) => x.direction)).toEqual(['north', 'east']);
  });

  it('a region may hold one table of each kind', () => {
    const r = compile(hall(`  exits
    the Room 1: east to the Room 2

  exits, one-way
    the Room 3: west to the Room 2
`));
    expect(r.diagnostics).toEqual([]);
    expect(r.ir.entities.find((e) => e.id === 'room-3')!.exits).toMatchObject([{ direction: 'west', to: 'room-2', oneWay: true }]);
  });
});

describe('table refusals (D3, AC-2, AC-3)', () => {
  it('a row naming a room outside the region → analysis.exit-row-not-member, at the row\'s room', () => {
    const result = compile(hall(`  exits
    the Garden: east to the Room 1
`));
    const errs = result.diagnostics.filter((d) => d.severity === 'error');
    expect(errs.map((d) => d.code)).toEqual(['analysis.exit-row-not-member']);
    expect(errs[0].message).toContain('Garden');
    expect(errs[0].span.line).toBe(16);
    // Refused, so the row adds nothing anywhere.
    for (const e of result.ir.entities) expect(e.exits, e.id).toEqual([]);
  });

  it('a refused row leaves the good rows beside it in place', () => {
    const result = compile(hall(`  exits
    the Room 1: east to the Room 2
    the Room 3: west is blocked: no-way
`));
    expect(result.diagnostics.filter((d) => d.severity === 'error').map((d) => d.code)).toEqual(['parse.exit-row-blocked']);
    const exitsOf = (id: string) => result.ir.entities.find((e) => e.id === id)!.exits;
    expect(exitsOf('room-1')).toMatchObject([{ direction: 'east', to: 'room-2' }]);
    expect(exitsOf('room-3')).toEqual([]);
  });

  it('a table exit through something that is not a door meets the door gate', () => {
    expect(errorCodes(hall(`  exits
    the Room 1: east to the Garden through the Room 2
`))).toContain('analysis.door-through-kind');
  });

  it.each([
    ['blocked', 'east is blocked: no-way'],
    ['deadly', 'east is deadly: no-way'],
  ])('a %s exit in a row is a parse error at the row', (_kind, exit) => {
    const errs = errors(hall(`  exits
    the Room 1: ${exit}
`));
    expect(errs.map((d) => d.code)).toEqual(['parse.exit-row-blocked']);
    expect(errs[0].span.line).toBe(16);
  });

  it('a row without its colon → parse.exit-row', () => {
    expect(errorCodes(hall(`  exits
    the Room 1 east to the Room 2
`))).toEqual(['parse.exit-row']);
  });

  it('`, one-way` on a row exit → parse.exit-row-one-way, naming the table form', () => {
    const errs = errors(hall(`  exits
    the Room 1: east to the Room 2, one-way
`));
    expect(errs.map((d) => d.code)).toEqual(['parse.exit-row-one-way']);
    expect(errs[0].message).toContain('exits, one-way');
  });

  it('anything but a comma after an exit → parse.exit-trailing', () => {
    // Words alone would read as more of the destination's name, as on a room's own exit line.
    expect(errorCodes(hall(`  exits
    the Room 1: east to the Room 2: west to the Room 3
`))).toEqual(['parse.exit-trailing']);
  });

  it('a table with no rows → parse.exit-table-empty', () => {
    expect(errorCodes(hall(`  exits
`))).toEqual(['parse.exit-table-empty']);
  });

  it('a table in a room block → analysis.exit-table-owner, and its rows add nothing', () => {
    const source = story(`create the Den
  a room

  exits
    the Den: east to the Attic

  A den.

create the Attic
  a room

  An attic.

`);
    expect(errorCodes(source)).toEqual(['analysis.exit-table-owner']);
    expect(compile(source).ir.entities.find((e) => e.id === 'den')!.exits).toEqual([]);
  });

  it('a second table of the same kind → analysis.exit-table-duplicate, and its rows add nothing', () => {
    const source = hall(`  exits
    the Room 1: east to the Room 2

  exits
    the Room 3: east to the Room 2
`);
    expect(errorCodes(source)).toEqual(['analysis.exit-table-duplicate']);
    const entities = compile(source).ir.entities;
    expect(entities.find((e) => e.id === 'room-1')!.exits).toHaveLength(1);
    expect(entities.find((e) => e.id === 'room-3')!.exits).toEqual([]);
  });

  it('a table in a group body → analysis.room-group-line, and the rooms get no exits from it', () => {
    const source = story(`create the House
  a region

  rooms Room 1 to 2
    exits
      the Room 1: east to the Room 2

    A plain room.

`);
    expect(errorCodes(source)).toEqual(['analysis.room-group-line']);
    for (const id of ['room-1', 'room-2']) {
      expect(compile(source).ir.entities.find((e) => e.id === id)!.exits, id).toEqual([]);
    }
  });
});

describe('two exits in one direction, wherever written (D3a, AC-10)', () => {
  const SPLIT = (rowExit: string, blockExit = '  east to the Den\n') => story(`create the House
  a region

  exits
    the Hall: ${rowExit}

create the Hall
  a room
  in the House
${blockExit}
  A hall.

create the Den
  a room
  in the House

  A den.

create the Attic
  a room
  in the House

  An attic.

`);

  it('an `east` line in the block and an `east` row → analysis.duplicate-exit naming both lines', () => {
    const errs = errors(SPLIT('east to the Attic'));
    expect(errs.map((d) => d.code)).toContain('analysis.duplicate-exit');
    const dup = errs.find((d) => d.code === 'analysis.duplicate-exit' && d.span.line === 12)!;
    expect(dup).toBeDefined();
    expect(dup.message).toContain('line 17');
  });

  it("a row whose exit contradicts another room's inferred reverse → analysis.duplicate-exit", () => {
    // The Hall's plain `east to the Den` infers the Den's west back to the Hall.
    const errs = errors(story(`create the House
  a region

  exits
    the Den: west to the Attic

create the Hall
  a room
  in the House
  east to the Den

  A hall.

create the Den
  a room
  in the House

  A den.

create the Attic
  a room
  in the House

  An attic.

`));
    expect(errs.map((d) => d.code)).toEqual(['analysis.duplicate-exit']);
    expect(errs[0].message).toContain('one-way');
  });

  it('a row agreeing with an inferred reverse compiles clean', () => {
    expect(compile(story(`create the House
  a region

  exits
    the Den: west to the Hall

create the Hall
  a room
  in the House
  east to the Den

  A hall.

create the Den
  a room
  in the House

  A den.

`)).diagnostics).toEqual([]);
  });
});
