/**
 * Vehicle behaviors name their refusals (alignment fixes Phase 3: F6, F9,
 * F10, F11). Each mutation an action may be refused has a check that
 * mutates nothing — `comeAboutRefusal`, `sailChangeRefusal`,
 * `edgeRefusalOf` — and the mutation itself refuses by the same check; the
 * signed angle off the wind is written once; the way out of a room aboard
 * is traversal's answer (`outsideWayOf`).
 *
 * Tests assert on each check's answer against state they set, and that the
 * check left the state as it was; the mutations on the state they change.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { WorldModel } from '../../../src/world/WorldModel';
import { IFEntity } from '../../../src/entities/if-entity';
import { EntityType } from '../../../src/entities/entity-types';
import { IdentityTrait } from '../../../src/traits/identity/identityTrait';
import { ContainerTrait } from '../../../src/traits/container/containerTrait';
import { EnterableTrait } from '../../../src/traits/enterable/enterableTrait';
import { RoomTrait } from '../../../src/traits/room/roomTrait';
import { ActorTrait } from '../../../src/traits/actor/actorTrait';
import { DoorTrait } from '../../../src/traits/door/doorTrait';
import { OpenableTrait } from '../../../src/traits/openable/openableTrait';
import { LockableTrait } from '../../../src/traits/lockable/lockableTrait';
import { AboardTrait } from '../../../src/traits/vehicle/aboardTrait';
import { VehicleTrait, type VehicleOpenMovement } from '../../../src/traits/vehicle/vehicleTrait';
import { ExpanseTrait } from '../../../src/traits/expanse/expanseTrait';
import { angleOffWind, signedAngleOffWind } from '../../../src/traits/expanse/expanseBehavior';
import { Direction } from '../../../src/constants/directions';
import { exitBlockedKey, exitHiddenKey, exitMessageKey } from '../../../src/world/TraversalBehavior';
import {
  comeAbout,
  comeAboutRefusal,
  currentBearing,
  edgeRefusalOf,
  furlSails,
  makeSail,
  outsideWayOf,
  sailChangeRefusal,
  shortenSail,
} from '../../../src/traits/vehicle/vehicleBehavior';

const TABLE = {
  bands: [
    { from: 0, to: 44, paces: [{ setting: null, pace: 'stopped' as const }] },
    { from: 45, to: 180, paces: [{ setting: null, pace: 1 }] },
  ],
  calm: 'stopped' as const,
};

describe('the vehicle behaviors\' refusals (F6)', () => {
  let world: WorldModel;
  let sea: IFEntity;
  let ship: IFEntity;

  const model = () => ship.get(VehicleTrait)!.movement as VehicleOpenMovement;

  beforeEach(() => {
    world = new WorldModel();
    sea = world.createEntity('Sea', EntityType.ROOM);
    sea.add(new RoomTrait({ exits: {} }));
    sea.add(new ExpanseTrait({ width: 20, height: 20, landmarks: {}, wind: 45 }));
    ship = world.createEntity('ship', EntityType.ITEM);
    ship.add(new IdentityTrait({ name: 'ship' }));
    ship.add(new ContainerTrait());
    ship.add(new EnterableTrait());
    ship.add(new VehicleTrait({ movement: { kind: 'open', drive: 'player', pace: 1, stride: 1, sight: 5, sailing: TABLE, sails: { settings: ['furled', 'reefed', 'full'], current: 'reefed' }, heading: 90, position: { x: 10, y: 10 } } }));
    world.moveEntity(ship.id, sea.id);
  });

  it('the signed angle off the wind is one rule; its size is the angle off the wind', () => {
    expect(signedAngleOffWind(90, 45)).toBe(45);
    expect(signedAngleOffWind(0, 45)).toBe(-45);
    expect(signedAngleOffWind(225, 45)).toBe(180);
    expect(signedAngleOffWind(45, 45)).toBe(0);
    for (const heading of [0, 45, 90, 180, 225, 300]) {
      expect(angleOffWind(heading, 45)).toBe(Math.abs(signedAngleOffWind(heading, 45)));
    }
  });

  it('currentBearing reads the heading as degrees, north with none', () => {
    expect(currentBearing(ship)).toBe(90);
    model().heading = 'SOUTHWEST';
    expect(currentBearing(ship)).toBe(225);
    model().heading = null;
    expect(currentBearing(ship)).toBe(0);
  });

  it('comeAboutRefusal answers without turning the ship; comeAbout tacks only when it passes', () => {
    expect(comeAboutRefusal(world, ship)).toBeUndefined();
    expect(model().heading).toBe(90);
    expect(comeAbout(world, ship)).toBe(0);
    expect(model().heading).toBe(0);

    model().heading = 45;
    expect(comeAboutRefusal(world, ship)).toBe('cannot');
    expect(comeAbout(world, ship)).toBe('cannot');
    expect(model().heading).toBe(45);

    model().heading = 225;
    expect(comeAboutRefusal(world, ship)).toBe('cannot');

    sea.get(ExpanseTrait)!.wind = 'calm';
    expect(comeAboutRefusal(world, ship)).toBe('no-wind');
    expect(model().heading).toBe(225);
  });

  it('sailChangeRefusal answers without changing the sails; the changes take only when it passes', () => {
    expect(sailChangeRefusal(ship, 'make')).toBeUndefined();
    expect(model().sails!.current).toBe('reefed');
    expect(makeSail(ship)).toBe(true);
    expect(model().sails!.current).toBe('full');
    expect(sailChangeRefusal(ship, 'make')).toBe('at-full');
    expect(makeSail(ship)).toBe(false);
    expect(model().sails!.current).toBe('full');

    expect(shortenSail(ship)).toBe(true);
    expect(model().sails!.current).toBe('reefed');
    expect(furlSails(ship)).toBe(true);
    expect(model().sails!.current).toBe('furled');
    expect(sailChangeRefusal(ship, 'shorten')).toBe('already-furled');
    expect(sailChangeRefusal(ship, 'furl')).toBe('already-furled');
    expect(furlSails(ship)).toBe(false);

    delete model().sails;
    expect(sailChangeRefusal(ship, 'make')).toBe('no-sails');
  });

  it('edgeRefusalOf names the edge a way heads into, with its phrase when the story gave one', () => {
    model().atEdge = 'NORTH';
    expect(edgeRefusalOf(world, ship, { x: 0, y: -1 })).toBeUndefined();
    expect(edgeRefusalOf(world, ship, { x: 1, y: 1 })).toEqual({ side: 'NORTH' });
    world.registerEvaluator(exitMessageKey(sea.id, 'NORTH' as never), () => 'Pack ice.');
    expect(edgeRefusalOf(world, ship, { x: 0, y: 1 })).toEqual({ side: 'NORTH', message: 'Pack ice.' });
    model().atEdge = null;
    expect(edgeRefusalOf(world, ship, { x: 0, y: 1 })).toBeUndefined();
  });
});

describe('the way out of a room aboard (F9, F10, F11)', () => {
  let world: WorldModel;
  let quay: IFEntity;
  let deck: IFEntity;
  let hold: IFEntity;
  let player: IFEntity;
  const walker = () => ({ kind: 'walker', entity: player } as const);

  beforeEach(() => {
    world = new WorldModel();
    quay = world.createEntity('Quay', EntityType.ROOM);
    quay.add(new RoomTrait({ exits: {} }));
    const ship = world.createEntity('ship', EntityType.ITEM);
    ship.add(new VehicleTrait({ movement: { kind: 'line', stops: [quay.id, 'elsewhere'], oneWay: false, drive: 'control', pace: 1 } }));
    world.moveEntity(ship.id, quay.id);
    deck = world.createEntity('Deck', EntityType.ROOM);
    deck.add(new RoomTrait({ exits: {} }));
    deck.add(new AboardTrait({ vehicleId: ship.id, outside: { [Direction.WEST]: { candidates: [quay.id] }, [Direction.EAST]: { candidates: [quay.id] } } }));
    hold = world.createEntity('Hold', EntityType.ROOM);
    hold.add(new RoomTrait({ exits: {} }));
    hold.add(new AboardTrait({ vehicleId: ship.id }));
    player = world.createEntity('player', EntityType.ACTOR);
    player.add(new ActorTrait({ isPlayer: true }));
    world.moveEntity(player.id, deck.id);
  });

  it('one record per outside exit: the declaration and its door', () => {
    const plank = new AboardTrait({ vehicleId: 'v', outside: { [Direction.WEST]: { candidates: ['r1'], via: 'd1' } } });
    expect(plank.computedExits[Direction.WEST]).toEqual({ candidates: ['r1'], via: 'd1' });
    expect(Object.keys(plank)).not.toContain('outside');
  });

  it('none for a room aboard with no outside exit', () => {
    expect(outsideWayOf(world, hold, walker())).toEqual({ kind: 'none' });
  });

  it('boarding (`in`) reads the hatch and the `while` but not a block on the way out', () => {
    world.registerEvaluator(exitHiddenKey(deck.id, Direction.EAST), () => true);
    world.registerEvaluator(exitBlockedKey(deck.id, Direction.WEST), () => true);
    expect(outsideWayOf(world, deck, walker())).toMatchObject({ kind: 'refused', key: Direction.WEST, reason: 'blocked' });
    expect(outsideWayOf(world, deck, walker(), 'in')).toEqual({ kind: 'way', key: Direction.WEST });

    const plank = world.createEntity('plank', EntityType.DOOR);
    plank.add(new OpenableTrait({ isOpen: false }));
    deck.get(AboardTrait)!.computedExits[Direction.WEST]!.via = plank.id;
    expect(outsideWayOf(world, deck, walker(), 'in')).toMatchObject({ kind: 'refused', key: Direction.WEST, reason: 'door_closed', door: plank });
  });

  it('ambiguous with two ways granted; the one way when the other is hidden', () => {
    expect(outsideWayOf(world, deck, walker())).toEqual({ kind: 'ambiguous', keys: [Direction.WEST, Direction.EAST] });
    world.registerEvaluator(exitHiddenKey(deck.id, Direction.EAST), () => true);
    expect(outsideWayOf(world, deck, walker())).toEqual({ kind: 'way', key: Direction.WEST });
  });

  it('with none granted, the first way\'s refusal — a closed hatch on the outside way itself, seen by traversal', () => {
    const plank = world.createEntity('plank', EntityType.DOOR);
    plank.add(new DoorTrait({ room1: deck.id, room2: quay.id }));
    plank.add(new OpenableTrait({ isOpen: false }));
    deck.get(AboardTrait)!.computedExits[Direction.WEST]!.via = plank.id;
    world.registerEvaluator(exitHiddenKey(deck.id, Direction.EAST), () => true);
    expect(outsideWayOf(world, deck, walker())).toMatchObject({ kind: 'refused', key: Direction.WEST, reason: 'door_closed', door: plank });
    plank.get(OpenableTrait)!.isOpen = true;
    expect(outsideWayOf(world, deck, walker())).toEqual({ kind: 'way', key: Direction.WEST });

    // Locked as well as closed: the lock is the gate traversal reads first.
    plank.get(OpenableTrait)!.isOpen = false;
    plank.add(new LockableTrait({ isLocked: true }));
    expect(outsideWayOf(world, deck, walker())).toMatchObject({ kind: 'refused', key: Direction.WEST, reason: 'door_locked', door: plank });
  });
});
