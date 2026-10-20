/**
 * adr-378-passages-front-end.test.ts — ADR-378's declaration surface on the
 * chord side (Chord 4.0 Phase 14, Slice 3): the `passage` room line (D1),
 * `while` on an exit line (D3), `admits` on an exit line and `pushing` in a
 * room's `admits:` (D6), and `define action … while` (D5) — parsed, analyzed
 * and lowered to IR. Every case asserts an IR field or a specific diagnostic
 * code, never "parsed without throwing"; every diagnostic the record names
 * has a case here (AC-1), and a story using none of it lowers no new field.
 */
import { describe, expect, it } from 'vitest';
import { compile } from '../src';
import type { IRExit, StoryIR } from '../src/ir';

const HEADER = `story
  title: Depot
  authors:
    T
  id: depot
  story-version: 0.0.1
`;

const PLAYER = `
create Alex
  a person
  playable
  starts in the Cable Trench

  You.

before the game starts
  change the player to Alex
end before
`;

const ROOMS = `
create the Cable Trench
  a room
  up to the Loading Dock

  A trench under the dock floor.

create the Loading Dock
  a room

  The dock.

create the Sorting Room
  a room
  east to the Loading Dock

  The sorter.

create the lantern
  a thing
  in the Cable Trench
  states: cold, warm

  A lantern.

define phrase dock-sealed
  Sealed.
end phrase
`;

const CAR = `
create the car
  a vehicle
  in the Loading Dock
  movement: streets
  carries: in
  drive: player
  commands: compass

  A car.
`;

/** A door for the `through` cases; a door must be wired by exactly one `through` line. */
const GRATING = `
create the grating
  a door

  A grating.
`;

const story = (...blocks: string[]) => `${HEADER}${ROOMS}${PLAYER}${blocks.join('\n')}`;

/** The Cable Trench block with extra lines after its `up` exit. */
const trench = (...lines: string[]) =>
  story().replace('  up to the Loading Dock\n', `  up to the Loading Dock\n${lines.map((l) => `  ${l}\n`).join('')}`);

const compiled = (source: string): StoryIR => {
  const result = compile(source);
  const errors = result.diagnostics.filter((d) => d.severity === 'error' && d.code !== 'analysis.missing-ifid');
  expect(errors, errors.map((d) => `${d.code}: ${d.message}`).join('\n')).toEqual([]);
  return result.ir;
};

const errorCodes = (source: string) =>
  compile(source).diagnostics.filter((d) => d.severity === 'error').map((d) => d.code);

const exitsOf = (ir: StoryIR, id: string): IRExit[] => ir.entities.find((e) => e.id === id)!.exits;

describe('the passage line (ADR-378 D1)', () => {
  it('lowers to an exit keyed by its first form, carrying every form, with no reverse flag', () => {
    const ir = compiled(trench('passage follow the cables or crawl along the cables to the Sorting Room'));
    const [, passage] = exitsOf(ir, 'cable-trench');
    expect(passage.direction).toBe('passage:follow-the-cables');
    expect(passage.passage).toEqual(['follow the cables', 'crawl along the cables']);
    expect(passage.to).toBe('sorting-room');
    expect(passage.via).toBeNull();
    expect(passage.oneWay).toBeUndefined();
    expect(passage.condition).toBeUndefined();
    expect(passage.admits).toBeUndefined();
  });

  it('takes `through <door>` as any exit does', () => {
    const ir = compiled(trench('passage follow the cables to the Sorting Room through the grating') + GRATING);
    expect(exitsOf(ir, 'cable-trench')[1].via).toBe('grating');
  });

  it('a single form is one word or many', () => {
    const ir = compiled(trench('passage xyzzy to the Sorting Room'));
    expect(exitsOf(ir, 'cable-trench')[1].direction).toBe('passage:xyzzy');
    expect(exitsOf(ir, 'cable-trench')[1].passage).toEqual(['xyzzy']);
  });

  it('`, one-way` is analysis.passage-one-way — a passage is one-way by construction', () => {
    const codes = errorCodes(trench('passage xyzzy to the Sorting Room, one-way'));
    expect(codes).toEqual(['analysis.passage-one-way']);
  });

  it.each([
    ['no words before `to`', 'passage to the Sorting Room'],
    ['an empty form between the `or`s', 'passage xyzzy or or plugh to the Sorting Room'],
    ['an empty form before `or`', 'passage or plugh to the Sorting Room'],
    ['a comma inside a form', 'passage climb, rope to the Sorting Room'],
    ['no destination at all', 'passage xyzzy'],
  ])('%s is parse.passage-words', (_what, line) => {
    expect(errorCodes(trench(line))).toContain('parse.passage-words');
  });

  it('on a thing it is analysis.exit-non-room, as any exit line is', () => {
    const codes = errorCodes(story().replace('  states: cold, warm\n', '  states: cold, warm\n  passage xyzzy to the Sorting Room\n'));
    expect(codes).toContain('analysis.exit-non-room');
  });

  it('two passages on one room sharing a form are analysis.duplicate-exit; distinct forms are not', () => {
    expect(errorCodes(trench(
      'passage follow the cables to the Sorting Room',
      'passage crawl or follow the cables to the Loading Dock',
    ))).toEqual(['analysis.duplicate-exit']);
    expect(errorCodes(trench(
      'passage follow the cables to the Sorting Room',
      'passage xyzzy to the Loading Dock',
    ))).toEqual([]);
  });

  it('a passage and a compass exit on one room do not collide', () => {
    const ir = compiled(trench('passage up the ladder to the Sorting Room'));
    expect(exitsOf(ir, 'cable-trench').map((e) => e.direction)).toEqual(['up', 'passage:up-the-ladder']);
  });
});

describe('blocked and deadly passage lines (ADR-378 D1)', () => {
  it('`passage <words> is blocked` names the passage by any form and lowers under its canonical key', () => {
    const ir = compiled(trench(
      'passage follow the cables or crawl along the cables to the Sorting Room',
      'passage crawl along the cables is blocked: dock-sealed',
    ));
    const room = ir.entities.find((e) => e.id === 'cable-trench')!;
    expect(room.blockedExits).toHaveLength(1);
    expect(room.blockedExits[0].direction).toBe('passage:follow-the-cables');
    expect(room.blockedExits[0].phraseKey).toBe('dock-sealed');
    expect(room.blockedExits[0].condition).toBeNull();
  });

  it('`passage <words> is blocked while <condition>` carries the condition', () => {
    const ir = compiled(trench(
      'passage follow the cables to the Sorting Room',
      'passage follow the cables is blocked while the lantern is cold: dock-sealed',
    ));
    expect(ir.entities.find((e) => e.id === 'cable-trench')!.blockedExits[0].condition).not.toBeNull();
  });

  it('`passage <words> is deadly` lowers under the passage key', () => {
    const ir = compiled(trench(
      'passage follow the cables to the Sorting Room',
      'passage follow the cables is deadly: dock-sealed',
    ));
    expect(ir.entities.find((e) => e.id === 'cable-trench')!.deadlyExits[0].direction).toBe('passage:follow-the-cables');
  });

  it('naming a passage the room does not declare is analysis.passage-unknown', () => {
    expect(errorCodes(trench(
      'passage follow the cables to the Sorting Room',
      'passage xyzzy is blocked: dock-sealed',
    ))).toEqual(['analysis.passage-unknown']);
    expect(errorCodes(trench('passage xyzzy is deadly: dock-sealed'))).toEqual(['analysis.passage-unknown']);
  });
});

describe('`while` on an exit line (ADR-378 D3)', () => {
  it('a compass exit lowers its condition', () => {
    const ir = compiled(trench('north to the Sorting Room while the lantern is warm'));
    const north = exitsOf(ir, 'cable-trench').find((e) => e.direction === 'north')!;
    expect(north.condition).toBeDefined();
    expect(north.condition!.kind).toBeTruthy();
    expect(north.to).toBe('sorting-room');
  });

  it('a passage lowers its condition', () => {
    const ir = compiled(trench('passage follow the cables to the Sorting Room while the lantern is warm'));
    expect(exitsOf(ir, 'cable-trench')[1].condition).toBeDefined();
  });

  it('a condition-less exit carries no condition field', () => {
    const ir = compiled(trench('north to the Sorting Room'));
    expect('condition' in exitsOf(ir, 'cable-trench').find((e) => e.direction === 'north')!).toBe(false);
  });

  it('after `, one-way` and a door', () => {
    const ir = compiled(trench('north to the Sorting Room through the grating, one-way while the lantern is warm') + GRATING);
    const north = exitsOf(ir, 'cable-trench').find((e) => e.direction === 'north')!;
    expect(north.via).toBe('grating');
    expect(north.oneWay).toBe(true);
    expect(north.condition).toBeDefined();
  });

  it('on an `exits:` line it is parse.exits-line-while', () => {
    expect(errorCodes(trench('exits: north to the Sorting Room while the lantern is warm'))).toContain('parse.exits-line-while');
  });

  it('in an exit-table row it is parse.exit-row-while', () => {
    const codes = errorCodes(story(`
create the Depot
  a region

  rooms Bay 1 to 2

    A bay.

  exits
    the Bay 1: north to the Bay 2 while the lantern is warm
`));
    expect(codes).toContain('parse.exit-row-while');
  });
});

describe('`admits` on an exit line and `pushing` in `admits:` (ADR-378 D6)', () => {
  it('`admits pushing` on an exit lowers to the class word', () => {
    const ir = compiled(trench('east to the Loading Dock admits pushing'));
    expect(exitsOf(ir, 'cable-trench').find((e) => e.direction === 'east')!.admits).toEqual(['pushing']);
  });

  it('`admits <vehicle>, pushing` lowers the vehicle id beside the word', () => {
    const ir = compiled(trench('east to the Loading Dock admits the car, pushing').replace(PLAYER, `${PLAYER}${CAR}`));
    expect(exitsOf(ir, 'cable-trench').find((e) => e.direction === 'east')!.admits).toEqual(['car', 'pushing']);
  });

  it('`admits` then `while` on one line', () => {
    const ir = compiled(trench('east to the Loading Dock admits pushing while the lantern is warm'));
    const east = exitsOf(ir, 'cable-trench').find((e) => e.direction === 'east')!;
    expect(east.admits).toEqual(['pushing']);
    expect(east.condition).toBeDefined();
  });

  it('a word that is neither a steered vehicle nor `pushing` is analysis.admits-not-steered-vehicle', () => {
    expect(errorCodes(trench('east to the Loading Dock admits the lantern'))).toContain('analysis.admits-not-steered-vehicle');
  });

  it('`admits` with nothing after it is parse.exit-admits', () => {
    expect(errorCodes(trench('east to the Loading Dock admits'))).toContain('parse.exit-admits');
  });

  it('on a passage it is parse.exit-trailing — a passage is not a direction', () => {
    expect(errorCodes(trench('passage xyzzy to the Sorting Room admits pushing'))).toContain('parse.exit-trailing');
  });

  it('on an `exits:` line it is parse.exits-line-admits; in a table row parse.exit-row-admits', () => {
    expect(errorCodes(trench('exits: east to the Loading Dock admits pushing'))).toContain('parse.exits-line-admits');
    expect(errorCodes(story(`
create the Depot
  a region

  rooms Bay 1 to 2

    A bay.

  exits
    the Bay 1: north to the Bay 2 admits pushing
`))).toContain('parse.exit-row-admits');
  });

  it('a room\'s `admits:` takes `pushing` beside vehicles, and refuses any other word', () => {
    const ir = compiled(story(CAR).replace('  up to the Loading Dock\n', '  up to the Loading Dock\n  admits: the car, pushing\n'));
    expect(ir.entities.find((e) => e.id === 'cable-trench')!.admits).toEqual(['car', 'pushing']);
    const alone = compiled(trench('admits: pushing'));
    expect(alone.entities.find((e) => e.id === 'cable-trench')!.admits).toEqual(['pushing']);
    expect(errorCodes(trench('admits: the lantern'))).toContain('analysis.admits-not-steered-vehicle');
  });
});

describe('`define action <name> while <condition>` (ADR-378 D5, ADR-370 D7)', () => {
  const ACTION = (head: string) => `
define action releasing${head}
  grammar
    drop
  phrase dock-sealed
`;

  it('lowers the head condition onto the action', () => {
    const ir = compiled(story(ACTION(' while the player is in the Sorting Room')));
    const action = ir.actions.find((a) => a.name === 'releasing')!;
    expect(action.condition).toBeDefined();
    expect(action.patterns).toHaveLength(1);
  });

  it('a head without `while` carries no condition field', () => {
    const ir = compiled(story(ACTION('')));
    expect('condition' in ir.actions.find((a) => a.name === 'releasing')!).toBe(false);
  });

  it('a slot named in the head condition is an unknown reference — the gate runs before any slot binds', () => {
    const codes = errorCodes(story(`
define action petting while the animal is in the Sorting Room
  grammar
    pet the animal
  phrase dock-sealed
`));
    expect(codes.length).toBeGreaterThan(0);
    expect(codes).not.toContain('parse.action-name');
  });

  it('in a grammar file it is analysis.grammar-file-behavior', () => {
    const codes = errorCodes('grammar "standard-en-us"\n\ndefine action taking while the player is in the Hall\n  grammar\n    take the item\n');
    expect(codes).toContain('analysis.grammar-file-behavior');
  });
});

describe('a story using none of it (ADR-378 D8: byte-identical IR)', () => {
  it('lowers no passage, condition or admits field on any exit, and no condition on any action', () => {
    const ir = compiled(story(`
define action waving
  grammar
    wave
  phrase dock-sealed
`));
    for (const entity of ir.entities) {
      for (const exit of entity.exits) {
        expect('passage' in exit).toBe(false);
        expect('condition' in exit).toBe(false);
        expect('admits' in exit).toBe(false);
      }
    }
    for (const action of ir.actions) expect('condition' in action).toBe(false);
  });
});

describe('the `pushing` block on a thing (ADR-378 D6b)', () => {
  const TROLLEY = (rows: string) => `
create the trolley
  a thing, pushable
  in the Sorting Room

  A trolley.

  pushing
${rows}
  end pushing
`;

  it('`between` lowers to both directed pairs; `from … to` to one', () => {
    // The Trench's `up` infers the Dock's `down`, so `from the Loading Dock to the Cable Trench` is a way the map has.
    const ir = compiled(story(TROLLEY('    between the Sorting Room and the Loading Dock\n    from the Loading Dock to the Cable Trench')));
    const ways = ir.entities.find((e) => e.id === 'trolley')!.pushing!.map((w) => [w.from, w.to]);
    expect(ways).toEqual([
      ['sorting-room', 'loading-dock'],
      ['loading-dock', 'sorting-room'],
      ['loading-dock', 'cable-trench'],
    ]);
  });

  it('a row naming no compass exit from the first room to the second is analysis.pushing-no-exit', () => {
    // The Sorting Room has no exit to the Yard-less Cable Trench in the base fixture.
    expect(errorCodes(story(TROLLEY('    from the Sorting Room to the Cable Trench')))).toEqual(['analysis.pushing-no-exit']);
    // A passage is not a direction, so it does not count.
    expect(errorCodes(trench('passage xyzzy to the Sorting Room') + TROLLEY('    from the Cable Trench to the Sorting Room'))).toEqual(['analysis.pushing-no-exit']);
    // The inferred reverse of a two-way line the far room wrote does count.
    expect(errorCodes(trench('east to the Sorting Room') + TROLLEY('    from the Sorting Room to the Cable Trench'))).toEqual([]);
  });

  it('on a thing that is not pushable it is analysis.pushing-not-pushable; a second block is parse.pushing-duplicate; a malformed row is parse.pushing-row', () => {
    expect(errorCodes(story(TROLLEY('    between the Sorting Room and the Loading Dock').replace('a thing, pushable', 'a thing')))).toContain('analysis.pushing-not-pushable');
    expect(errorCodes(story(TROLLEY('    between the Sorting Room and the Loading Dock') + '\n  pushing\n    between the Sorting Room and the Loading Dock\n  end pushing\n'))).toContain('parse.pushing-duplicate');
    expect(errorCodes(story(TROLLEY('    the Sorting Room to the Loading Dock')))).toContain('parse.pushing-row');
  });

  it('a thing without the block lowers no pushing field', () => {
    const ir = compiled(trench('east to the Sorting Room'));
    for (const entity of ir.entities) expect('pushing' in entity).toBe(false);
  });
});
