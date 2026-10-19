/**
 * adr-376-expanses-player.test.ts — the player aboard an open vehicle through
 * the REAL engine (Chord 4.0 Phase 13, Slice 4; ADR-376 AC-1a and AC-2 with
 * the player's half of AC-1 and AC-1b): steering and courses typed at the
 * parser, the edge refusals, leaving the skiff mid-expanse and boarding
 * again, going refused on foot, dropping and throwing overboard, retrieving
 * the cask alongside, the look report in bands, examining a landmark from
 * afar, looking through the telescope, and a vehicle without the
 * `coordinates` set. Every assertion reads a location, a trait field or the
 * turn's rendered text.
 */
import { describe, expect, it } from 'vitest';
import { FloatingTrait, VehicleTrait, type IFEntity, type VehicleOpenModel } from '@sharpee/world-model';
import { bootTurns, type BootedTurns } from './helpers/boot-turns';

const SOURCE = `story
  title: The Belt
  authors:
    T
  id: the-belt-player
  story-version: 0.0.1
  use expanses

create the Belt
  an expanse
  size: 20 by 8
  drift: 1 unit every 50 turns
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
  drive: player
  commands: compass, coordinates
  pace: 1 turn
  stride: 1 unit
  sight: 6
  seen from afar: a glint of hull against the dark
  aka craft

  A skiff.

create the dinghy
  a vehicle
  in the Belt at 3, 3
  movement: open
  carries: in
  drive: player
  commands: compass
  pace: 1 turn
  stride: 1 unit
  sight: 2
  seen from afar: a speck

  A dinghy.

create the telescope
  a thing
  in the skiff
  sight: 12

  A brass telescope.

create the anchor
  a thing
  in the skiff

  An anchor.

create the buoy
  a thing, floats
  in the skiff

  A buoy.

create the cask
  a thing, floats
  in the Belt at 5, 3
  aka cask

  A tarred cask, riding low.

define phrase land-ho
  Land ho.
end phrase

define sequence landfall
  when the Derelict comes into sight
    phrase land-ho
end sequence

create Alex
  a person
  playable
  starts in the Mining Platform

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

function skiff(b: BootedTurns): VehicleOpenModel {
  return named(b, 'skiff').get(VehicleTrait)!.model as VehicleOpenModel;
}

function where(b: BootedTurns, name: string): string | undefined {
  return b.world.getLocation(named(b, name).id);
}

async function waitTurns(b: BootedTurns, n: number): Promise<string> {
  let text = '';
  for (let i = 0; i < n; i++) text += (await b.turnText('wait')).text;
  return text;
}

describe('steering and courses at the parser (D3, D4, AC-2)', () => {
  it('`steer east` leaves the Platform and steps east; `heave to` stops; `go east` aboard is the same gesture', async () => {
    const b = await bootTurns(SOURCE);
    await b.turn('enter skiff');
    const steered = (await b.turnText('steer east')).text;
    expect(steered).toContain('You steer the skiff east.');
    expect(where(b, 'skiff')).toBe(named(b, 'Belt').id);
    expect(skiff(b)).toMatchObject({ heading: 'EAST', position: { x: 4, y: 3 } });
    expect((await b.turnText('heave to')).text).toContain('You heave to');
    expect(skiff(b)).toMatchObject({ heading: null, position: { x: 4, y: 3 } });
    await b.turn('go north');
    expect(skiff(b)).toMatchObject({ heading: 'NORTH', position: { x: 4, y: 4 } });
  });

  it('`set course for 14, 6` and `set course for the Derelict` set courses; off the edge and an unknown name refuse', async () => {
    const b = await bootTurns(SOURCE);
    await b.turn('enter skiff');
    expect((await b.turnText('set course for 14, 6')).text).toContain('You set course for 14, 6.');
    expect(skiff(b)).toMatchObject({ course: { x: 14, y: 6 }, position: { x: 4, y: 4 } });
    await b.turn('heave to');
    expect((await b.turnText('set course for 99, 99')).text).toContain('lies beyond the edge');
    expect((await b.turnText('set course for Atlantis')).text).toContain('does not go to');
    expect((await b.turnText('set course for the Derelict')).text).toContain('You set course for the Derelict.');
    const text = await waitTurns(b, 12);
    expect(where(b, 'skiff')).toBe(named(b, 'Derelict').id);
    expect(text).toContain('Land ho.');
    expect(text).toContain('The skiff arrives at the Derelict.');
  });

  it('a vehicle without the `coordinates` set refuses a course with `vehicle-no-such-command` (AC-2)', async () => {
    const b = await bootTurns(SOURCE);
    await b.turn('enter dinghy');
    expect((await b.turnText('set course for 5, 5')).text).toContain('The dinghy takes no course.');
    expect((await b.turnText('steer east')).text).toContain('You steer the dinghy east.');
  });

  it('at a written edge the heading toward it is refused with the author\'s phrase; a course into it too', async () => {
    const b = await bootTurns(SOURCE);
    await b.turn('enter skiff');
    await b.turn('steer north');
    const text = await waitTurns(b, 4);
    expect(text).toContain('Ice closes the way north.');
    expect(skiff(b)).toMatchObject({ position: { x: 3, y: 7 }, atEdge: 'NORTH', heading: null });
    expect((await b.turnText('steer north')).text).toContain('Ice closes the way north.');
    expect((await b.turnText('steer northeast')).text).toContain('Ice closes the way north.');
    expect(skiff(b).heading).toBeNull();
    expect((await b.turnText('steer east')).text).toContain('You steer the skiff east.');
    expect(skiff(b)).toMatchObject({ atEdge: null, position: { x: 4, y: 7 } });
  });
});

describe('out of the vehicle, overboard, alongside (D9, D10)', () => {
  it('exit mid-expanse, go refused, the skiff holds, enter again and it resumes', async () => {
    const b = await bootTurns(SOURCE);
    await b.turn('enter skiff');
    await b.turn('steer east');
    expect((await b.turnText('exit')).text).toContain('You get out of the skiff.');
    expect(b.world.getLocation(b.player.id)).toBe(named(b, 'Belt').id);
    expect(b.player.get(FloatingTrait)!.position).toEqual({ x: 4, y: 3 });
    expect(skiff(b).position).toEqual({ x: 4, y: 3 });
    expect((await b.turnText('go north')).text).toContain('by the vehicle');
    await waitTurns(b, 2);
    expect(skiff(b)).toMatchObject({ position: { x: 4, y: 3 }, heading: 'EAST' });
    expect((await b.turnText('enter skiff')).text).toContain('You get into the skiff.');
    expect(b.player.get(FloatingTrait)!.position).toBeNull();
    expect(skiff(b).position).toEqual({ x: 5, y: 3 });
  });

  it('dropped beside the skiff, the buoy floats and the anchor is lost; thrown from aboard, the same; the cask is retrieved alongside', async () => {
    const b = await bootTurns(SOURCE);
    await b.turn('enter skiff');
    await b.turn('take anchor');
    await b.turn('take buoy');
    await b.turn('steer east');
    await b.turn('heave to');
    const thrown = (await b.turnText('throw buoy')).text;
    expect(thrown).toContain('The buoy floats where it falls.');
    expect(where(b, 'buoy')).toBe(named(b, 'Belt').id);
    expect(named(b, 'buoy').get(FloatingTrait)!.position).toEqual({ x: 4, y: 3 });
    await b.turn('exit');
    const dropped = (await b.turnText('drop anchor')).text;
    expect(dropped).toContain('The anchor drifts away.');
    expect(where(b, 'anchor')).toBeUndefined();
    await b.turn('enter skiff');
    expect((await b.turnText('retrieve cask')).text).toContain("can't reach");
    expect(where(b, 'cask')).toBe(named(b, 'Belt').id);
    const alongside = (await b.turnText('steer east')).text;
    expect(alongside).toContain('The skiff comes alongside the cask.');
    expect(skiff(b)).toMatchObject({ position: { x: 5, y: 3 }, heading: null });
    expect((await b.turnText('retrieve cask')).text).toContain('You haul the cask aboard.');
    expect(where(b, 'cask')).toBe(b.player.id);
    expect(named(b, 'cask').get(FloatingTrait)!.position).toBeNull();
  });
});

describe('seeing (D6, AC-1a)', () => {
  it('look lists what is in sight by band and direction; examine from afar; the telescope sees farther; a landmark with sight looks out', async () => {
    const b = await bootTurns(SOURCE);
    await b.turn('enter skiff');
    await b.turn('steer east');
    await b.turn('heave to');
    // At (4,3): the Platform one unit west, the cask one unit east; the Derelict 10.4 off, beyond sight 6.
    const look = (await b.turnText('look')).text;
    expect(look).toContain('The Mining Platform, close by, to the west.');
    expect(look).toContain('The cask, close by, to the east.');
    expect(look).not.toContain('Derelict');
    expect((await b.turnText('examine Derelict')).text).toContain("You can't see any such thing.");
    const through = (await b.turnText('look through telescope')).text;
    expect(through).toContain('You look through the telescope.');
    expect(through).toContain('The Derelict, on the horizon, to the east.');
    await b.turn('set course for the Derelict');
    await waitTurns(b, 5);
    // At (10,6): 4 units — in the distance; examinable from afar, out of reach.
    const nearer = (await b.turnText('look')).text;
    expect(nearer).toContain('The Derelict, in the distance, to the east.');
    expect((await b.turnText('examine Derelict')).text).toContain('a long dead hull, turning slowly end over end');
    expect((await b.turnText('examine platform')).text).toContain("You can't see any such thing.");
  });

  it('out of the vehicle, the look names the skiff right here and the Platform close by', async () => {
    const b = await bootTurns(SOURCE);
    await b.turn('enter skiff');
    await b.turn('steer east');
    await b.turn('heave to');
    await b.turn('exit');
    const beside = (await b.turnText('look')).text;
    expect(beside).toContain('The skiff, right here.');
    expect(beside).toContain('The Mining Platform, close by, to the west.');
  });
});
