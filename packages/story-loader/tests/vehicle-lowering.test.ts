/**
 * vehicle-lowering.test.ts — ADR-366 through the REAL loader (Chord 4.0
 * Phase 11, Slice 2): a `vehicle` block lowers onto VehicleTrait's model,
 * EnterableTrait's preposition and the container or supporter it composes;
 * `admits:` lands on RoomTrait.admits (a region's on every member room);
 * rooms aboard carry AboardTrait with `to outside` as a computed exit the
 * registered resolver answers with the vehicle's room; a `position` block
 * lowers to live guards. Every assertion reads trait or world state (AC-2:
 * a field the platform stopped reading would fail here).
 */
import { describe, expect, it } from 'vitest';
import { compile } from '@sharpee/chord';
import {
  AboardTrait,
  ContainerTrait,
  Direction,
  EnterableTrait,
  RoomBehavior,
  RoomTrait,
  SupporterTrait,
  VehicleTrait,
  WorldModel,
  type IFEntity,
} from '@sharpee/world-model';
import { EngineRandomService } from '@sharpee/engine';
import { createStory, type ChordStory } from '../src';
import { bootEngine } from './helpers/boot-engine';

const HEADER = `story
  title: Conveyances
  authors:
    T
  id: conveyances
  story-version: 0.0.1
`;

const WORLD = `
create the Well Bottom
  a room
  up to the Top of the Well

  The bottom.

create the Top of the Well
  a room

  The top.

create the Harbour
  a room
  admits: the Marigold

  The harbour.

create the Northern Sea
  a region
  admits: the Marigold
  rooms Open Water 1 to 2

    Grey water.

create the Reef
  a room

  The reef.

create the water
  a thing
  in the Well Bottom

  Water.

create Alex
  a person
  playable
  starts in the Well Bottom

  You.

before the game starts
  change the player to Alex
end before

create the bucket
  a vehicle
  in the Well Bottom
  movement: line
  carries: in
  drive: state
  stops: the Well Bottom, the Top of the Well
  direction: both
  holds 3

  A bucket.

  position
    when the bucket holds the water: the Top of the Well
    otherwise: the Well Bottom
  end position

create the bicycle
  a vehicle
  in the Harbour
  movement: streets
  carries: on
  drive: player
  commands: compass

  A bicycle.

create the Marigold
  a vehicle
  in the Harbour
  movement: compass
  carries: in
  drive: player
  commands: compass
  pace: 2 turns

  A barque.

create the tram car
  a vehicle
  in the Well Bottom
  movement: line
  carries: in
  drive: control
  stops: the Well Bottom, the Top of the Well
  direction: one-way
  pace: 3 turns

  A tram.

create the Sparrow
  a vehicle
  in the Harbour
  movement: flight
  drive: control
  destinations: the Harbour, the Reef
  passage: 5 turns
  aboard: the Airlock, the Hold
  boarded through: the Airlock

  A courier.

create the Airlock
  a room
  east to the Hold
  west to outside

  A closet.

create the Hold
  a room

  A hold.
`;

function boot(): { story: ChordStory; world: WorldModel; byName: (name: string) => IFEntity } {
  const result = compile(HEADER + WORLD);
  const errors = result.diagnostics.filter((d) => d.severity === 'error' && d.code !== 'analysis.missing-ifid');
  expect(errors, errors.map((d) => `${d.code}: ${d.message}`).join('\n')).toEqual([]);
  const story = createStory(result.ir, { seed: 7 });
  const world = new WorldModel();
  story.initializeWorld(world);
  const player = story.createPlayer(world);
  world.setPlayer(player.id);
  const byName = (name: string) => {
    const found = world.getAllEntities().find((e) => e.name === name);
    expect(found, name).toBeDefined();
    return found!;
  };
  return { story, world, byName };
}

describe('the vehicle kind lowers onto the trait (ADR-366 D1, D2, D5)', () => {
  it('`carries: in` composes an enterable container; `holds` bounds it', () => {
    const { byName } = boot();
    const bucket = byName('bucket');
    expect(bucket.get(EnterableTrait)?.preposition).toBe('in');
    expect(bucket.get(ContainerTrait)?.capacity?.maxItems).toBe(3);
    expect(bucket.has(SupporterTrait.type)).toBe(false);
  });

  it('`carries: on` composes an enterable supporter', () => {
    const { byName } = boot();
    const bicycle = byName('bicycle');
    expect(bicycle.get(EnterableTrait)?.preposition).toBe('on');
    expect(bicycle.has(SupporterTrait.type)).toBe(true);
    expect(bicycle.has(ContainerTrait.type)).toBe(false);
  });

  it('a state-driven line lowers its stops in order, its direction and no pace', () => {
    const { byName } = boot();
    const bucket = byName('bucket');
    expect(bucket.get(VehicleTrait)?.model).toEqual({
      kind: 'line',
      stops: [byName('Well Bottom').id, byName('Top of the Well').id],
      oneWay: false,
      drive: 'state',
      underWay: false,
      travelDirection: 'onward',
      turnsToStep: 0,
    });
    expect(bucket.get(VehicleTrait)?.commands).toBeUndefined();
  });

  it('a controlled one-way line lowers its pace', () => {
    const { byName } = boot();
    expect(byName('tram car').get(VehicleTrait)?.model).toMatchObject({ kind: 'line', oneWay: true, drive: 'control', pace: 3 });
  });

  it('a streets vehicle lowers with the player\'s command sets', () => {
    const { byName } = boot();
    const trait = byName('bicycle').get(VehicleTrait)!;
    expect(trait.model).toEqual({ kind: 'streets' });
    expect(trait.commands).toEqual(['compass']);
  });

  it('a compass vehicle lowers its drive and pace, at rest', () => {
    const { byName } = boot();
    expect(byName('Marigold').get(VehicleTrait)?.model).toEqual({ kind: 'compass', drive: 'player', pace: 2, heading: null, turnsToStep: 0 });
  });

  it('a flight vehicle lowers its destinations and passage, at rest, and composes no enclosure', () => {
    const { byName } = boot();
    const sparrow = byName('Sparrow');
    expect(sparrow.get(VehicleTrait)?.model).toEqual({
      kind: 'flight',
      drive: 'control',
      destinations: [byName('Harbour').id, byName('Reef').id],
      passage: 5,
      destination: null,
      turnsRemaining: 0,
    });
    expect(sparrow.has(EnterableTrait.type)).toBe(false);
    expect(sparrow.has(ContainerTrait.type)).toBe(false);
    // `boarded through: the Airlock` (D7) is where `enter` and `board` land.
    expect(sparrow.get(VehicleTrait)?.boardingRoom).toBe(byName('Airlock').id);
  });
});

describe('`admits:` lands on the rooms (ADR-366 D6)', () => {
  it('a room admits the vehicles it names and no other', () => {
    const { byName } = boot();
    expect(byName('Harbour').get(RoomTrait)?.admits).toEqual({ vehicles: [byName('Marigold').id], pushed: [] });
    expect(byName('Reef').get(RoomTrait)?.admits).toEqual({ vehicles: [], pushed: [] });
  });

  it('a region\'s line reaches every member room', () => {
    const { byName } = boot();
    const marigold = byName('Marigold').id;
    expect(byName('Open Water 1').get(RoomTrait)?.admits).toEqual({ vehicles: [marigold], pushed: [] });
    expect(byName('Open Water 2').get(RoomTrait)?.admits).toEqual({ vehicles: [marigold], pushed: [] });
  });
});

describe('the `position` block lowers to live guards (ADR-366 D5a)', () => {
  it('reads the world each time: the water decides the stop', () => {
    const { story, world, byName } = boot();
    const bucket = byName('bucket');
    const position = story.getVehiclePosition(bucket.id)!;
    expect(position.rows).toHaveLength(1);
    expect(position.rows[0].stopId).toBe(byName('Top of the Well').id);
    expect(position.otherwise).toBe(byName('Well Bottom').id);
    expect(position.rows[0].guard(world)).toBe(false);
    world.moveEntity(byName('water').id, bucket.id);
    expect(position.rows[0].guard(world)).toBe(true);
  });

  it('a vehicle with no block has none', () => {
    const { story, byName } = boot();
    expect(story.getVehiclePosition(byName('tram car').id)).toBeUndefined();
  });
});

describe('rooms aboard and `to outside` (ADR-366 D7)', () => {
  it('each room aboard carries AboardTrait naming the vehicle; the outside exit is a computed exit over the destinations', () => {
    const { byName } = boot();
    const airlock = byName('Airlock');
    const aboard = airlock.get(AboardTrait)!;
    expect(aboard.vehicleId).toBe(byName('Sparrow').id);
    expect(aboard.computedExits[Direction.WEST]?.candidates).toEqual([byName('Harbour').id, byName('Reef').id]);
    expect(RoomBehavior.getExit(airlock, Direction.EAST)?.destination).toBe(byName('Hold').id);
    expect(RoomBehavior.getExit(airlock, Direction.WEST)).toBeNull();
    expect(byName('Hold').get(AboardTrait)?.vehicleId).toBe(byName('Sparrow').id);
    expect(byName('Harbour').has(AboardTrait.type)).toBe(false);
  });

  it('resolves to wherever the vehicle is on each use, and is blocked while the vehicle is under way', () => {
    const { world, byName } = boot();
    const airlock = byName('Airlock');
    const sparrow = byName('Sparrow');
    const ctx = { world, actorId: world.getPlayer()!.id, random: new EngineRandomService(1) };
    expect(RoomBehavior.resolveExit(airlock, Direction.WEST, ctx)).toEqual({ kind: 'exit', destination: byName('Harbour').id });
    world.moveEntity(sparrow.id, byName('Reef').id);
    expect(RoomBehavior.resolveExit(airlock, Direction.WEST, ctx)).toEqual({ kind: 'exit', destination: byName('Reef').id });
    const model = sparrow.get(VehicleTrait)!.model;
    if (model?.kind === 'flight') model.destination = byName('Harbour').id;
    expect(RoomBehavior.resolveExit(airlock, Direction.WEST, ctx)).toMatchObject({ kind: 'blocked', messageId: 'if.action.going.vehicle_under_way' });
  });
});

describe('the driving statements and the vehicle reads through a played story (ADR-366 D5f, D5e)', () => {
  const PLAYED = HEADER + `
create the Well Bottom
  a room

  The bottom.

create the Top of the Well
  a room

  The top.

create the Harbour
  a room
  north to the Reef

  The harbour.

create the Reef
  a room
  admits: the Marigold

  The reef.

create Alex
  a person
  playable
  starts in the Well Bottom

  You.

before the game starts
  change the player to Alex
end before

create the tram car
  a vehicle
  in the Well Bottom
  movement: line
  carries: in
  drive: control
  stops: the Well Bottom, the Top of the Well
  direction: both
  pace: 2 turns

  A tram.

create the Marigold
  a vehicle
  in the Harbour
  movement: compass
  carries: in
  drive: control
  pace: 1 turn

  A barque.

create the Sparrow
  a vehicle
  in the Harbour
  movement: flight
  carries: in
  drive: control
  destinations: the Harbour, the Reef
  passage: 5 turns

  A courier.

create the lever
  a thing, pullable
  in the Well Bottom

  A lever.

  on the player pulling
    start the tram car when the tram car is not under way
  end on

create the brake
  a thing, pullable
  in the Well Bottom

  A brake.

  on the player pulling
    stop the tram car when the tram car is under way
  end on

create the tiller
  a thing, pullable
  in the Well Bottom

  A tiller.

  on the player pulling
    start the Marigold heading north when the Marigold is at the Harbour
  end on

create the helm
  a thing, pullable
  in the Well Bottom

  A helm.

  on the player pulling
    stop the Marigold when the Marigold is heading north
  end on

create the plotter
  a thing, pushable
  in the Well Bottom

  A plotter.

  on the player pushing
    send the Sparrow to the Reef when the Sparrow is at the Harbour
  end on
`;

  it('start, stop and send set the machine state, each gated by a vehicle read', async () => {
    const { engine, world } = bootEngine(PLAYED, 3);
    engine.start({ capabilities: { text: true } as never });
    const named = (name: string) => world.getAllEntities().find((e) => e.name === name)!;
    const model = (name: string) => named(name).get(VehicleTrait)!.model;

    await engine.executeTurn('pull lever');
    // `start` arms the pace (2); the machine's tick on the same turn counts
    // one down (Slice 3, ADR-366 D5e), so the turn ends one step away.
    expect(model('tram car')).toMatchObject({ kind: 'line', underWay: true, turnsToStep: 1 });
    await engine.executeTurn('pull brake');
    expect(model('tram car')).toMatchObject({ kind: 'line', underWay: false });

    await engine.executeTurn('pull tiller');
    // `start … heading north` sets the heading; at `pace: 1 turn` the
    // machine's tick on the same turn steps the Marigold north to the Reef,
    // which admits it, and re-arms the pace (Slice 3, ADR-366 D5c, D5e).
    expect(model('Marigold')).toMatchObject({ kind: 'compass', heading: 'NORTH', turnsToStep: 1 });
    expect(world.getLocation(named('Marigold').id)).toBe(named('Reef').id);
    await engine.executeTurn('pull helm');
    expect(model('Marigold')).toMatchObject({ kind: 'compass', heading: null });

    await engine.executeTurn('push plotter');
    expect(model('Sparrow')).toMatchObject({ kind: 'flight', destination: named('Reef').id, turnsRemaining: 5 });
  });

  it('a read that does not hold keeps the statement from running', async () => {
    const { engine, world } = bootEngine(PLAYED, 3);
    engine.start({ capabilities: { text: true } as never });
    const named = (name: string) => world.getAllEntities().find((e) => e.name === name)!;
    world.moveEntity(named('Sparrow').id, named('Reef').id);
    await engine.executeTurn('push plotter');
    expect(named('Sparrow').get(VehicleTrait)!.model).toMatchObject({ kind: 'flight', destination: null, turnsRemaining: 0 });
    await engine.executeTurn('pull helm');
    expect(named('Marigold').get(VehicleTrait)!.model).toMatchObject({ kind: 'compass', heading: null });
  });
});
