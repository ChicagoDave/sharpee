/**
 * adr-378-passages-front-end.test.ts — ADR-378's declaration surface on the
 * chord side (Chord 4.0 Phase 14, Slice 3): the passage (D1, written as
 * ADR-380 D1's `passage to <room> … end passage` block, its retired line
 * forms refused per ADR-380 D4),
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

/** A passage block's lines for `trench()`: the head, `grammar`, its commands, any inner lines, `end passage`. */
const passage = (head: string, commands: string[], ...inner: string[]) => [
  `passage to ${head}`,
  '  grammar',
  ...commands.map((c) => `    ${c}`),
  ...inner.map((l) => `  ${l}`),
  'end passage',
];

describe('the passage block (ADR-380 D1)', () => {
  it('lowers to an exit keyed by its first command, carrying every command, with no reverse flag', () => {
    const ir = compiled(trench(...passage('the Sorting Room', ['follow the cables', 'crawl along the cables'])));
    const [, way] = exitsOf(ir, 'cable-trench');
    expect(way.direction).toBe('passage:follow-the-cables');
    expect(way.passage).toEqual(['follow the cables', 'crawl along the cables']);
    expect(way.to).toEqual({ kind: 'room', id: 'sorting-room' });
    expect(way.via).toBeNull();
    expect(way.oneWay).toBeUndefined();
    expect(way.condition).toBeUndefined();
    expect(way.admits).toBeUndefined();
  });

  it('`or` and `[…]` expand to the commands they admit, the line as written first', () => {
    const ir = compiled(trench(...passage('the Sorting Room', ['crawl or creep along [the] cables'])));
    const [, way] = exitsOf(ir, 'cable-trench');
    expect(way.direction).toBe('passage:crawl-along-the-cables');
    expect(way.passage).toEqual(['crawl along the cables', 'crawl along cables', 'creep along the cables', 'creep along cables']);
  });

  it('`the` in a passage is a word, never a slot', () => {
    const ir = compiled(trench(...passage('the Sorting Room', ['follow the cables'])));
    expect(exitsOf(ir, 'cable-trench')[1].passage).toEqual(['follow the cables']);
  });

  it('takes `through <door>` on its head as any exit does', () => {
    const ir = compiled(trench(...passage('the Sorting Room through the grating', ['follow the cables'])) + GRATING);
    expect(exitsOf(ir, 'cable-trench')[1].via).toBe('grating');
  });

  it('a single command is one word or many', () => {
    const ir = compiled(trench(...passage('the Sorting Room', ['xyzzy'])));
    expect(exitsOf(ir, 'cable-trench')[1].direction).toBe('passage:xyzzy');
    expect(exitsOf(ir, 'cable-trench')[1].passage).toEqual(['xyzzy']);
  });

  it('`, one-way` on the head is analysis.passage-one-way — a passage is one-way by construction', () => {
    expect(errorCodes(trench(...passage('the Sorting Room, one-way', ['xyzzy'])))).toEqual(['analysis.passage-one-way']);
  });

  it('`admits` on the head is parse.exit-trailing — nothing is pushed through a passage', () => {
    expect(errorCodes(trench(...passage('the Sorting Room admits pushing', ['xyzzy'])))).toEqual(['parse.exit-trailing']);
  });

  it('a block with no `grammar` line is parse.passage-line', () => {
    expect(errorCodes(trench('passage to the Sorting Room', '  while the lantern is warm', 'end passage'))).toContain('parse.passage-line');
  });

  it('`grammar` with no commands under it is parse.passage-line', () => {
    expect(errorCodes(trench('passage to the Sorting Room', '  grammar', 'end passage'))).toContain('parse.passage-line');
  });

  it('a line before `grammar`, or one the block does not take, is parse.passage-line', () => {
    expect(errorCodes(trench('passage to the Sorting Room', '  while the lantern is warm', '  grammar', '    xyzzy', 'end passage'))).toContain('parse.passage-line');
    expect(errorCodes(trench(...passage('the Sorting Room', ['xyzzy'], 'north to the Loading Dock')))).toEqual(['parse.passage-line']);
  });

  it('a second `while`, `blocked` or `deadly` line is parse.passage-line-duplicate', () => {
    expect(errorCodes(trench(...passage('the Sorting Room', ['xyzzy'], 'while the lantern is warm', 'while the lantern is cold')))).toEqual(['parse.passage-line-duplicate']);
    expect(errorCodes(trench(...passage('the Sorting Room', ['xyzzy'], 'blocked: dock-sealed', 'blocked: dock-sealed')))).toEqual(['parse.passage-line-duplicate']);
    expect(errorCodes(trench(...passage('the Sorting Room', ['xyzzy'], 'deadly: dock-sealed', 'deadly: dock-sealed')))).toEqual(['parse.passage-line-duplicate']);
  });

  it('a missing `end passage` is parse.unterminated-block', () => {
    expect(errorCodes(trench('passage to the Sorting Room', '  grammar', '    xyzzy'))).toContain('parse.unterminated-block');
  });

  it('on a thing it is analysis.exit-non-room, as any exit is', () => {
    const block = '  passage to the Sorting Room\n    grammar\n      xyzzy\n  end passage\n';
    const codes = errorCodes(story().replace('  states: cold, warm\n', `  states: cold, warm\n${block}`));
    expect(codes).toContain('analysis.exit-non-room');
  });

  it('two passages on one room sharing a command are analysis.duplicate-exit; distinct commands are not', () => {
    expect(errorCodes(trench(
      ...passage('the Sorting Room', ['follow the cables']),
      ...passage('the Loading Dock', ['crawl or follow the cables']),
    ))).toEqual(['analysis.duplicate-exit']);
    expect(errorCodes(trench(
      ...passage('the Sorting Room', ['follow the cables']),
      ...passage('the Loading Dock', ['xyzzy']),
    ))).toEqual([]);
  });

  it('a passage and a compass exit on one room do not collide', () => {
    const ir = compiled(trench(...passage('the Sorting Room', ['up the ladder'])));
    expect(exitsOf(ir, 'cable-trench').map((e) => e.direction)).toEqual(['up', 'passage:up-the-ladder']);
  });
});

describe('a passage block\'s `while`, `blocked` and `deadly` lines (ADR-380 D1)', () => {
  it('`while` lowers onto the passage', () => {
    const ir = compiled(trench(...passage('the Sorting Room', ['follow the cables'], 'while the lantern is warm')));
    expect(exitsOf(ir, 'cable-trench')[1].condition).toBeDefined();
  });

  it('`blocked:` lowers under the passage\'s key', () => {
    const ir = compiled(trench(...passage('the Sorting Room', ['follow the cables', 'crawl along the cables'], 'blocked: dock-sealed')));
    const room = ir.entities.find((e) => e.id === 'cable-trench')!;
    expect(room.blockedExits).toHaveLength(1);
    expect(room.blockedExits[0].direction).toBe('passage:follow-the-cables');
    expect(room.blockedExits[0].phraseKey).toBe('dock-sealed');
    expect(room.blockedExits[0].condition).toBeNull();
  });

  it('`blocked while <condition>:` carries the condition', () => {
    const ir = compiled(trench(...passage('the Sorting Room', ['follow the cables'], 'blocked while the lantern is cold: dock-sealed')));
    expect(ir.entities.find((e) => e.id === 'cable-trench')!.blockedExits[0].condition).not.toBeNull();
  });

  it('`deadly:` lowers under the passage\'s key', () => {
    const ir = compiled(trench(...passage('the Sorting Room', ['follow the cables'], 'deadly: dock-sealed')));
    expect(ir.entities.find((e) => e.id === 'cable-trench')!.deadlyExits[0].direction).toBe('passage:follow-the-cables');
  });

  it('the inner lines may come in any order after `grammar`', () => {
    const ir = compiled(trench(...passage('the Sorting Room', ['follow the cables'], 'blocked: dock-sealed', 'while the lantern is warm')));
    const room = ir.entities.find((e) => e.id === 'cable-trench')!;
    expect(room.exits[1].condition).toBeDefined();
    expect(room.blockedExits[0].direction).toBe('passage:follow-the-cables');
  });
});

describe('the retired passage lines (ADR-380 D4)', () => {
  it.each([
    ['the one-line passage', 'passage follow the cables or crawl along the cables to the Sorting Room'],
    ['the blocked passage line', 'passage follow the cables is blocked: dock-sealed'],
    ['the deadly passage line', 'passage follow the cables is deadly: dock-sealed'],
  ])('%s is parse.passage-line-form, with the block as its fix-it', (_what, line) => {
    const diag = compile(trench(line)).diagnostics.find((d) => d.code === 'parse.passage-line-form');
    expect(diag).toBeDefined();
    expect(diag!.message).toContain('passage to');
    expect(diag!.message).toContain('end passage');
  });
});

describe('`while` on an exit line (ADR-378 D3)', () => {
  it('a compass exit lowers its condition', () => {
    const ir = compiled(trench('north to the Sorting Room while the lantern is warm'));
    const north = exitsOf(ir, 'cable-trench').find((e) => e.direction === 'north')!;
    expect(north.condition).toBeDefined();
    expect(north.condition!.kind).toBeTruthy();
    expect(north.to).toEqual({ kind: 'room', id: 'sorting-room' });
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
    expect(errorCodes(trench(...passage('the Sorting Room admits pushing', ['xyzzy'])))).toContain('parse.exit-trailing');
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
    expect(errorCodes(trench(...passage('the Sorting Room', ['xyzzy'])) + TROLLEY('    from the Cable Trench to the Sorting Room'))).toEqual(['analysis.pushing-no-exit']);
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
