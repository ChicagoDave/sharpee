/**
 * adr-378-passages-runtime.test.ts — ADR-378 through the REAL engine
 * (Chord 4.0 Phase 14, Slice 5; AC-5): a passage by each of its forms and
 * by none of the compass words, its words not grammar elsewhere, a hidden
 * passage and a hidden compass exit (both ends), `define action … while`
 * claiming its bare verb only where the condition holds, and a pushed thing
 * arriving with the player through an admitting exit while the room's
 * blocked phrase guards it. Every assertion reads a location, an evaluator
 * or the turn's rendered text; nothing on the path is a double.
 */
import { describe, expect, it } from 'vitest';
import { Direction, RoomBehavior, RoomTrait, TraversalBehavior, exitHiddenKey } from '@sharpee/world-model';
import { bootTurns, type BootedTurns } from './helpers/boot-turns';

const SOURCE = `story
  title: Depot
  authors:
    T
  id: depot
  story-version: 0.0.1

create the Cable Trench
  a room
  up to the Loading Dock
  passage follow the cables or crawl along the cables to the Sorting Room while the lantern is warm

  A trench under the dock floor.

create the Loading Dock
  a room
  west to the Sorting Room
  north to the Yard while the gate is raised
  passage climb the rope to the Yard

  The dock.

  after the player entering
    phrase dock-arrival
  end after

create the Yard
  a room
  north to the Annex while the gate is raised
  admits: pushing

  The yard.

create the Annex
  a room
  south to the Yard while the seal is broken

  The annex.

create the Sorting Room
  a room
  east to the Loading Dock admits pushing
  east is blocked while the seal is sealed: dock-sealed

  The sorter.

create the rope
  a thing
  in the Sorting Room

  A rope.

create the lantern
  a thing
  in the Cable Trench
  states: cold, warm

  A lantern.

create the knob
  a thing, pushable
  in the Cable Trench

  A knob.

  on the player pushing
    change the lantern to warm
  end on

create the gate
  a thing
  in the Loading Dock
  states: barred, raised

  A gate.

create the crank
  a thing, pushable
  in the Loading Dock

  A crank.

  on the player pushing
    change the gate to raised
  end on

create the seal
  a thing
  in the Sorting Room
  states: sealed, broken

  A seal.

create the lever
  a thing, pushable
  in the Sorting Room

  A lever.

  on the player pushing
    change the seal to broken
  end on

create the trolley
  a thing, pushable
  in the Sorting Room
  aka cart

  A flat-bed trolley.

create the crate
  a thing, pushable
  in the Yard

  A crate.

  pushing
    from the Yard to the Annex
  end pushing

create the barrel
  a thing, pushable
  in the Yard

  A barrel.

define action releasing while the player is in the Sorting Room
  grammar
    drop
  phrase let-go

define phrase let-go
  You let go.
end phrase

define phrase dock-sealed
  The dock door is sealed.
end phrase

define phrase dock-arrival
  Sacks everywhere.
end phrase

create Alex
  a person
  playable
  starts in the Cable Trench

  You.

before the game starts
  change the player to Alex
end before
`;

const whereIs = (b: BootedTurns) => b.world.getLocation(b.player.id);
/** The parser's own not-understood: a failed command with no going event behind it. */
const failed = (events: { type: string; data?: unknown }[]) =>
  events.some((e) => e.type === 'command.failed') && !ids(events).some((id) => id.startsWith('if.action.going.'));
const PASSAGE = 'passage:follow-the-cables';
const ids = (events: { data?: unknown }[]) =>
  events.map((e) => (e.data as { messageId?: string } | undefined)?.messageId).filter((id): id is string => typeof id === 'string');

describe('a passage is wired under its key, one-way, with no reverse (ADR-378 D1, D1a)', () => {
  it('the declaring room carries the exit and the destination carries nothing back', async () => {
    const b = await bootTurns(SOURCE);
    const trench = b.world.getEntity(b.id('cable-trench'))!;
    const sorting = b.world.getEntity(b.id('sorting-room'))!;
    expect(RoomBehavior.getExit(trench, PASSAGE)?.destination).toBe(b.id('sorting-room'));
    expect(Object.keys(sorting.get(RoomTrait)!.exits)).toEqual([Direction.EAST]);
  });

  it('an exit line\'s admits survives the far room\'s own line back and is stamped on an inferred reverse only; a room\'s admits: pushing lands on the room', async () => {
    const b = await bootTurns(SOURCE);
    const sorting = b.world.getEntity(b.id('sorting-room'))!;
    const dock = b.world.getEntity(b.id('loading-dock'))!;
    // The Loading Dock writes `west to the Sorting Room` itself (the UPPS
    // shape): that later wiring rewrote both entries, and the stamp held.
    expect(RoomBehavior.getExit(sorting, Direction.EAST)?.admits).toEqual({ vehicles: [], pushed: 'any' });
    // The far room's own line carries no admits, so its exit has none.
    expect(RoomBehavior.getExit(dock, Direction.WEST)?.admits).toBeUndefined();
    // An inferred reverse carries the stamp: the Yard's south, from the Dock's north line.
    expect(RoomBehavior.getExit(dock, Direction.NORTH)).toBeDefined();
    expect(RoomBehavior.getExit(dock, Direction.NORTH)?.admits).toBeUndefined();
    expect(b.world.getEntity(b.id('yard'))!.get(RoomTrait)!.admits).toEqual({ vehicles: [], pushed: 'any' });
  });
});

describe('a passage by its words (ADR-378 D1, D2)', () => {
  it.each([
    'follow the cables',
    'crawl along the cables',
    'follow cables',
    'crawl along cables',
  ])('`%s` takes the player through the passage once it exists', async (form) => {
    const b = await bootTurns(SOURCE);
    await b.turn('push knob');
    expect(whereIs(b)).toBe(b.id('cable-trench'));
    await b.turn(form);
    expect(whereIs(b)).toBe(b.id('sorting-room'));
  });

  it('no compass word reaches it', async () => {
    const b = await bootTurns(SOURCE);
    await b.turn('push knob');
    for (const word of ['north', 'east', 'south', 'west', 'down']) {
      const events = await b.turn(word);
      expect(ids(events)).toContain('if.action.going.no_exit_that_way');
      expect(whereIs(b)).toBe(b.id('cable-trench'));
    }
  });

  it('its words are not grammar in another room: they fall through to the standard grammar or to not-understood', async () => {
    const b = await bootTurns(SOURCE);
    await b.turn('push knob');
    await b.turn('follow the cables');
    expect(whereIs(b)).toBe(b.id('sorting-room'));
    // `follow the cables` is nothing here.
    const nothing = await b.turn('follow the cables');
    expect(failed(nothing)).toBe(true);
    expect(whereIs(b)).toBe(b.id('sorting-room'));
    // `climb the rope` is the Loading Dock's passage; here it is climbing, on the rope.
    const climbing = await b.turn('climb the rope');
    expect(failed(climbing)).toBe(false);
    expect(ids(climbing).some((id) => id.startsWith('if.action.climbing.'))).toBe(true);
    expect(whereIs(b)).toBe(b.id('sorting-room'));
  });
});

describe('a hidden way (ADR-378 D3)', () => {
  it('a hidden passage\'s words are not understood while its condition is false, and work once it holds', async () => {
    const b = await bootTurns(SOURCE);
    const trench = b.world.getEntity(b.id('cable-trench'))!;
    expect(b.world.evaluate(exitHiddenKey(b.id('cable-trench'), PASSAGE))).toBe(true);
    const before = TraversalBehavior.wayFor(b.world, trench, PASSAGE, { kind: 'walker', entity: b.player });
    expect(before.kind === 'refused' && before.reason).toBe('hidden');
    const dark = await b.turn('follow the cables');
    expect(failed(dark)).toBe(true);
    expect(whereIs(b)).toBe(b.id('cable-trench'));
    await b.turn('push knob');
    expect(b.world.evaluate(exitHiddenKey(b.id('cable-trench'), PASSAGE))).toBe(false);
    await b.turn('follow the cables');
    expect(whereIs(b)).toBe(b.id('sorting-room'));
  });

  it('two rooms writing conditional exits to each other each keep their own condition (nothing overwrites the far line)', async () => {
    const b = await bootTurns(SOURCE);
    // Yard north (gate) and Annex south (seal) are both explicit, with different conditions.
    expect(b.world.evaluate(exitHiddenKey(b.id('yard'), Direction.NORTH))).toBe(true);
    expect(b.world.evaluate(exitHiddenKey(b.id('annex'), Direction.SOUTH))).toBe(true);
    await b.turn('up');
    await b.turn('push crank');
    expect(b.world.evaluate(exitHiddenKey(b.id('yard'), Direction.NORTH))).toBe(false);
    expect(b.world.evaluate(exitHiddenKey(b.id('annex'), Direction.SOUTH))).toBe(true);
  });

  it('a hidden compass exit refuses no_exit_that_way, its inferred reverse is hidden too, and both open together', async () => {
    const b = await bootTurns(SOURCE);
    await b.turn('up');
    expect(whereIs(b)).toBe(b.id('loading-dock'));
    const barred = await b.turn('north');
    expect(ids(barred)).toContain('if.action.going.no_exit_that_way');
    expect(whereIs(b)).toBe(b.id('loading-dock'));
    // The reverse, read where going reads it.
    expect(b.world.evaluate(exitHiddenKey(b.id('yard'), Direction.SOUTH))).toBe(true);
    const yard = b.world.getEntity(b.id('yard'))!;
    const way = TraversalBehavior.wayFor(b.world, yard, Direction.SOUTH, { kind: 'walker', entity: b.player });
    expect(way.kind === 'refused' && way.reason).toBe('hidden');

    await b.turn('push crank');
    await b.turn('north');
    expect(whereIs(b)).toBe(b.id('yard'));
    await b.turn('south');
    expect(whereIs(b)).toBe(b.id('loading-dock'));
  });
});

describe('`define action … while` (ADR-378 D5, GH #317)', () => {
  it('claims its bare verb only where the condition holds; elsewhere the standard verb\'s clarification prints', async () => {
    const b = await bootTurns(SOURCE);
    const elsewhere = await b.turnText('drop');
    expect(elsewhere.text).toMatch(/What do you want to drop\?/);
    expect(elsewhere.text).not.toContain('You let go.');

    await b.turn('push knob');
    await b.turn('follow the cables');
    const here = await b.turnText('drop');
    expect(here.text).toContain('You let go.');
  });
});

describe('pushing a thing between rooms (ADR-378 D6, D7)', () => {
  it('the blocked phrase guards the push; once clear, the trolley and the player arrive together and the room\'s clause fires', async () => {
    const b = await bootTurns(SOURCE);
    await b.turn('push knob');
    await b.turn('follow the cables');
    expect(whereIs(b)).toBe(b.id('sorting-room'));

    const sealed = await b.turnText('push trolley east');
    expect(sealed.text).toContain('The dock door is sealed.');
    expect(b.world.getLocation(b.id('trolley'))).toBe(b.id('sorting-room'));
    expect(whereIs(b)).toBe(b.id('sorting-room'));

    await b.turn('push lever');
    const pushed = await b.turnText('push cart east');
    expect(pushed.text).toContain('You push the trolley east.');
    expect(b.world.getLocation(b.id('trolley'))).toBe(b.id('loading-dock'));
    expect(whereIs(b)).toBe(b.id('loading-dock'));
    expect(pushed.text).toContain('Sacks everywhere.');
  });
});

describe("the thing's own way: the `pushing` block (ADR-378 D6b)", () => {
  it('stamps the thing on the named way only, and the push plays by it', async () => {
    const b = await bootTurns(SOURCE);
    const yard = b.world.getEntity(b.id('yard'))!;
    const annex = b.world.getEntity(b.id('annex'))!;
    // The grant decides the pushed things alone; the vehicles stay the room's.
    expect(RoomBehavior.getExit(yard, Direction.NORTH)?.admits).toEqual({ pushed: [b.id('crate')] });
    // `from … to` is one way: the Annex's own line back carries no stamp.
    expect(RoomBehavior.getExit(annex, Direction.SOUTH)?.admits).toBeUndefined();

    await b.turn('up');
    await b.turn('push crank');
    await b.turn('north');
    expect(whereIs(b)).toBe(b.id('yard'));
    // The barrel has no block and the way carries no class word: refused.
    const barrel = await b.turnText('push barrel north');
    expect(barrel.text).toContain("You can't push the barrel that way.");
    expect(b.world.getLocation(b.id('barrel'))).toBe(b.id('yard'));
    // The crate's own block admits it.
    await b.turn('push crate north');
    expect(b.world.getLocation(b.id('crate'))).toBe(b.id('annex'));
    expect(whereIs(b)).toBe(b.id('annex'));
  });
});
