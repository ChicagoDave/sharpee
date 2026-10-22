/**
 * The vehicle's built-in machine (ADR-366 D5a–D5e, D5g; Chord 4.0 Phase 11
 * Slice 3): one step per turn per type, every move a `moveEntity` that
 * carries what the vehicle holds, every piece of machine state a trait
 * field that survives a world's JSON round trip. Each test asserts on the
 * vehicle's location and the trait's fields, never on a copy.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { WorldModel } from '../../../src/world/WorldModel';
import { IFEntity } from '../../../src/entities/if-entity';
import { EntityType } from '../../../src/entities/entity-types';
import { IdentityTrait } from '../../../src/traits/identity/identityTrait';
import { ContainerTrait } from '../../../src/traits/container/containerTrait';
import { EnterableTrait } from '../../../src/traits/enterable/enterableTrait';
import { OpenableTrait } from '../../../src/traits/openable/openableTrait';
import { DoorTrait } from '../../../src/traits/door/doorTrait';
import { RoomTrait } from '../../../src/traits/room/roomTrait';
import { RoomBehavior } from '../../../src/traits/room/roomBehavior';
import { LockableTrait } from '../../../src/traits/lockable/lockableTrait';
import { ActorTrait } from '../../../src/traits/actor/actorTrait';
import { AboardTrait } from '../../../src/traits/vehicle/aboardTrait';
import { VehicleTrait } from '../../../src/traits/vehicle/vehicleTrait';
import { Direction } from '../../../src/constants/directions';
import { exitBlockedKey, exitHiddenKey } from '../../../src/world/TraversalBehavior';
import {
  isAboardVehicle,
  isUnderWay,
  sendVehicle,
  startVehicle,
  stepVehicle,
} from '../../../src/traits/vehicle/vehicleBehavior';

describe('the vehicle machine (ADR-366 D5e)', () => {
  let world: WorldModel;
  let a: IFEntity;
  let b: IFEntity;
  let c: IFEntity;
  let player: IFEntity;

  function room(name: string): IFEntity {
    const r = world.createEntity(name, EntityType.ROOM);
    r.add(new RoomTrait({ exits: {} }));
    r.add(new IdentityTrait({ name }));
    return r;
  }

  function vehicle(name: string, trait: VehicleTrait, at: IFEntity): IFEntity {
    const v = world.createEntity(name, EntityType.ITEM);
    v.add(new IdentityTrait({ name }));
    v.add(new ContainerTrait());
    v.add(new EnterableTrait());
    v.add(trait);
    world.moveEntity(v.id, at.id);
    return v;
  }

  function model<T extends VehicleTrait['model']>(v: IFEntity): NonNullable<T> {
    return v.get(VehicleTrait)!.model as NonNullable<T>;
  }

  beforeEach(() => {
    world = new WorldModel();
    a = room('A');
    b = room('B');
    c = room('C');
    player = world.createEntity('player', EntityType.ACTOR);
    player.add(new ActorTrait());
    world.moveEntity(player.id, a.id);
  });

  describe('a vehicle at rest', () => {
    it('no model, a streets model, or a line not under way: nothing moves and nothing is reported', () => {
      const tub = vehicle('tub', new VehicleTrait(), a);
      const car = vehicle('car', new VehicleTrait({ model: { kind: 'streets' } }), a);
      const tram = vehicle('tram', new VehicleTrait({ model: { kind: 'line', stops: [a.id, b.id], oneWay: false, drive: 'control', pace: 1 } }), a);
      expect(stepVehicle(world, tub)).toBeUndefined();
      expect(stepVehicle(world, car)).toBeUndefined();
      expect(stepVehicle(world, tram)).toBeUndefined();
      expect(world.getLocation(tram.id)).toBe(a.id);
    });
  });

  describe('a control line (D5a)', () => {
    it('steps one stop every `pace` turns, carrying its rider, and halts itself at the end', () => {
      const tram = vehicle('tram', new VehicleTrait({ model: { kind: 'line', stops: [a.id, b.id, c.id], oneWay: false, drive: 'control', pace: 2 } }), a);
      world.moveEntity(player.id, tram.id);
      expect(startVehicle(world, tram)).toBe(true);

      expect(stepVehicle(world, tram)).toBeUndefined();
      expect(world.getLocation(tram.id)).toBe(a.id);
      expect(model<{ kind: 'line'; turnsToStep: number }>(tram).turnsToStep).toBe(1);

      expect(stepVehicle(world, tram)).toEqual({ kind: 'arrived', roomId: b.id });
      expect(world.getLocation(tram.id)).toBe(b.id);
      expect(world.getContainingRoom(player.id)?.id).toBe(b.id);
      expect(isUnderWay(tram)).toBe(true);
      expect(model<{ kind: 'line'; turnsToStep: number }>(tram).turnsToStep).toBe(2);

      stepVehicle(world, tram);
      expect(stepVehicle(world, tram)).toEqual({ kind: 'arrived', roomId: c.id });
      expect(world.getLocation(tram.id)).toBe(c.id);
      expect(isUnderWay(tram)).toBe(false);
      expect(stepVehicle(world, tram)).toBeUndefined();
    });

    it('a `both` line started at its end runs back; a one-way line at its end refuses to start', () => {
      const both = vehicle('lift', new VehicleTrait({ model: { kind: 'line', stops: [a.id, b.id], oneWay: false, drive: 'control', pace: 1 } }), b);
      expect(startVehicle(world, both)).toBe(true);
      expect(stepVehicle(world, both)).toEqual({ kind: 'arrived', roomId: a.id });
      expect(world.getLocation(both.id)).toBe(a.id);
      expect(isUnderWay(both)).toBe(false);

      const oneWay = vehicle('chute', new VehicleTrait({ model: { kind: 'line', stops: [a.id, b.id], oneWay: true, drive: 'control', pace: 1 } }), b);
      expect(startVehicle(world, oneWay)).toBe(false);
      expect(isUnderWay(oneWay)).toBe(false);
    });

    it('a line found off its stops halts where it is and reports stopped once', () => {
      const tram = vehicle('tram', new VehicleTrait({ model: { kind: 'line', stops: [a.id, b.id], oneWay: false, drive: 'control', pace: 1 } }), a);
      startVehicle(world, tram);
      world.moveEntity(tram.id, c.id);
      expect(stepVehicle(world, tram)).toEqual({ kind: 'stopped' });
      expect(isUnderWay(tram)).toBe(false);
      expect(world.getLocation(tram.id)).toBe(c.id);
      expect(stepVehicle(world, tram)).toBeUndefined();
    });
  });

  describe('a state line (D5a)', () => {
    it('moves to the block\'s answer when it differs from where it is, and stays when it does not', () => {
      const bucket = vehicle('bucket', new VehicleTrait({ model: { kind: 'line', stops: [a.id, b.id], oneWay: false, drive: 'state' } }), a);
      world.moveEntity(player.id, bucket.id);
      expect(stepVehicle(world, bucket, a.id)).toBeUndefined();
      expect(stepVehicle(world, bucket, b.id)).toEqual({ kind: 'arrived', roomId: b.id });
      expect(world.getLocation(bucket.id)).toBe(b.id);
      expect(world.getContainingRoom(player.id)?.id).toBe(b.id);
      expect(stepVehicle(world, bucket, b.id)).toBeUndefined();
    });

    it('ignores an answer that is not a stop, and an absent answer', () => {
      const bucket = vehicle('bucket', new VehicleTrait({ model: { kind: 'line', stops: [a.id, b.id], oneWay: false, drive: 'state' } }), a);
      expect(stepVehicle(world, bucket, c.id)).toBeUndefined();
      expect(stepVehicle(world, bucket)).toBeUndefined();
      expect(world.getLocation(bucket.id)).toBe(a.id);
    });
  });

  describe('a compass vehicle (D5c, D6)', () => {
    function connect(from: IFEntity, to: IFEntity, via?: string): void {
      from.get(RoomTrait)!.exits[Direction.NORTH] = { destination: to.id, ...(via !== undefined ? { via } : {}) };
    }

    it('moves one room along its heading every `pace` turns while the room admits it, then stops once', () => {
      const ship = vehicle('ship', new VehicleTrait({ model: { kind: 'compass', drive: 'control', pace: 2 } }), a);
      connect(a, b);
      connect(b, c);
      b.get(RoomTrait)!.admits.vehicles = [ship.id];
      world.moveEntity(player.id, ship.id);
      expect(startVehicle(world, ship, Direction.NORTH)).toBe(true);

      expect(stepVehicle(world, ship)).toBeUndefined();
      expect(stepVehicle(world, ship)).toEqual({ kind: 'arrived', roomId: b.id });
      expect(world.getLocation(ship.id)).toBe(b.id);
      expect(world.getContainingRoom(player.id)?.id).toBe(b.id);
      expect(model<{ kind: 'compass'; heading: string | null; turnsToStep: number }>(ship)).toMatchObject({ heading: Direction.NORTH, turnsToStep: 2 });

      // C does not admit the ship: the heading clears and it is stopped, once.
      stepVehicle(world, ship);
      expect(stepVehicle(world, ship)).toEqual({ kind: 'stopped' });
      expect(world.getLocation(ship.id)).toBe(b.id);
      expect(isUnderWay(ship)).toBe(false);
      expect(stepVehicle(world, ship)).toBeUndefined();
    });

    it('stops at a missing exit and at a closed door; an open door lets it through', () => {
      const ship = vehicle('ship', new VehicleTrait({ model: { kind: 'compass', drive: 'control', pace: 1 } }), a);
      startVehicle(world, ship, Direction.NORTH);
      expect(stepVehicle(world, ship)).toEqual({ kind: 'stopped' });
      expect(model<{ kind: 'compass'; heading: string | null; turnsToStep: number }>(ship)).toMatchObject({ heading: null, turnsToStep: 0 });

      const gate = world.createEntity('gate', EntityType.DOOR);
      gate.add(new DoorTrait({ room1: a.id, room2: b.id }));
      gate.add(new OpenableTrait({ isOpen: false }));
      connect(a, b, gate.id);
      b.get(RoomTrait)!.admits.vehicles = [ship.id];
      startVehicle(world, ship, Direction.NORTH);
      expect(stepVehicle(world, ship)).toEqual({ kind: 'stopped' });
      expect(world.getLocation(ship.id)).toBe(a.id);
      expect(model<{ kind: 'compass'; heading: string | null; turnsToStep: number }>(ship)).toMatchObject({ heading: null, turnsToStep: 0 });

      gate.get(OpenableTrait)!.isOpen = true;
      startVehicle(world, ship, Direction.NORTH);
      expect(stepVehicle(world, ship)).toEqual({ kind: 'arrived', roomId: b.id });
      expect(world.getLocation(ship.id)).toBe(b.id);
    });

    it('stops at a blocked exit and at a hidden one, reading traversal like every mover (ADR-378 D0)', () => {
      const ship = vehicle('ship', new VehicleTrait({ model: { kind: 'compass', drive: 'control', pace: 1 } }), a);
      connect(a, b);
      b.get(RoomTrait)!.admits.vehicles = [ship.id];

      // Blocked by a live evaluator (Chord `north is blocked while …`): before
      // ADR-378 the machine drove through it.
      world.registerEvaluator(exitBlockedKey(a.id, Direction.NORTH), () => true);
      startVehicle(world, ship, Direction.NORTH);
      expect(stepVehicle(world, ship)).toEqual({ kind: 'stopped' });
      expect(world.getLocation(ship.id)).toBe(a.id);
      expect(isUnderWay(ship)).toBe(false);

      // Unblocked but hidden (`north to B while …`, false): the way is not there.
      world.registerEvaluator(exitBlockedKey(a.id, Direction.NORTH), () => false);
      world.registerEvaluator(exitHiddenKey(a.id, Direction.NORTH), () => true);
      startVehicle(world, ship, Direction.NORTH);
      expect(stepVehicle(world, ship)).toEqual({ kind: 'stopped' });
      expect(world.getLocation(ship.id)).toBe(a.id);

      // Shown again: it goes.
      world.registerEvaluator(exitHiddenKey(a.id, Direction.NORTH), () => false);
      startVehicle(world, ship, Direction.NORTH);
      expect(stepVehicle(world, ship)).toEqual({ kind: 'arrived', roomId: b.id });
      expect(world.getLocation(ship.id)).toBe(b.id);
    });

    it('stops at a locked door (new with the shared query) and at an exit blocked by the stamped map', () => {
      const ship = vehicle('ship', new VehicleTrait({ model: { kind: 'compass', drive: 'control', pace: 1 } }), a);
      const gate = world.createEntity('gate', EntityType.DOOR);
      gate.add(new DoorTrait({ room1: a.id, room2: b.id }));
      gate.add(new OpenableTrait({ isOpen: true }));
      gate.add(new LockableTrait({ isLocked: true }));
      connect(a, b, gate.id);
      b.get(RoomTrait)!.admits.vehicles = [ship.id];

      startVehicle(world, ship, Direction.NORTH);
      expect(stepVehicle(world, ship)).toEqual({ kind: 'stopped' });
      expect(world.getLocation(ship.id)).toBe(a.id);
      expect(model<{ kind: 'compass'; heading: string | null; turnsToStep: number }>(ship)).toMatchObject({ heading: null, turnsToStep: 0 });

      gate.get(LockableTrait)!.isLocked = false;
      RoomBehavior.blockExit(a, Direction.NORTH, 'A chain across the way.');
      startVehicle(world, ship, Direction.NORTH);
      expect(stepVehicle(world, ship)).toEqual({ kind: 'stopped' });
      expect(world.getLocation(ship.id)).toBe(a.id);

      RoomBehavior.unblockExit(a, Direction.NORTH);
      startVehicle(world, ship, Direction.NORTH);
      expect(stepVehicle(world, ship)).toEqual({ kind: 'arrived', roomId: b.id });
      expect(world.getLocation(ship.id)).toBe(b.id);
    });
  });

  describe('a flight vehicle (D5d)', () => {
    it('leaves its room on the first turn, is nowhere for the passage, then arrives and is no longer under way', () => {
      const sparrow = vehicle('Sparrow', new VehicleTrait({ model: { kind: 'flight', drive: 'control', destinations: [a.id, c.id], passage: 2 } }), a);
      const hold = room('Hold');
      hold.add(new AboardTrait({ vehicleId: sparrow.id }));
      world.moveEntity(hold.id, sparrow.id);
      world.moveEntity(player.id, hold.id);
      expect(sendVehicle(world, sparrow, c.id)).toBe(true);

      expect(stepVehicle(world, sparrow)).toEqual({ kind: 'departed' });
      expect(world.getLocation(sparrow.id)).toBeUndefined();
      expect(isUnderWay(sparrow)).toBe(true);
      // The departure turn does not count against the passage.
      expect(model<{ kind: 'flight'; destination: string | null; turnsRemaining: number }>(sparrow)).toMatchObject({ destination: c.id, turnsRemaining: 2 });
      expect(world.getLocation(player.id)).toBe(hold.id);

      expect(stepVehicle(world, sparrow)).toBeUndefined();
      expect(model<{ kind: 'flight'; turnsRemaining: number }>(sparrow).turnsRemaining).toBe(1);
      expect(stepVehicle(world, sparrow)).toEqual({ kind: 'arrived', roomId: c.id });
      expect(world.getLocation(sparrow.id)).toBe(c.id);
      // The rider's room is the Hold, which the Sparrow carried to C (D4, D7).
      expect(world.getLocation(player.id)).toBe(hold.id);
      expect(world.getLocation(hold.id)).toBe(sparrow.id);
      expect(isUnderWay(sparrow)).toBe(false);
      expect(model<{ kind: 'flight'; destination: string | null; turnsRemaining: number }>(sparrow)).toMatchObject({ destination: null, turnsRemaining: 0 });
      expect(stepVehicle(world, sparrow)).toBeUndefined();
    });
  });

  describe('who is aboard (D7)', () => {
    it('inside the vehicle at any depth, or in a room aboard it', () => {
      const sparrow = vehicle('Sparrow', new VehicleTrait({ model: { kind: 'flight', drive: 'control', destinations: [a.id, c.id], passage: 1 } }), a);
      const hold = room('Hold');
      hold.add(new AboardTrait({ vehicleId: sparrow.id }));
      const crate = world.createEntity('crate', EntityType.ITEM);
      crate.add(new ContainerTrait());
      world.moveEntity(crate.id, hold.id);
      expect(isAboardVehicle(world, player.id, sparrow.id)).toBe(false);
      world.moveEntity(player.id, hold.id);
      expect(isAboardVehicle(world, player.id, sparrow.id)).toBe(true);
      world.moveEntity(player.id, crate.id);
      expect(isAboardVehicle(world, player.id, sparrow.id)).toBe(true);
      world.moveEntity(player.id, sparrow.id);
      expect(isAboardVehicle(world, player.id, sparrow.id)).toBe(true);
    });
  });

  describe('the machine state survives a save (D5g)', () => {
    it('a voyage restored mid-passage still arrives on schedule', () => {
      const sparrow = vehicle('Sparrow', new VehicleTrait({ model: { kind: 'flight', drive: 'control', destinations: [a.id, c.id], passage: 3 } }), a);
      sendVehicle(world, sparrow, c.id);
      stepVehicle(world, sparrow);
      stepVehicle(world, sparrow);

      const restored = new WorldModel();
      restored.loadJSON(world.toJSON());
      const back = restored.getEntity(sparrow.id)!;
      expect(back.get(VehicleTrait)!.model).toMatchObject({ kind: 'flight', destination: c.id, turnsRemaining: 2 });
      expect(restored.getLocation(back.id)).toBeUndefined();

      expect(stepVehicle(restored, back)).toBeUndefined();
      expect(stepVehicle(restored, back)).toEqual({ kind: 'arrived', roomId: c.id });
      expect(restored.getLocation(back.id)).toBe(c.id);
    });

    it('a compass heading and step count come back as written', () => {
      const ship = vehicle('ship', new VehicleTrait({ model: { kind: 'compass', drive: 'player', pace: 3 } }), a);
      startVehicle(world, ship, Direction.NORTH);
      stepVehicle(world, ship);
      const restored = new WorldModel();
      restored.loadJSON(world.toJSON());
      expect(restored.getEntity(ship.id)!.get(VehicleTrait)!.model).toMatchObject({ kind: 'compass', heading: Direction.NORTH, turnsToStep: 2 });
    });
  });
});
