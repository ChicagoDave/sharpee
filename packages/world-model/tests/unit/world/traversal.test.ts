/**
 * TraversalBehavior (ADR-378 D0, D1a, D3, D6; ADR-379's first worked
 * example): one query answers "may this mover take this way now?" for every
 * mover, in the order existence, blocking, door, admittance. Each test
 * asserts on the query's answer against world state it set, and on the
 * trait data `connectRooms` wrote.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { WorldModel } from '../../../src/world/WorldModel';
import { IFEntity } from '../../../src/entities/if-entity';
import { EntityType } from '../../../src/entities/entity-types';
import { IdentityTrait } from '../../../src/traits/identity/identityTrait';
import { RoomTrait } from '../../../src/traits/room/roomTrait';
import { RoomBehavior } from '../../../src/traits/room/roomBehavior';
import { DoorTrait } from '../../../src/traits/door/doorTrait';
import { OpenableTrait } from '../../../src/traits/openable/openableTrait';
import { LockableTrait } from '../../../src/traits/lockable/lockableTrait';
import { ActorTrait } from '../../../src/traits/actor/actorTrait';
import { Direction, isPassageKey, passageKey } from '../../../src/constants/directions';
import {
  TraversalBehavior,
  exitBlockedKey,
  exitHiddenKey,
  exitMessageKey,
  type TraversalMover
} from '../../../src/world/TraversalBehavior';

describe('TraversalBehavior', () => {
  let world: WorldModel;
  let a: IFEntity;
  let b: IFEntity;
  let player: IFEntity;
  let cart: IFEntity;
  let ship: IFEntity;
  let walker: TraversalMover;
  let steered: TraversalMover;
  let pushed: TraversalMover;

  function room(name: string): IFEntity {
    const r = world.createEntity(name, EntityType.ROOM);
    r.add(new RoomTrait({ exits: {} }));
    r.add(new IdentityTrait({ name }));
    return r;
  }

  beforeEach(() => {
    world = new WorldModel();
    a = room('A');
    b = room('B');
    player = world.createEntity('player', EntityType.ACTOR);
    player.add(new ActorTrait());
    world.moveEntity(player.id, a.id);
    cart = world.createEntity('cart', EntityType.ITEM);
    world.moveEntity(cart.id, a.id);
    ship = world.createEntity('ship', EntityType.ITEM);
    world.moveEntity(ship.id, a.id);
    walker = { kind: 'walker', entity: player };
    steered = { kind: 'steered', vehicle: ship };
    pushed = { kind: 'walker', entity: player, pushing: cart };
  });

  describe('the way for a walker', () => {
    it('is the exit and its destination on a plain connection', () => {
      world.connectRooms(a.id, b.id, Direction.NORTH);
      const way = TraversalBehavior.wayFor(world, a, Direction.NORTH, walker);
      expect(way.kind).toBe('exit');
      if (way.kind === 'exit') {
        expect(way.destination.id).toBe(b.id);
        expect(way.exit.destination).toBe(b.id);
        expect(way.door).toBeUndefined();
      }
    });

    it('refuses no_exit where nothing is written, and on a non-room', () => {
      expect(TraversalBehavior.wayFor(world, a, Direction.EAST, walker)).toMatchObject({ kind: 'refused', reason: 'no_exit' });
      expect(TraversalBehavior.wayFor(world, cart, Direction.NORTH, walker)).toMatchObject({ kind: 'refused', reason: 'no_exit' });
    });

    it('refuses hidden while the exit\'s evaluator says so, and exitOf returns null (D3)', () => {
      world.connectRooms(a.id, b.id, Direction.NORTH);
      world.registerEvaluator(exitHiddenKey(a.id, Direction.NORTH), () => true);
      expect(TraversalBehavior.wayFor(world, a, Direction.NORTH, walker)).toMatchObject({ kind: 'refused', reason: 'hidden' });
      expect(TraversalBehavior.exitOf(world, a, Direction.NORTH)).toBeNull();

      world.registerEvaluator(exitHiddenKey(a.id, Direction.NORTH), () => false);
      expect(TraversalBehavior.wayFor(world, a, Direction.NORTH, walker).kind).toBe('exit');
      expect(TraversalBehavior.exitOf(world, a, Direction.NORTH)?.destination).toBe(b.id);
    });

    it('reads hidden before blocked: a way both hidden and blocked is hidden (D3)', () => {
      world.connectRooms(a.id, b.id, Direction.NORTH);
      world.registerEvaluator(exitHiddenKey(a.id, Direction.NORTH), () => true);
      world.registerEvaluator(exitBlockedKey(a.id, Direction.NORTH), () => true);
      world.registerEvaluator(exitMessageKey(a.id, Direction.NORTH), () => 'The grate is shut.');
      expect(TraversalBehavior.wayFor(world, a, Direction.NORTH, walker)).toMatchObject({ kind: 'refused', reason: 'hidden' });
    });

    it('refuses blocked with the live message, before the exit is read (a blocked-only way)', () => {
      world.registerEvaluator(exitBlockedKey(a.id, Direction.NORTH), () => true);
      world.registerEvaluator(exitMessageKey(a.id, Direction.NORTH), () => 'The grate is shut.');
      expect(TraversalBehavior.wayFor(world, a, Direction.NORTH, walker)).toEqual({
        kind: 'refused',
        key: Direction.NORTH,
        reason: 'blocked',
        message: 'The grate is shut.'
      });
    });

    it('falls back to the stamped blockedExits map when no evaluator is registered', () => {
      RoomBehavior.blockExit(a, Direction.NORTH, 'A wall of ice.');
      expect(TraversalBehavior.isExitBlocked(world, a, Direction.NORTH)).toBe(true);
      expect(TraversalBehavior.blockedMessage(world, a, Direction.NORTH)).toBe('A wall of ice.');
      expect(TraversalBehavior.wayFor(world, a, Direction.NORTH, walker)).toMatchObject({ reason: 'blocked', message: 'A wall of ice.' });
    });

    it('refuses door_closed and door_locked, naming the door, and passes an open one', () => {
      const gate = world.createEntity('gate', EntityType.DOOR);
      gate.add(new DoorTrait({ room1: a.id, room2: b.id }));
      gate.add(new OpenableTrait({ isOpen: false }));
      gate.add(new LockableTrait({ isLocked: true }));
      world.connectRooms(a.id, b.id, Direction.NORTH, gate.id);

      expect(TraversalBehavior.wayFor(world, a, Direction.NORTH, walker)).toMatchObject({ kind: 'refused', reason: 'door_locked', door: gate });
      gate.get(LockableTrait)!.isLocked = false;
      expect(TraversalBehavior.wayFor(world, a, Direction.NORTH, walker)).toMatchObject({ kind: 'refused', reason: 'door_closed', door: gate });
      gate.get(OpenableTrait)!.isOpen = true;
      const way = TraversalBehavior.wayFor(world, a, Direction.NORTH, walker);
      expect(way).toMatchObject({ kind: 'exit', door: gate });
      if (way.kind === 'exit') expect(way.destination.id).toBe(b.id);
    });

    it('refuses destination_missing when the exit names a room that is gone', () => {
      a.get(RoomTrait)!.exits[Direction.NORTH] = { destination: 'r_nowhere' };
      expect(TraversalBehavior.wayFor(world, a, Direction.NORTH, walker)).toMatchObject({ kind: 'refused', reason: 'destination_missing' });
    });

    it('reports a computed way for the caller to resolve once (ADR-295)', () => {
      a.get(RoomTrait)!.exits[Direction.NORTH] = { destination: b.id };
      a.add({ type: 'test.trait.carousel', computedExits: { [Direction.NORTH]: { candidates: [b.id] } } } as never);
      const way = TraversalBehavior.wayFor(world, a, Direction.NORTH, walker);
      expect(way.kind).toBe('computed');
      if (way.kind === 'computed') {
        expect(way.declaration.candidates).toEqual([b.id]);
        expect(way.exit?.destination).toBe(b.id);
      }
    });
  });

  describe('admittance (ADR-366 D6, ADR-378 D6)', () => {
    beforeEach(() => {
      world.connectRooms(a.id, b.id, Direction.NORTH);
    });

    it('a walker and an NPC need no admitting', () => {
      expect(TraversalBehavior.wayFor(world, a, Direction.NORTH, walker).kind).toBe('exit');
      expect(TraversalBehavior.wayFor(world, a, Direction.NORTH, { kind: 'npc', entity: player }).kind).toBe('exit');
    });

    it('a steered vehicle is refused not_admitted unless the destination room lists it', () => {
      expect(TraversalBehavior.wayFor(world, a, Direction.NORTH, steered)).toMatchObject({ kind: 'refused', reason: 'not_admitted' });
      b.get(RoomTrait)!.admits = { vehicles: [ship.id], pushed: [] };
      expect(TraversalBehavior.wayFor(world, a, Direction.NORTH, steered).kind).toBe('exit');
    });

    it('a pushed thing is refused pushing_not_admitted unless the room admits every pushable', () => {
      expect(TraversalBehavior.wayFor(world, a, Direction.NORTH, pushed)).toMatchObject({ kind: 'refused', reason: 'pushing_not_admitted' });
      b.get(RoomTrait)!.admits = { vehicles: [], pushed: 'any' };
      expect(TraversalBehavior.wayFor(world, a, Direction.NORTH, pushed).kind).toBe('exit');
    });

    it('the exit\'s own admits decides over the room\'s when it has one', () => {
      b.get(RoomTrait)!.admits = { vehicles: [ship.id], pushed: 'any' };
      a.get(RoomTrait)!.exits[Direction.NORTH]!.admits = { vehicles: [ship.id], pushed: [] };
      expect(TraversalBehavior.wayFor(world, a, Direction.NORTH, pushed)).toMatchObject({ reason: 'pushing_not_admitted' });
      expect(TraversalBehavior.wayFor(world, a, Direction.NORTH, steered).kind).toBe('exit');

      a.get(RoomTrait)!.exits[Direction.NORTH]!.admits = { vehicles: [], pushed: 'any' };
      expect(TraversalBehavior.wayFor(world, a, Direction.NORTH, pushed).kind).toBe('exit');
      expect(TraversalBehavior.wayFor(world, a, Direction.NORTH, steered)).toMatchObject({ reason: 'not_admitted' });
    });

    it('decides field by field: an exit that names only pushed things leaves the vehicles to the room', () => {
      b.get(RoomTrait)!.admits = { vehicles: [ship.id], pushed: [] };
      a.get(RoomTrait)!.exits[Direction.NORTH]!.admits = { pushed: [cart.id] };
      expect(TraversalBehavior.wayFor(world, a, Direction.NORTH, steered).kind).toBe('exit');
      expect(TraversalBehavior.wayFor(world, a, Direction.NORTH, pushed).kind).toBe('exit');
      b.get(RoomTrait)!.admits.vehicles = [];
      expect(TraversalBehavior.wayFor(world, a, Direction.NORTH, steered)).toMatchObject({ reason: 'not_admitted' });
    });

    it('a vehicle whose id were `pushing` is a vehicle, never the class of pushed things', () => {
      const odd = world.createEntity('pushing', EntityType.ITEM);
      b.get(RoomTrait)!.admits = { vehicles: [odd.id], pushed: [] };
      expect(TraversalBehavior.wayFor(world, a, Direction.NORTH, pushed)).toMatchObject({ reason: 'pushing_not_admitted' });
      expect(TraversalBehavior.wayFor(world, a, Direction.NORTH, { kind: 'steered', vehicle: odd }).kind).toBe('exit');
    });
  });

  describe('passages (ADR-378 D1, D1a)', () => {
    const key = passageKey(['climb', 'the', 'rope']);

    it('builds a lower-cased hyphenated key that isPassageKey recognises and a direction is not', () => {
      expect(key).toBe('passage:climb-the-rope');
      expect(isPassageKey(key)).toBe(true);
      expect(isPassageKey(Direction.NORTH)).toBe(false);
      expect(isPassageKey('passage:')).toBe(false);
    });

    it('connectRooms writes the one exit and infers no reverse', () => {
      world.connectRooms(a.id, b.id, key);
      expect(a.get(RoomTrait)!.exits[key]?.destination).toBe(b.id);
      expect(Object.keys(b.get(RoomTrait)!.exits)).toEqual([]);
    });

    it('a passage through a door writes the door on the one side and marks it one-way', () => {
      const hatch = world.createEntity('hatch', EntityType.DOOR);
      hatch.add(new DoorTrait({ room1: a.id, room2: b.id }));
      world.connectRooms(a.id, b.id, key, hatch.id);
      expect(a.get(RoomTrait)!.exits[key]).toEqual({ destination: b.id, via: hatch.id });
      expect(Object.keys(b.get(RoomTrait)!.exits)).toEqual([]);
      expect(hatch.get(DoorTrait)!.bidirectional).toBe(false);
      expect(world.getLocation(hatch.id)).toBe(a.id);
    });

    it('is a way for a walker like any exit, and hidden like any exit', () => {
      world.connectRooms(a.id, b.id, key);
      expect(TraversalBehavior.wayFor(world, a, key, walker)).toMatchObject({ kind: 'exit', key });
      world.registerEvaluator(exitHiddenKey(a.id, key), () => true);
      expect(TraversalBehavior.wayFor(world, a, key, walker)).toMatchObject({ kind: 'refused', reason: 'hidden' });
      expect(exitHiddenKey(a.id, key)).toBe(`exit.hidden.${a.id}.passage:climb-the-rope`);
    });
  });
});

describe("the thing's own way (ADR-378 D6b)", () => {
  it('a pushed thing is admitted by its id on the exit when the way does not admit every pushable', () => {
    const world = new WorldModel();
    const a = world.createEntity('A', EntityType.ROOM);
    a.add(new RoomTrait());
    const b = world.createEntity('B', EntityType.ROOM);
    b.add(new RoomTrait());
    world.connectRooms(a.id, b.id, Direction.NORTH);
    const cart = world.createEntity('cart', EntityType.OBJECT);
    const crate = world.createEntity('crate', EntityType.OBJECT);
    const pusher = world.createEntity('pusher', EntityType.ACTOR);
    const exit = RoomBehavior.getExit(a, Direction.NORTH)!;
    exit.admits = { pushed: [cart.id] };

    expect(TraversalBehavior.wayFor(world, a, Direction.NORTH, { kind: 'walker', entity: pusher, pushing: cart })).toMatchObject({ kind: 'exit' });
    expect(TraversalBehavior.wayFor(world, a, Direction.NORTH, { kind: 'walker', entity: pusher, pushing: crate })).toMatchObject({ kind: 'refused', reason: 'pushing_not_admitted' });
    // The reverse carries no stamp of its own.
    expect(TraversalBehavior.wayFor(world, b, Direction.SOUTH, { kind: 'walker', entity: pusher, pushing: cart })).toMatchObject({ reason: 'pushing_not_admitted' });
  });

  it('a steered vehicle pushing a thing is one party: the way must admit both', () => {
    const world = new WorldModel();
    const a = world.createEntity('A', EntityType.ROOM);
    a.add(new RoomTrait());
    const b = world.createEntity('B', EntityType.ROOM);
    b.add(new RoomTrait());
    world.connectRooms(a.id, b.id, Direction.NORTH);
    const car = world.createEntity('car', EntityType.ITEM);
    const cart = world.createEntity('cart', EntityType.OBJECT);
    const party = { kind: 'steered', vehicle: car, pushing: cart } as const;

    b.get(RoomTrait)!.admits = { vehicles: [], pushed: 'any' };
    expect(TraversalBehavior.wayFor(world, a, Direction.NORTH, party)).toMatchObject({ kind: 'refused', reason: 'not_admitted' });
    b.get(RoomTrait)!.admits = { vehicles: [car.id], pushed: [] };
    expect(TraversalBehavior.wayFor(world, a, Direction.NORTH, party)).toMatchObject({ kind: 'refused', reason: 'pushing_not_admitted' });
    b.get(RoomTrait)!.admits = { vehicles: [car.id], pushed: 'any' };
    expect(TraversalBehavior.wayFor(world, a, Direction.NORTH, party).kind).toBe('exit');
  });
});
