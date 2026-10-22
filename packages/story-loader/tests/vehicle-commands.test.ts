/**
 * vehicle-commands.test.ts — ADR-366 D5i and D7 through the REAL engine
 * (Chord 4.0 Phase 11, Slice 4): aboard a `commands: compass` vehicle,
 * `steer north`, `go north` and an author's `extend action steering` word
 * are one action that sets the heading the machine then follows; aboard a
 * streets vehicle `steer` drives it one exit; `set course for <room>` sends
 * a `commands: destinations` ship; `board` lands in the boarding room and
 * `disembark` takes the hatch, refusing while under way; `board` on a
 * bucket refuses. Every assertion reads a location, a trait field or the
 * turn's rendered text.
 */
import { describe, expect, it } from 'vitest';
import { VehicleTrait, type IFEntity } from '@sharpee/world-model';
import { bootTurns, type BootedTurns } from './helpers/boot-turns';

const SOURCE = `story
  title: The Helm
  authors:
    T
  id: the-helm
  story-version: 0.0.1

create the Harbour
  a room
  north to the Reef
  east to the Cove
  admits: the Marigold, the bicycle

  The harbour.

create the Reef
  a room
  south to the Harbour
  admits: the Marigold, the bicycle

  The reef.

create the Cove
  a room
  admits: the Marigold

  The cove.

create the Airlock
  a room
  east to the Hold
  west to outside

  A closet.

create the Hold
  a room
  west to the Airlock

  A hold.

create Alex
  a person
  playable
  starts in the Harbour

  You.

before the game starts
  change the player to Alex
end before

create the Marigold
  a vehicle
  in the Harbour
  movement: compass
  carries: in
  drive: player
  commands: compass
  pace: 1 turn

  A barque.

create the bicycle
  a vehicle
  in the Harbour
  movement: streets
  carries: on
  drive: player
  commands: compass

  A bicycle.

create the bucket
  a vehicle
  in the Harbour
  movement: none
  carries: in

  A bucket.

create the Sparrow
  a vehicle
  in the Harbour
  movement: flight
  drive: player
  commands: destinations
  destinations: the Harbour, the Reef
  passage: 2 turns
  aboard: the Airlock, the Hold
  boarded through: the Airlock

  A courier.

extend action steering
  grammar
    giddyup
      means direction east
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

describe('the compass set aboard a compass vehicle (D5c, D5i)', () => {
  it('steer north sets the heading and the machine carries the ship north on the same turn at pace 1', async () => {
    const b = await bootTurns(SOURCE);
    await b.turn('enter marigold');
    expect(b.world.getLocation(b.player.id)).toBe(named(b, 'Marigold').id);

    const steered = await b.turnText('steer north');
    expect(steered.text).toContain('You steer the Marigold north.');
    expect(steered.text).toContain('The Marigold arrives at the Reef.');
    expect(where(b, 'Marigold')).toBe(named(b, 'Reef').id);
    expect(model(b, 'Marigold')).toMatchObject({ kind: 'compass', heading: 'NORTH' });

    const hove = await b.turnText('heave to');
    expect(hove.text).toContain('You heave to');
    expect(model(b, 'Marigold')).toMatchObject({ kind: 'compass', heading: null, turnsToStep: 0 });
    expect(where(b, 'Marigold')).toBe(named(b, 'Reef').id);
  });

  it('go <direction> aboard is the same action as steer, and the author\'s `giddyup` means east (D5i)', async () => {
    const b = await bootTurns(SOURCE);
    await b.turn('enter marigold');

    const went = await b.turnText('go east');
    expect(went.text).toContain('You steer the Marigold east.');
    expect(where(b, 'Marigold')).toBe(named(b, 'Cove').id);

    await b.turn('heave to');
    const giddy = await b.turnText('giddyup');
    // The Cove has no east exit: the heading is set and cleared again by the
    // machine on the same turn, with the stock stop line.
    expect(giddy.text).toContain('You steer the Marigold east.');
    expect(giddy.text).toContain('The Marigold comes to a stop.');
    expect(where(b, 'Marigold')).toBe(named(b, 'Cove').id);
  });

  it('steer and go are refused aboard a vehicle without the set, and steer on foot', async () => {
    const b = await bootTurns(SOURCE);
    expect((await b.turnText('steer north')).text).toContain("You're not aboard anything you can steer.");
    await b.turn('enter bucket');
    expect((await b.turnText('steer north')).text).toContain("You can't steer the bucket.");
    expect((await b.turnText('go north')).text).toContain("You can't go anywhere from the bucket.");
    expect(where(b, 'bucket')).toBe(named(b, 'Harbour').id);
  });
});

describe('the compass set aboard a streets vehicle (D5b)', () => {
  it('steer north drives the bicycle one exit, with the room described', async () => {
    const b = await bootTurns(SOURCE);
    await b.turn('get on bicycle');
    expect(b.world.getLocation(b.player.id)).toBe(named(b, 'bicycle').id);

    const rode = await b.turnText('steer north');
    expect(where(b, 'bicycle')).toBe(named(b, 'Reef').id);
    expect(rode.text).toContain('Reef');

    // The Cove does not admit the bicycle: the going refusal, nothing moves.
    await b.turn('steer south');
    expect(where(b, 'bicycle')).toBe(named(b, 'Harbour').id);
    const refused = await b.turnText('steer east');
    expect(refused.text).toContain("The bicycle can't go that way.");
    expect(where(b, 'bicycle')).toBe(named(b, 'Harbour').id);
  });
});

describe('boarding, the course and the hatch (D5d, D5i, D7, D7a)', () => {
  it('board lands in the boarding room, set course sends the ship, the hatch refuses under way and lets the rider off after', async () => {
    const b = await bootTurns(SOURCE);
    const boarded = await b.turnText('board the sparrow');
    expect(b.world.getLocation(b.player.id)).toBe(named(b, 'Airlock').id);
    expect(boarded.text).toContain('You board the Sparrow.');
    expect(boarded.text).toContain('Airlock');

    const course = await b.turnText('set course for the reef');
    expect(course.text).toContain('You set course for the Reef.');
    expect(model(b, 'Sparrow')).toMatchObject({ kind: 'flight', destination: named(b, 'Reef').id });
    expect(where(b, 'Sparrow')).toBeUndefined();

    const held = await b.turnText('disembark');
    expect(held.text).toContain('The Sparrow is under way.');
    expect(b.world.getLocation(b.player.id)).toBe(named(b, 'Airlock').id);

    const landed = await b.turnText('wait');
    expect(where(b, 'Sparrow')).toBe(named(b, 'Reef').id);
    expect(landed.text).toContain('The Sparrow arrives at the Reef.');

    const off = await b.turnText('disembark');
    expect(b.world.getLocation(b.player.id)).toBe(named(b, 'Reef').id);
    expect(off.text).toContain('Reef');
  });

  it('a name that is no destination refuses; exit away from the hatch refuses; board on a bucket refuses', async () => {
    const b = await bootTurns(SOURCE);
    await b.turn('board the sparrow');
    expect((await b.turnText('set course for atlantis')).text).toContain('The Sparrow does not go to atlantis.');
    expect(model(b, 'Sparrow')).toMatchObject({ kind: 'flight', destination: null });

    await b.turn('east');
    expect(b.world.getLocation(b.player.id)).toBe(named(b, 'Hold').id);
    expect((await b.turnText('exit')).text).toContain("There's no way off from here.");
    expect(b.world.getLocation(b.player.id)).toBe(named(b, 'Hold').id);

    await b.turn('west');
    await b.turn('disembark');
    expect(b.world.getLocation(b.player.id)).toBe(named(b, 'Harbour').id);
    expect((await b.turnText('board the bucket')).text).toContain("You can't board the bucket.");
    expect(b.world.getLocation(b.player.id)).toBe(named(b, 'Harbour').id);
  });
});
