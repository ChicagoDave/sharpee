/**
 * vehicle-machine.test.ts — ADR-366 D5e through the REAL engine (Chord 4.0
 * Phase 11, Slice 3): every vehicle's built-in machine ticks in the core
 * state-machine plugin after each turn. A `drive: state` line follows its
 * `position` block; a `drive: control` line steps every `pace` turns and
 * halts at its end; a compass vehicle steps along its heading while the
 * way admits it; a flight vehicle leaves, is nowhere, and arrives; the
 * player aboard reads `vehicle-arrived`, and a sequence anchored on
 * `becomes under way` fires off the trait. Every assertion reads the
 * vehicle's location, the trait's fields, or the turn's rendered text.
 */
import { describe, expect, it } from 'vitest';
import { VehicleTrait, type IFEntity } from '@sharpee/world-model';
import { bootTurns, type BootedTurns } from './helpers/boot-turns';

const SOURCE = `story
  title: The Machine
  authors:
    T
  id: the-machine
  story-version: 0.0.1

create the Well Bottom
  a room
  up to the Top of the Well

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

create the Airlock
  a room
  east to the Hold
  west to outside

  A closet.

create the Hold
  a room

  A hold.

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
  drive: control
  destinations: the Harbour, the Reef
  pace: 2 turns
  aboard: the Airlock, the Hold
  boarded through: the Airlock

  A courier.

create the lever
  a thing, pullable
  in the Well Bottom

  A lever.

  on the player pulling
    start the tram car when the tram car is not under way
  end on

create the tiller
  a thing, pullable
  in the Well Bottom

  A tiller.

  on the player pulling
    start the Marigold heading north
  end on

create the hatch
  a thing, pushable
  in the Well Bottom

  A hatch.

  on the player pushing
    move Alex to the Airlock
  end on

create the gangway
  a thing, pushable
  in the Well Bottom

  A gangway.

  on the player pushing
    move Alex to the Marigold
  end on

create the quay
  a thing, pushable
  in the Well Bottom

  A quay.

  on the player pushing
    move Alex to the Reef
  end on

create the plotter
  a thing, pushable
  in the Airlock

  A plotter.

  on the player pushing
    send the Sparrow to the Reef when the Sparrow is at the Harbour
  end on

define phrase tram-lurch
  The tram car lurches into motion.
end phrase

define sequence the tram ride
  when the tram car becomes under way
    phrase tram-lurch
end sequence
`;

function named(b: BootedTurns, name: string): IFEntity {
  const found = b.world.getAllEntities().find((e) => e.name === name);
  expect(found, name).toBeDefined();
  return found!;
}

function model(b: BootedTurns, name: string): NonNullable<VehicleTrait['movement']> {
  return named(b, name).get(VehicleTrait)!.movement!;
}

function where(b: BootedTurns, name: string): string | undefined {
  return b.world.getLocation(named(b, name).id);
}

describe('a state-driven line follows its position block (D5a)', () => {
  it('rises when the water goes in, falls when it comes out, and the rider reads the arrival', async () => {
    const b = await bootTurns(SOURCE);
    await b.turn('take water');
    await b.turn('enter bucket');
    expect(where(b, 'bucket')).toBe(named(b, 'Well Bottom').id);

    const up = await b.turnText('put water in bucket');
    expect(where(b, 'bucket')).toBe(named(b, 'Top of the Well').id);
    expect(b.world.getLocation(b.player.id)).toBe(named(b, 'bucket').id);
    expect(up.events.some((e) => e.type === 'if.event.vehicle_arrived')).toBe(true);
    expect(up.text).toContain('The bucket arrives at the Top of the Well.');

    const down = await b.turnText('take water');
    expect(where(b, 'bucket')).toBe(named(b, 'Well Bottom').id);
    expect(down.text).toContain('The bucket arrives at the Well Bottom.');

    const still = await b.turnText('wait');
    expect(where(b, 'bucket')).toBe(named(b, 'Well Bottom').id);
    expect(still.events.some((e) => e.type === 'if.event.vehicle_arrived')).toBe(false);
  });
});

describe('a controlled line steps every pace turns and halts at its end (D5a, D5e)', () => {
  it('start arms the pace; the step lands a turn later; the end stop takes it out of the way', async () => {
    const b = await bootTurns(SOURCE);
    await b.turn('enter tram car');
    const started = await b.turnText('pull lever');
    expect(model(b, 'tram car')).toMatchObject({ kind: 'line', underWay: true, turnsToStep: 1 });
    expect(where(b, 'tram car')).toBe(named(b, 'Well Bottom').id);
    expect(started.events.some((e) => e.type === 'if.event.vehicle_arrived')).toBe(false);

    const arrived = await b.turnText('wait');
    expect(where(b, 'tram car')).toBe(named(b, 'Top of the Well').id);
    expect(b.world.getLocation(b.player.id)).toBe(named(b, 'tram car').id);
    expect(arrived.text).toContain('The tram car arrives at the Top of the Well.');
    expect(model(b, 'tram car')).toMatchObject({ kind: 'line', underWay: false, turnsToStep: 0 });

    // Halted at the end: a further turn moves nothing.
    await b.turn('wait');
    expect(where(b, 'tram car')).toBe(named(b, 'Top of the Well').id);
  });

  it('`when the tram car becomes under way` fires on the turn start puts it under way, read off the trait', async () => {
    const b = await bootTurns(SOURCE);
    const before = await b.turnText('wait');
    expect(before.text).not.toContain('lurches');
    const started = await b.turnText('pull lever');
    expect(started.text).toContain('The tram car lurches into motion.');
    const later = await b.turnText('wait');
    expect(later.text).not.toContain('lurches');
  });
});

describe('a compass vehicle steps along its heading while the way admits it (D5c, D6)', () => {
  it('moves north to the Reef, then stops where no exit continues; a player elsewhere is absent from each fact', async () => {
    const b = await bootTurns(SOURCE);
    const started = await b.turnText('pull tiller');
    expect(where(b, 'Marigold')).toBe(named(b, 'Reef').id);
    expect(model(b, 'Marigold')).toMatchObject({ kind: 'compass', heading: 'NORTH', turnsToStep: 1 });
    // Recorded where they happened; the client hides what the player was absent from.
    const arrival = started.events.find((e) => e.type === 'if.event.vehicle_arrived')!;
    expect(arrival).toMatchObject({ presence: 'absent', entities: { location: named(b, 'Reef').id } });
    expect(started.events.find((e) => e.type === 'if.event.vehicle_departed')?.presence).toBe('absent');

    const halted = await b.turnText('wait');
    expect(where(b, 'Marigold')).toBe(named(b, 'Reef').id);
    expect(model(b, 'Marigold')).toMatchObject({ kind: 'compass', heading: null, turnsToStep: 0 });
    expect(halted.events.find((e) => e.type === 'if.event.vehicle_stopped')).toMatchObject({ presence: 'absent', entities: { location: named(b, 'Reef').id } });
  });

  it('a rider aboard reads the arrival and, when the way runs out, the stop', async () => {
    const b = await bootTurns(SOURCE);
    await b.turn('push gangway');
    expect(b.world.getLocation(b.player.id)).toBe(named(b, 'Marigold').id);
    // The tiller is in the Well Bottom; drive the machine from the trait instead.
    await b.turn('wait');
    const { startVehicle } = await import('@sharpee/world-model');
    expect(startVehicle(b.world, named(b, 'Marigold'), 'NORTH')).toBe(true);

    const arrived = await b.turnText('wait');
    expect(where(b, 'Marigold')).toBe(named(b, 'Reef').id);
    const arrival = arrived.events.find((e) => e.type === 'if.event.vehicle_arrived');
    expect(arrival?.data).toMatchObject({ messageId: 'if.action.going.vehicle_arrived', stopId: named(b, 'Reef').id, aboard: true, params: { vehicle: 'Marigold', stop: 'Reef' } });
    expect(arrived.text).toContain('The Marigold arrives at the Reef.');

    const halted = await b.turnText('wait');
    expect(model(b, 'Marigold')).toMatchObject({ kind: 'compass', heading: null, turnsToStep: 0 });
    expect(halted.events.find((e) => e.type === 'if.event.vehicle_stopped')?.data).toMatchObject({ messageId: 'if.action.going.vehicle_stopped', aboard: true });
    expect(halted.text).toContain('The Marigold comes to a stop.');
  });

  it('a bystander in the room the vehicle reaches sees it arrive', async () => {
    const b = await bootTurns(SOURCE);
    await b.turn('push quay');
    expect(b.world.getLocation(b.player.id)).toBe(named(b, 'Reef').id);
    const { startVehicle } = await import('@sharpee/world-model');
    expect(startVehicle(b.world, named(b, 'Marigold'), 'NORTH')).toBe(true);

    const arrived = await b.turnText('wait');
    expect(where(b, 'Marigold')).toBe(named(b, 'Reef').id);
    const arrival = arrived.events.find((e) => e.type === 'if.event.vehicle_arrived')!;
    expect(arrival.presence).toBe('present');
    // Seen, the fact keeps its type and domain data; only the line is perception's choice.
    expect(arrival.data).toMatchObject({ aboard: false, stopId: named(b, 'Reef').id, messageId: 'if.action.going.vehicle_arrived' });
    expect(arrival.data).not.toHaveProperty('renderings');
    expect(arrived.text).toContain('The Marigold arrives at the Reef.');
  });
});

describe('a flight vehicle leaves, is nowhere for the passage, then arrives (D5d, D7)', () => {
  it('the rider in a room aboard is carried; the outside exit refuses while under way and lands at the destination after', async () => {
    const b = await bootTurns(SOURCE);
    await b.turn('push hatch');
    expect(b.world.getLocation(b.player.id)).toBe(named(b, 'Airlock').id);

    const sent = await b.turnText('push plotter');
    expect(model(b, 'Sparrow')).toMatchObject({ kind: 'flight', destination: named(b, 'Reef').id, turnsRemaining: 2 });
    expect(where(b, 'Sparrow')).toBeUndefined();
    expect(sent.events.some((e) => e.type === 'if.event.vehicle_arrived')).toBe(false);

    const blocked = await b.turnText('west');
    expect(b.world.getLocation(b.player.id)).toBe(named(b, 'Airlock').id);
    expect(blocked.text).toContain('The Sparrow is under way.');
    expect(model(b, 'Sparrow')).toMatchObject({ kind: 'flight', turnsRemaining: 1 });

    const landed = await b.turnText('wait');
    expect(where(b, 'Sparrow')).toBe(named(b, 'Reef').id);
    expect(model(b, 'Sparrow')).toMatchObject({ kind: 'flight', destination: null, turnsRemaining: 0 });
    expect(landed.text).toContain('The Sparrow arrives at the Reef.');

    await b.turn('west');
    expect(b.world.getLocation(b.player.id)).toBe(named(b, 'Reef').id);
  });
});

describe('the machine state rides the save (D5g)', () => {
  it('a world restored mid-passage arrives on the same schedule', async () => {
    const b = await bootTurns(SOURCE);
    await b.turn('push hatch');
    await b.turn('push plotter');
    await b.turn('wait');
    expect(model(b, 'Sparrow')).toMatchObject({ kind: 'flight', turnsRemaining: 1 });

    const saved = b.world.toJSON();
    await b.turn('wait');
    expect(where(b, 'Sparrow')).toBe(named(b, 'Reef').id);

    b.world.loadJSON(saved);
    expect(model(b, 'Sparrow')).toMatchObject({ kind: 'flight', destination: named(b, 'Reef').id, turnsRemaining: 1 });
    expect(where(b, 'Sparrow')).toBeUndefined();
    await b.turn('wait');
    expect(where(b, 'Sparrow')).toBe(named(b, 'Reef').id);
    expect(model(b, 'Sparrow')).toMatchObject({ kind: 'flight', destination: null, turnsRemaining: 0 });
  });
});
