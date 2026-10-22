/**
 * adr-376-expanses-runtime.test.ts — ADR-376's runtime through the REAL
 * engine (Chord 4.0 Phase 13, Slice 3): the expanse, the open vehicle, the
 * floating thing and the sight reads lowered by the loader, stepped and
 * drifted by the core state-machine plugin, read by the evaluator and the
 * sequence anchor, reported through the stock lines. Driving is by
 * statement (`drive: control`), since the player's own steering of an open
 * vehicle is the stdlib slice's. Every assertion reads a location, a trait
 * field or the turn's rendered text (AC-1, AC-1b, AC-1a's conditions and
 * anchor; the Dungeo chain is the gate for everything else).
 */
import { describe, expect, it } from 'vitest';
import { edgePhraseOf, ExpanseTrait, FloatingTrait, IdentityTrait, LandmarkTrait, RoomTrait, SightTrait, VehicleTrait, WorldModel, type IFEntity, type VehicleOpenMovement } from '@sharpee/world-model';
import { bootTurns, type BootedTurns } from './helpers/boot-turns';

const SOURCE = `story
  title: The Belt
  authors:
    T
  id: the-belt
  story-version: 0.0.1
  use expanses

create the Belt
  an expanse
  size: 20 by 8
  visibility: 10
  drift: 1 unit every 4 turns
  north is blocked: ice-fields
  aka belt, void

  Black, and the slow tumble of rock against it.

  landmarks
    the Mining Platform: 3, 3
    the Derelict: 14, 6
  end landmarks

define phrase ice-fields
  Ice closes the way north.
end phrase

create the Mining Platform
  a room
  seen from afar: a cluster of lights on a lopsided rock
  sight: 4

  A platform.

create the Derelict
  a room
  seen from afar: a long dead hull, turning slowly end over end

  A hull.

create the skiff
  a vehicle
  in the Belt at 3, 3
  movement: open
  carries: in
  drive: control
  pace: 1 turn
  stride: 1 unit
  sight: 6
  seen from afar: a glint of hull against the dark
  aka craft

  A skiff.

create the barge
  a vehicle
  in the Belt at 10, 2
  movement: open
  carries: in
  drive: control
  pace: 2 turns
  stride: 2 units
  sight: 3
  seen from afar: a low dark hull

  A barge.

create the helm
  a thing, pushable
  in the skiff

  The helm.

  on the player pushing
    start the skiff heading east
  end on

create the compass
  a thing, pushable
  in the skiff

  A compass.

  on the player pushing
    start the skiff heading north
  end on

create the tiller
  a thing, pushable
  in the skiff

  A tiller.

  on the player pushing
    start the skiff heading west
  end on

create the console
  a thing, pushable
  in the skiff

  A console.

  on the player pushing
    send the skiff to the Derelict
  end on

create the plotter
  a thing, pushable
  in the skiff

  A plotter.

  on the player pushing
    send the skiff to 6, 1
  end on

create the brake
  a thing, pushable
  in the skiff

  A brake.

  on the player pushing
    stop the skiff
  end on

create the fog horn
  a thing, pushable
  in the skiff
  aka horn

  A horn.

  on the player pushing
    set the Belt's visibility to 2
  end on

create the lookout bell
  a thing, pushable
  in the skiff
  aka bell

  A bell.

  on the player pushing
    phrase seen when the Derelict is in sight
    phrase near when the Derelict is close by
    phrase middling when the Derelict is in the distance
    phrase horizon when the Derelict is on the horizon
    phrase close when the skiff is within 3 of the Derelict
    phrase cell when the skiff is within 1 of 13, 5
  end on

define phrase seen
  Seen.
end phrase

define phrase near
  Near.
end phrase

define phrase middling
  Middling.
end phrase

define phrase horizon
  Horizon.
end phrase

define phrase close
  Close.
end phrase

define phrase cell
  Cell.
end phrase

create the winch
  a thing, pushable
  in the skiff

  A winch.

  on the player pushing
    move the anchor to the skiff's location
    move the bottle to the skiff's location
    move the cask to the skiff's location
  end on

create the anchor
  a thing
  in the skiff

  An anchor.

create the bottle
  a thing
  in the skiff

  A bottle.

  phrase lost-overboard:
    The bottle sinks without a trace.

create the telescope
  a thing
  in the skiff
  sight: 12

  A telescope.

create the cask
  a thing, floats
  in the Belt at 5, 3
  aka cask

  A tarred cask.

define phrase land-ho
  Land ho.
end phrase

define sequence landfall
  when the Derelict comes into sight
    phrase land-ho
end sequence

create the beacon
  a thing, pushable
  in the Mining Platform

  A beacon.

  on the player pushing
    start the skiff heading northeast
  end on

create the relay
  a thing, pushable
  in the Mining Platform

  A relay.

  on the player pushing
    send the skiff to 13, 6
  end on

create the hatch
  a thing, pushable
  in the Mining Platform

  A hatch.

  on the player pushing
    move the player to the Derelict
  end on

create the harbour bell
  a thing, pushable
  in the Mining Platform

  A bell.

  on the player pushing
    phrase skiff-seen when the skiff is in sight
  end on

create the hull bell
  a thing, pushable
  in the Derelict

  A bell.

  on the player pushing
    phrase skiff-seen when the skiff is in sight
  end on

define phrase skiff-seen
  A glint of hull.
end phrase

create Alex
  a person
  playable
  starts in the Mining Platform

  You.

before the game starts
  change the player to Alex
end before
`;

const FUNICULAR = `story
  title: The Funicular
  authors:
    T
  id: the-funicular
  story-version: 0.0.1

create the Lower Station
  a room

  The lower station.

create the Upper Station
  a room

  The upper station.

create the funicular
  a vehicle
  in the Lower Station
  movement: line
  carries: in
  drive: control
  stops: the Lower Station, the Upper Station
  direction: one-way
  pace: 1 turn

  A funicular car.

create the switch
  a thing, pushable
  in the funicular

  A switch.

  on the player pushing
    start the funicular
  end on

create Alex
  a person
  playable
  starts in the Lower Station

  You.

before the game starts
  change the player to Alex
end before
`;

function named(b: BootedTurns, name: string): IFEntity {
  const found = b.world.getAllEntities().find((e) => e.name === name);
  expect(found, name).toBeDefined();
  return found!;
}

function skiff(b: BootedTurns): VehicleOpenMovement {
  return named(b, 'skiff').get(VehicleTrait)!.movement as VehicleOpenMovement;
}

function where(b: BootedTurns, name: string): string | undefined {
  return b.world.getLocation(named(b, name).id);
}

async function waitTurns(b: BootedTurns, n: number): Promise<string> {
  let text = '';
  for (let i = 0; i < n; i++) text += (await b.turnText('wait')).text;
  return text;
}

describe('lowering (D2, D3, D5, D6, D8, D10)', () => {
  it('the expanse is a room with its size, landmarks, visibility, drift and edge; the open vehicle, outlook, instrument and floating thing carry their fields', async () => {
    const b = await bootTurns(SOURCE);
    const belt = named(b, 'Belt');
    expect(belt.has('room')).toBe(true);
    const expanse = belt.get(ExpanseTrait)!;
    expect(expanse).toMatchObject({ width: 20, height: 8, visibility: 10, drift: 4, turnsToDrift: 4 });
    expect(expanse.landmarks).toEqual({ [named(b, 'Mining Platform').id]: { x: 3, y: 3 }, [named(b, 'Derelict').id]: { x: 14, y: 6 } });
    // The edge's phrase is its blocked-exit line, read where every blocked way's is.
    expect(edgePhraseOf(b.world, belt, 'NORTH')).toBe('Ice closes the way north.');
    expect(edgePhraseOf(b.world, belt, 'WEST')).toBeUndefined();

    expect(skiff(b)).toMatchObject({ kind: 'open', drive: 'control', pace: 1, stride: 1, sight: 6, heading: null, course: null, position: null, atEdge: null });
    // On a landmark's cell the vehicle is in the landmark's room; on an open cell it is in the expanse at that cell.
    expect(where(b, 'skiff')).toBe(named(b, 'Mining Platform').id);
    expect(named(b, 'barge').get(VehicleTrait)!.movement).toMatchObject({ kind: 'open', pace: 2, stride: 2, sight: 3, position: { x: 10, y: 2 } });
    expect(where(b, 'barge')).toBe(belt.id);
    // D19 (Q7 A): the extension's data rides its own trait and the open model, never a core trait.
    expect(skiff(b).seenFromAfar).toBe('a glint of hull against the dark');
    expect(named(b, 'Derelict').get(LandmarkTrait)).toMatchObject({ sight: 0, seenFromAfar: 'a long dead hull, turning slowly end over end' });
    expect(named(b, 'Mining Platform').get(LandmarkTrait)!.sight).toBe(4);
    expect('sight' in named(b, 'Mining Platform').get(RoomTrait)!).toBe(false);
    expect('seenFromAfar' in named(b, 'Derelict').get(IdentityTrait)!).toBe(false);
    expect(named(b, 'telescope').has(LandmarkTrait.type)).toBe(false);
    expect(named(b, 'telescope').get(SightTrait)!.sight).toBe(12);
    expect(named(b, 'cask').get(FloatingTrait)!.position).toEqual({ x: 5, y: 3 });
    expect(where(b, 'cask')).toBe(belt.id);
  });
});

describe('heading, course, arrival and stop (D3, D5)', () => {
  it('start from a landmark takes its row, moves into the expanse and steps east every turn; stop keeps the position', async () => {
    const b = await bootTurns(SOURCE);
    await b.turn('enter skiff');
    expect(skiff(b).position).toBeNull();
    await b.turn('push helm');
    // The tick on the turn of the start counts toward the pace (ADR-366 D5e's reading).
    expect(where(b, 'skiff')).toBe(named(b, 'Belt').id);
    expect(b.world.getLocation(b.player.id)).toBe(named(b, 'skiff').id);
    expect(skiff(b)).toMatchObject({ heading: 'EAST', position: { x: 4, y: 3 } });
    await b.turn('push brake');
    expect(skiff(b)).toMatchObject({ heading: null, course: null, position: { x: 4, y: 3 } });
    await b.turn('wait');
    expect(skiff(b).position).toEqual({ x: 4, y: 3 });
  });

  it('a course for a landmark runs diagonal then straight and arrives in its room with no position, carrying the player', async () => {
    const b = await bootTurns(SOURCE);
    await b.turn('enter skiff');
    await b.turn('push console');
    expect(skiff(b)).toMatchObject({ course: { x: 14, y: 6 }, heading: null, position: { x: 4, y: 4 } });
    await waitTurns(b, 2);
    expect(skiff(b).position).toEqual({ x: 6, y: 6 });
    const text = await waitTurns(b, 8);
    expect(where(b, 'skiff')).toBe(named(b, 'Derelict').id);
    expect(skiff(b)).toMatchObject({ course: null, position: null });
    expect(b.world.getContainingRoom(b.player.id)?.id).toBe(named(b, 'Derelict').id);
    expect(text).toContain('The skiff arrives at the Derelict.');
  });

  it('a course for a cell stops on it and the rider reads the stop', async () => {
    const b = await bootTurns(SOURCE);
    await b.turn('enter skiff');
    await b.turn('push plotter');
    const text = await waitTurns(b, 3);
    expect(skiff(b)).toMatchObject({ course: null, position: { x: 6, y: 1 } });
    expect(text).toContain('The skiff comes to a stop.');
  });

  it('a save under way restores course, position and pace; a floating thing restores at its cell', async () => {
    const b = await bootTurns(SOURCE);
    await b.turn('enter skiff');
    await b.turn('push console');
    await b.turn('wait');
    const restored = new WorldModel();
    restored.loadJSON(b.world.toJSON());
    const again = restored.getEntity(named(b, 'skiff').id)!.get(VehicleTrait)!.movement as VehicleOpenMovement;
    expect(again).toMatchObject({ kind: 'open', course: { x: 14, y: 6 }, position: { x: 5, y: 5 }, turnsToStep: 1 });
    expect(restored.getEntity(named(b, 'cask').id)!.get(FloatingTrait)!.position).toEqual(named(b, 'cask').get(FloatingTrait)!.position);
  });
});

describe('edges (D8)', () => {
  it('a written edge stops the skiff at the last cell inside with the author\'s phrase, once; a heading toward it is then refused', async () => {
    const b = await bootTurns(SOURCE);
    await b.turn('enter skiff');
    await b.turn('push compass');
    expect(skiff(b).position).toEqual({ x: 3, y: 4 });
    const text = await waitTurns(b, 4);
    expect(skiff(b)).toMatchObject({ position: { x: 3, y: 7 }, atEdge: 'NORTH', heading: null });
    expect(text).toContain('Ice closes the way north.');
    expect(text.split('Ice closes the way north.').length).toBe(2);
    await b.turn('push compass');
    expect(skiff(b)).toMatchObject({ heading: null, atEdge: 'NORTH' });
    await b.turn('push helm');
    expect(skiff(b)).toMatchObject({ heading: 'EAST', atEdge: null, position: { x: 4, y: 7 } });
  });

  it('an unwritten edge uses the stock line', async () => {
    const b = await bootTurns(SOURCE);
    await b.turn('enter skiff');
    await b.turn('push tiller');
    const text = await waitTurns(b, 3);
    expect(skiff(b)).toMatchObject({ position: { x: 0, y: 3 }, atEdge: 'WEST' });
    expect(text).toContain('You can go no farther that way.');
  });
});

describe('floating things (D9, D10)', () => {
  it('the skiff stops alongside the cask with the stock line', async () => {
    const b = await bootTurns(SOURCE);
    await b.turn('enter skiff');
    await b.turn('push helm');
    const text = await waitTurns(b, 1);
    expect(skiff(b)).toMatchObject({ position: { x: 5, y: 3 }, heading: null });
    expect(text).toContain('The skiff comes alongside the cask.');
  });

  it('the cask drifts one unit every four turns from the seeded point, deterministically, and never off the expanse', async () => {
    const b = await bootTurns(SOURCE);
    await waitTurns(b, 3);
    expect(named(b, 'cask').get(FloatingTrait)!.position).toEqual({ x: 5, y: 3 });
    await waitTurns(b, 1);
    const after = named(b, 'cask').get(FloatingTrait)!.position!;
    expect(Math.max(Math.abs(after.x - 5), Math.abs(after.y - 3))).toBe(1);
    expect(named(b, 'Belt').get(ExpanseTrait)!.turnsToDrift).toBe(4);
    const twin = await bootTurns(SOURCE);
    await waitTurns(twin, 4);
    expect(named(twin, 'cask').get(FloatingTrait)!.position).toEqual(after);
    await waitTurns(b, 40);
    const far = named(b, 'cask').get(FloatingTrait)!.position;
    const belt = named(b, 'Belt').get(ExpanseTrait)!;
    if (far) {
      expect(far.x).toBeGreaterThanOrEqual(0);
      expect(far.x).toBeLessThan(belt.width);
      expect(far.y).toBeGreaterThanOrEqual(0);
      expect(far.y).toBeLessThan(belt.height);
    } else {
      // Washed up: the cask is in a landmark's room.
      expect(Object.keys(belt.landmarks)).toContain(where(b, 'cask'));
    }
  });

  it('a thing that does not float, moved into the expanse, goes offstage: the stock line, or the thing\'s own phrase', async () => {
    const b = await bootTurns(SOURCE);
    await b.turn('enter skiff');
    await b.turn('push helm');
    const text = (await b.turnText('push winch')).text;
    expect(where(b, 'anchor')).toBeUndefined();
    expect(where(b, 'bottle')).toBeUndefined();
    expect(text).toContain('The anchor drifts away.');
    expect(text).toContain('The bottle sinks without a trace.');
    // A floating thing is not lost: it keeps its place in the expanse.
    expect(where(b, 'cask')).toBe(named(b, 'Belt').id);
    expect(named(b, 'cask').get(FloatingTrait)!.position).not.toBeNull();
    expect(text).not.toContain('The cask drifts away.');
  });
});

describe('sight (D6, D7)', () => {
  it('the bands, within, the visibility cap and the anchor read the player\'s lookout', async () => {
    const b = await bootTurns(SOURCE);
    await b.turn('enter skiff');
    const platform = (await b.turnText('push bell')).text;
    expect(platform).not.toContain('Seen.');
    await b.turn('push console');
    // A clause reads the position before its turn's tick. At (4,4): 10.2
    // units from the Derelict — out of sight.
    expect((await b.turnText('push bell')).text).not.toContain('Seen.');
    await waitTurns(b, 2);
    // At (7,6): 7 units — still out of sight.
    const seven = (await b.turnText('push bell')).text;
    expect(seven).not.toContain('Seen.');
    // At (8,6): 6 units — on the horizon; the sequence fires the first turn
    // it is in sight, whichever side of the tick the scheduler reads it.
    const eight = (await b.turnText('push bell')).text;
    expect(eight).toContain('Seen.');
    expect(eight).toContain('Horizon.');
    expect(eight).not.toContain('Near.');
    expect(eight).not.toContain('Middling.');
    expect(seven + eight).toContain('Land ho.');
    expect((seven + eight).split('Land ho.').length).toBe(2);
    await waitTurns(b, 1);
    // At (10,6): 4 units — in the distance, not within 3.
    const ten = (await b.turnText('push bell')).text;
    expect(ten).toContain('Middling.');
    expect(ten).not.toContain('Close.');
    // At (11,6): 3 units — within 3; the fog cuts the cap to 2.
    const fog = (await b.turnText('push fog horn')).text;
    expect(fog).not.toContain('Land ho.');
    expect(named(b, 'Belt').get(ExpanseTrait)!.visibility).toBe(2);
    // At (12,6): 2 units — under the cap: in sight, on the horizon of a sight of 2, within 3.
    const capped = (await b.turnText('push bell')).text;
    expect(capped).toContain('Seen.');
    expect(capped).toContain('Horizon.');
    expect(capped).toContain('Close.');
    expect(capped).not.toContain('Cell.');
    // At (13,6): 1 unit — in the distance of a sight of 2; the next tick arrives.
    const one = (await b.turnText('push bell')).text;
    expect(one).toContain('Middling.');
    expect(one).toContain('Cell.');
    expect(one).toContain('The skiff arrives at the Derelict.');
    expect(where(b, 'skiff')).toBe(named(b, 'Derelict').id);
  });

  it('a landmark room with sight looks out over the expanse; one without sees nothing of it', async () => {
    const b = await bootTurns(SOURCE);
    // Alex on the Platform (sight 4); the skiff leaves it to the northeast, one cell out.
    expect((await b.turnText('push harbour bell')).text).not.toContain('A glint of hull.');
    await b.turn('push beacon');
    expect(skiff(b).position).toEqual({ x: 4, y: 4 });
    expect((await b.turnText('push harbour bell')).text).toContain('A glint of hull.');
    await waitTurns(b, 4);
    // Stopped at the north edge, (7,7): 5.7 units — beyond the Platform's outlook of four.
    expect(skiff(b)).toMatchObject({ position: { x: 7, y: 7 }, atEdge: 'NORTH' });
    expect((await b.turnText('push harbour bell')).text).not.toContain('A glint of hull.');

    // Sent to the cell beside the Derelict, which has no `sight:`.
    await b.turn('push relay');
    await waitTurns(b, 5);
    expect(skiff(b)).toMatchObject({ position: { x: 13, y: 6 }, course: null });
    await b.turn('push hatch');
    expect(b.world.getContainingRoom(b.player.id)?.id).toBe(named(b, 'Derelict').id);
    expect((await b.turnText('push hull bell')).text).not.toContain('A glint of hull.');
  });
});

const SHORE = `story
  title: The Shore
  authors:
    T
  id: the-shore
  story-version: 0.0.1
  use expanses

create the Pool
  an expanse
  size: 3 by 3
  drift: 1 unit every 1 turn

  A pool.

  landmarks
    the North Shore: 1, 2
    the South Shore: 1, 0
    the East Shore: 2, 1
    the West Shore: 0, 1
    the Northeast Rock: 2, 2
    the Northwest Rock: 0, 2
    the Southeast Rock: 2, 0
    the Southwest Rock: 0, 0
  end landmarks

create the North Shore
  a room
  seen from afar: a shore

  The north shore.

create the South Shore
  a room
  seen from afar: a shore

  The south shore.

create the East Shore
  a room
  seen from afar: a shore

  The east shore.

create the West Shore
  a room
  seen from afar: a shore

  The west shore.

create the Northeast Rock
  a room
  seen from afar: a rock

  A rock.

create the Northwest Rock
  a room
  seen from afar: a rock

  A rock.

create the Southeast Rock
  a room
  seen from afar: a rock

  A rock.

create the Southwest Rock
  a room
  seen from afar: a rock

  A rock.

create the raft
  a vehicle
  in the Pool at 1, 2
  movement: open
  carries: in
  drive: control
  pace: 1 turn
  stride: 1 unit
  sight: 3
  seen from afar: a raft

  A raft.

create the bottle
  a thing, floats
  in the Pool at 1, 1

  A bottle.

create the lever
  a thing, pushable
  in the North Shore

  A lever.

  on the player pushing
    start the raft heading south
  end on

create Alex
  a person
  playable
  starts in the North Shore

  You.

before the game starts
  change the player to Alex
end before
`;

describe('wash-up and the silence of an empty vehicle (D10, ADR-366 D7a)', () => {
  it('a floating thing whose drift enters a landmark cell washes up in that room, deterministically at the seed', async () => {
    const b = await bootTurns(SHORE);
    // Every neighbour of (1,1) is a landmark: the first drift washes the bottle up somewhere.
    await b.turn('wait');
    const bottle = named(b, 'bottle');
    expect(bottle.get(FloatingTrait)!.position).toBeNull();
    const shore = where(b, 'bottle')!;
    expect(Object.keys(named(b, 'Pool').get(ExpanseTrait)!.landmarks)).toContain(shore);
    const twin = await bootTurns(SHORE);
    await twin.turn('wait');
    expect(b.world.getEntity(shore)!.name).toBe(twin.world.getEntity(where(twin, 'bottle')!)!.name);
  });

  it('a vehicle nobody rides is not told to a player ashore: its coming alongside is recorded out on the pool, and they are absent from it', async () => {
    const b = await bootTurns(SHORE);
    await b.turn('wait');
    const bottle = named(b, 'bottle');
    bottle.get(FloatingTrait)!.position = { x: 1, y: 1 };
    b.world.moveEntity(bottle.id, named(b, 'Pool').id);
    named(b, 'Pool').get(ExpanseTrait)!.drift = undefined;
    const { events } = await b.turnText('push lever');
    const alongside = events.find((e) => e.type === 'if.event.vehicle_alongside')!;
    expect(alongside).toMatchObject({ presence: 'absent', entities: { location: named(b, 'Pool').id }, data: { aboard: false, thingId: bottle.id } });
    const raft = named(b, 'raft').get(VehicleTrait)!.movement as VehicleOpenMovement;
    expect(raft).toMatchObject({ position: { x: 1, y: 1 }, heading: null });
  });
});

describe('vehicle-at-end (ADR-366 D7a, GH #600)', () => {
  it('a one-way line started at its end tells the rider', async () => {
    const b = await bootTurns(FUNICULAR);
    await b.turn('enter funicular');
    const first = (await b.turnText('push switch')).text;
    expect(first).toContain('The funicular arrives at the Upper Station.');
    const second = (await b.turnText('push switch')).text;
    expect(second).toContain('The funicular is at the end of its line.');
    expect(where(b, 'funicular')).toBe(named(b, 'Upper Station').id);
  });
});
