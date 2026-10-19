/**
 * adr-375-sailing-runtime.test.ts — ADR-375 AC-1 and AC-2 through the REAL
 * engine (Chord 4.0 Phase 13, Slice 6): a ship turned by degrees, the pace
 * its sailing row gives for its angle off the wind, irons in a stopped band
 * until turned out or the wind set elsewhere, sails changing the pace from
 * the next step, still without irons under furled sails, the end refusals,
 * the bearing reads, a save under way, and the naval set refused aboard a
 * vehicle without it. Every assertion reads a location, a trait field or
 * the turn's rendered text.
 */
import { describe, expect, it } from 'vitest';
import { ExpanseTrait, VehicleTrait, WorldModel, type IFEntity, type VehicleOpenModel } from '@sharpee/world-model';
import { bootTurns, type BootedTurns } from './helpers/boot-turns';

const SOURCE = `story
  title: The Sargasso
  authors:
    T
  id: the-sargasso-runtime
  story-version: 0.0.1
  use expanses
  use sailing

create the Sargasso
  an expanse
  size: 40 by 40
  wind: from northeast
  aka sea, weed

  Weed-choked water under a sky the colour of pewter.

  landmarks
    Port Royal: 3, 4
  end landmarks

create Port Royal
  a room
  seen from afar: a smudge of smoke over a low green shore

  The port.

create the Marigold
  a vehicle
  in the Sargasso at 20, 20
  movement: open
  carries: in
  drive: player
  commands: naval, compass
  stride: 1 unit
  sight: 8
  seen from afar: three masts leaning to the wind
  sails: furled, reefed, full
  sails start: furled
  aka ship, barque

  A barque.

  sailing
    0 to 44 degrees: furled stopped, reefed stopped, full stopped
    45 to 74 degrees: furled stopped, reefed 6 turns, full 4 turns
    75 to 119 degrees: furled stopped, reefed 3 turns, full 2 turns
    120 to 180 degrees: furled 6 turns, reefed 2 turns, full 1 turn
    calm: stopped
  end sailing

create the dinghy
  a vehicle
  in the Sargasso at 20, 21
  movement: open
  carries: in
  drive: player
  commands: compass
  pace: 1 turn
  stride: 1 unit
  sight: 2
  seen from afar: a speck

  A dinghy.

create the weather glass
  a thing, pushable
  in the Marigold
  aka glass

  A glass.

  on the player pushing
    set the Sargasso's wind to southwest
  end on

create the capstan
  a thing, pushable
  in the Marigold

  A capstan.

  on the player pushing
    set the Marigold's sails to full
  end on

create the tug
  a vehicle
  in the Sargasso at 10, 10
  movement: open
  carries: in
  drive: control
  stride: 1 unit
  sight: 4
  seen from afar: a squat hull
  aka tugboat

  A tug.

  sailing
    0 to 180 degrees: 1 turn
    calm: stopped
  end sailing

create the whistle
  a thing, pushable
  in the Marigold

  A whistle.

  on the player pushing
    start the tug heading 135 degrees
  end on

create the bell
  a thing, pushable
  in the Marigold

  A bell.

  on the player pushing
    phrase stuck when the Marigold is in irons
    phrase bound when the Marigold is heading 135 degrees
    phrase easterly when the Marigold is heading east
    phrase canvas when the Marigold's sails are full
  end on

define phrase stuck
  Stuck.
end phrase

define phrase bound
  Bound.
end phrase

define phrase easterly
  Easterly.
end phrase

define phrase canvas
  Canvas.
end phrase

create Alex
  a person
  playable
  starts in Port Royal

  You.

before the game starts
  change the player to Alex
  move Alex to the Marigold
end before
`;

function named(b: BootedTurns, name: string): IFEntity {
  const found = b.world.getAllEntities().find((e) => e.name === name);
  expect(found, name).toBeDefined();
  return found!;
}

function ship(b: BootedTurns): VehicleOpenModel {
  return named(b, 'Marigold').get(VehicleTrait)!.model as VehicleOpenModel;
}

async function waitTurns(b: BootedTurns, n: number): Promise<string> {
  let text = '';
  for (let i = 0; i < n; i++) text += (await b.turnText('wait')).text;
  return text;
}

describe('turning, pace by band, irons (D2, D3, D5)', () => {
  it('starboard 180 and ahead: furled she makes a unit every six turns before the wind; full sail, one a turn; a turn into the wind puts her in irons', async () => {
    const b = await bootTurns(SOURCE);
    expect(b.world.getLocation(b.player.id)).toBe(named(b, 'Marigold').id);
    expect((await b.turnText('starboard 180 degrees')).text).toContain('to 180 degrees');
    expect(ship(b)).toMatchObject({ heading: 180, underWay: false, sails: { current: 'furled' } });
    expect((await b.turnText('ahead')).text).toContain('gathers way on 180 degrees');
    expect(ship(b)).toMatchObject({ underWay: true, turnsToStep: 5 });
    await waitTurns(b, 4);
    expect(ship(b).position).toEqual({ x: 20, y: 20 });
    await waitTurns(b, 1);
    expect(ship(b).position!.y).toBeCloseTo(19);
    expect(ship(b).position!.x).toBeCloseTo(20);

    expect((await b.turnText('make sail')).text).toContain('You make sail.');
    expect((await b.turnText('make sail')).text).toContain('You make sail.');
    expect(ship(b).sails!.current).toBe('full');
    expect((await b.turnText('push bell')).text).toContain('Canvas.');
    await waitTurns(b, 3);
    // Full sail before the wind: a unit a turn once the reefed countdown lands.
    const before = ship(b).position!.y;
    await waitTurns(b, 2);
    expect(ship(b).position!.y).toBeCloseTo(before - 2);

    expect((await b.turnText('hard to port')).text).toContain('to 90 degrees');
    expect((await b.turnText('push bell')).text).toContain('Easterly.');
    const irons = (await b.turnText('port 60')).text;
    expect(irons).toContain('to 30 degrees');
    // The machine ticks after the turn's action, so the irons report lands on the turn of the turn, once.
    const stuck = irons + (await waitTurns(b, 2));
    expect(stuck).toContain('The Marigold is in irons.');
    expect(stuck.split('The Marigold is in irons.').length).toBe(2);
    expect(ship(b)).toMatchObject({ inIrons: true, underWay: true });
    expect((await b.turnText('push bell')).text).toContain('Stuck.');
    const held = ship(b).position!;
    await waitTurns(b, 2);
    expect(ship(b).position).toEqual(held);
  });

  it('turned out of irons she moves again; a wind set elsewhere frees her too; come about mirrors the bearing', async () => {
    const b = await bootTurns(SOURCE);
    await b.turn('starboard 30');
    await b.turn('ahead');
    await b.turn('wait');
    expect(ship(b).inIrons).toBe(true);
    expect((await b.turnText('starboard 60')).text).toContain('to 90 degrees');
    await waitTurns(b, 1);
    expect(ship(b).inIrons).toBe(false);
    expect((await b.turnText('push bell')).text).not.toContain('Stuck.');

    await b.turn('port 60');
    await waitTurns(b, 1);
    expect(ship(b).inIrons).toBe(true);
    await b.turn('push glass');
    expect(named(b, 'Sargasso').get(ExpanseTrait)!.wind).toBe(225);
    await waitTurns(b, 1);
    expect(ship(b).inIrons).toBe(false);

    expect((await b.turnText('come about')).text).toContain('settles on 60 degrees');
    expect(ship(b).heading).toBe(60);
    await b.turn('port 15');
    expect((await b.turnText('come about')).text).toContain('dead to the wind');
  });

  it('the capstan sets the sails from the story; the bearing reads hold; heave to keeps the bearing', async () => {
    const b = await bootTurns(SOURCE);
    await b.turn('starboard 135');
    expect((await b.turnText('push bell')).text).toContain('Bound.');
    await b.turn('push capstan');
    expect(ship(b).sails!.current).toBe('full');
    expect((await b.turnText('make sail')).text).toContain('All sail is set.');
    await b.turn('ahead');
    expect((await b.turnText('heave to')).text).toContain('loses way');
    expect(ship(b)).toMatchObject({ heading: 135, underWay: false });
    expect((await b.turnText('furl sails')).text).toContain('You furl the sails.');
    expect((await b.turnText('shorten sail')).text).toContain('already furled');
    expect((await b.turnText('port')).text).toContain('How many degrees?');
  });

  it('a save under way restores the bearing, the fractional position and the setting', async () => {
    const b = await bootTurns(SOURCE);
    await b.turn('starboard 225');
    await b.turn('push capstan');
    await b.turn('ahead');
    await waitTurns(b, 2);
    const restored = new WorldModel();
    restored.loadJSON(b.world.toJSON());
    const again = restored.getEntity(named(b, 'Marigold').id)!.get(VehicleTrait)!.model as VehicleOpenModel;
    expect(again).toMatchObject({ heading: 225, underWay: true, sails: { current: 'full' } });
    expect(again.position!.x).toBeCloseTo(ship(b).position!.x);
    expect(again.position!.x).not.toBe(Math.round(again.position!.x));
  });
});

describe('a statement start by bearing (D2)', () => {
  it('`start the tug heading 135 degrees` puts a controlled sailing vehicle under way on that bearing', async () => {
    const b = await bootTurns(SOURCE);
    await b.turn('push whistle');
    const tug = named(b, 'tug').get(VehicleTrait)!.model as VehicleOpenModel;
    expect(tug).toMatchObject({ heading: 135, underWay: true });
    expect(tug.position!.x).toBeCloseTo(10 + Math.SQRT1_2);
    expect(tug.position!.y).toBeCloseTo(10 - Math.SQRT1_2);
  });
});

describe('the unwritten edge under sail (D6) and the set refused (AC-2)', () => {
  it('an unwritten edge is weather for a sailing vehicle; the dinghy takes no naval word', async () => {
    const b = await bootTurns(SOURCE);
    ship(b).position = { x: 38, y: 20 };
    await b.turn('starboard 90');
    await b.turn('push capstan');
    await b.turn('ahead');
    const text = await waitTurns(b, 9);
    expect(text).toContain('Wind and sea drive you back.');
    expect(ship(b)).toMatchObject({ atEdge: 'EAST', underWay: false, heading: 90 });

    b.world.moveEntity(b.player.id, named(b, 'dinghy').id);
    expect((await b.turnText('starboard 15 degrees')).text).toContain("You can't steer the dinghy.");
    expect((await b.turnText('steer east')).text).toContain('You steer the dinghy east.');
  });
});
