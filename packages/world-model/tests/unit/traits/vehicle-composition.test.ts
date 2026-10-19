/**
 * Vehicle model tests (ADR-366 D3, D4, D5, D6, D8, D9)
 *
 * A vehicle carries only its movement model; where it is, which stop it is
 * at, and whether the player sees out are read from the world. Each test
 * asserts on world state (locations, the describable place), not on a copy.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { WorldModel } from '../../../src/world/WorldModel';
import { IFEntity } from '../../../src/entities/if-entity';
import { EntityType } from '../../../src/entities/entity-types';
import { IdentityTrait } from '../../../src/traits/identity/identityTrait';
import { ContainerTrait } from '../../../src/traits/container/containerTrait';
import { SupporterTrait } from '../../../src/traits/supporter/supporterTrait';
import { OpenableTrait } from '../../../src/traits/openable/openableTrait';
import { EnterableTrait } from '../../../src/traits/enterable/enterableTrait';
import { RoomTrait } from '../../../src/traits/room/roomTrait';
import { ActorTrait } from '../../../src/traits/actor/actorTrait';
import { VehicleTrait } from '../../../src/traits/vehicle/vehicleTrait';
import { VisibilityBehavior } from '../../../src/world/VisibilityBehavior';
import { AboardTrait } from '../../../src/traits/vehicle/aboardTrait';
import { RoomBehavior } from '../../../src/traits/room/roomBehavior';
import {
  admitsVehicle,
  currentStop,
  goingFromVehicle,
  isStop,
  isUnderWay,
  moveVehicleToStop,
  registerVehicleExitResolver,
  sendVehicle,
  startVehicle,
  stopVehicle,
} from '../../../src/traits/vehicle/vehicleBehavior';

describe('Vehicle model', () => {
  let world: WorldModel;
  let top: IFEntity;
  let bottom: IFEntity;
  let elsewhere: IFEntity;
  let player: IFEntity;

  function room(name: string): IFEntity {
    const r = world.createEntity(name, EntityType.ROOM);
    r.add(new RoomTrait({ exits: {} }));
    r.add(new IdentityTrait({ name }));
    return r;
  }

  function vehicle(name: string, trait: VehicleTrait): IFEntity {
    const v = world.createEntity(name, EntityType.ITEM);
    v.add(new IdentityTrait({ name }));
    v.add(new ContainerTrait());
    v.add(new EnterableTrait());
    v.add(trait);
    return v;
  }

  beforeEach(() => {
    world = new WorldModel();
    top = room('Top of Well');
    bottom = room('Well Bottom');
    elsewhere = room('Elsewhere');
    player = world.createEntity('player', EntityType.ACTOR);
    player.add(new ActorTrait());
    world.moveEntity(player.id, top.id);
  });

  describe('the trait (D8)', () => {
    it('refuses a line with fewer than two stops', () => {
      expect(() => new VehicleTrait({ model: { kind: 'line', stops: [top.id], oneWay: false, drive: 'control' } }))
        .toThrow('at least two stops');
    });

    it('refuses a line that names a stop twice', () => {
      expect(() => new VehicleTrait({ model: { kind: 'line', stops: [top.id, top.id], oneWay: false, drive: 'control' } }))
        .toThrow('each stop once');
    });

    it('owns its stops: changing the array it was built from changes nothing', () => {
      const stops = [top.id, bottom.id];
      const trait = new VehicleTrait({ model: { kind: 'line', stops, oneWay: false, drive: 'control' } });
      stops.push(elsewhere.id);
      expect(trait.model).toEqual({ kind: 'line', stops: [top.id, bottom.id], oneWay: false, drive: 'control', underWay: false, travelDirection: 'onward', turnsToStep: 0 });
    });
  });

  describe('the line (D5a, D4, D9)', () => {
    let bucket: IFEntity;

    beforeEach(() => {
      bucket = vehicle('bucket', new VehicleTrait({
        model: { kind: 'line', stops: [top.id, bottom.id], oneWay: false, drive: 'control' }
      }));
      world.moveEntity(bucket.id, top.id);
    });

    it('reads the current stop from the vehicle\'s location', () => {
      expect(currentStop(world, bucket)).toBe(top.id);
      world.moveEntity(bucket.id, elsewhere.id);
      expect(currentStop(world, bucket)).toBeUndefined();
      expect(isStop(bucket, bottom.id)).toBe(true);
      expect(isStop(bucket, elsewhere.id)).toBe(false);
    });

    it('moving to a stop carries the rider and what is held at every depth', () => {
      const box = world.createEntity('box', EntityType.ITEM);
      box.add(new ContainerTrait());
      const coin = world.createEntity('coin', EntityType.ITEM);
      world.moveEntity(box.id, bucket.id);
      world.moveEntity(coin.id, box.id);
      world.moveEntity(player.id, bucket.id);

      moveVehicleToStop(world, bucket, bottom.id);

      expect(world.getLocation(bucket.id)).toBe(bottom.id);
      expect(world.getLocation(player.id)).toBe(bucket.id);
      expect(world.getLocation(box.id)).toBe(bucket.id);
      expect(world.getLocation(coin.id)).toBe(box.id);
      expect(world.getContainingRoom(player.id)?.id).toBe(bottom.id);
      expect(world.getContainingRoom(coin.id)?.id).toBe(bottom.id);
      expect(currentStop(world, bucket)).toBe(bottom.id);
    });

    it('refuses a room that is not a stop, and does not move', () => {
      expect(() => moveVehicleToStop(world, bucket, elsewhere.id)).toThrow('is not a stop');
      expect(world.getLocation(bucket.id)).toBe(top.id);
    });

    it('refuses a vehicle with no line, and does not move it', () => {
      const tub = vehicle('tub', new VehicleTrait());
      world.moveEntity(tub.id, top.id);
      expect(() => moveVehicleToStop(world, tub, bottom.id)).toThrow('has no line');
      expect(world.getLocation(tub.id)).toBe(top.id);
    });

    it('GO from inside rides: the player does not walk', () => {
      world.moveEntity(player.id, bucket.id);
      expect(goingFromVehicle(world, player.id)).toEqual({ kind: 'rides', vehicle: bucket });
    });
  });

  describe('what GO means from where the actor is (D5)', () => {
    it('on foot outside any vehicle', () => {
      expect(goingFromVehicle(world, player.id)).toEqual({ kind: 'on-foot' });
    });

    it('a vehicle with no model stays put', () => {
      const tub = vehicle('tub', new VehicleTrait());
      world.moveEntity(tub.id, top.id);
      world.moveEntity(player.id, tub.id);
      expect(goingFromVehicle(world, player.id)).toEqual({ kind: 'stays', vehicle: tub });
    });

    it('a streets vehicle is steered', () => {
      const car = vehicle('car', new VehicleTrait({ model: { kind: 'streets' } }));
      world.moveEntity(car.id, top.id);
      world.moveEntity(player.id, car.id);
      expect(goingFromVehicle(world, player.id)).toEqual({ kind: 'steers', vehicle: car });
    });
  });

  describe('admits (D6)', () => {
    it('a room admits no vehicle until it names it', () => {
      const car = vehicle('car', new VehicleTrait({ model: { kind: 'streets' } }));
      expect(admitsVehicle(bottom, car)).toBe(false);
      bottom.get(RoomTrait)!.admits.push(car.id);
      expect(admitsVehicle(bottom, car)).toBe(true);
      expect(admitsVehicle(elsewhere, car)).toBe(false);
    });
  });

  describe('seeing out is the enclosure\'s rule (D3)', () => {
    function placeOf(): { place: string; enclosure: string | undefined } {
      const { location, immediateContainer } = VisibilityBehavior.getDescribableLocation(player, world);
      return { place: location.id, enclosure: immediateContainer?.id };
    }

    it('a lidless vehicle shows the room around it', () => {
      const bucket = vehicle('bucket', new VehicleTrait());
      world.moveEntity(bucket.id, top.id);
      world.moveEntity(player.id, bucket.id);
      expect(placeOf()).toEqual({ place: top.id, enclosure: bucket.id });
    });

    it('a lidless container that is not a vehicle shows the room too (GH #467)', () => {
      const basket = world.createEntity('basket', EntityType.ITEM);
      basket.add(new ContainerTrait());
      world.moveEntity(basket.id, top.id);
      world.moveEntity(player.id, basket.id);
      expect(placeOf()).toEqual({ place: top.id, enclosure: basket.id });
    });

    it('a closed transparent vehicle shows the room through its windows', () => {
      const car = vehicle('car', new VehicleTrait());
      car.get(ContainerTrait)!.isTransparent = true;
      world.moveEntity(car.id, top.id);
      world.moveEntity(player.id, car.id);
      car.add(new OpenableTrait({ isOpen: false }));
      expect(placeOf()).toEqual({ place: top.id, enclosure: car.id });
    });

    it('a closed opaque vehicle is the place, and opening it shows the room', () => {
      const tube = vehicle('tube', new VehicleTrait());
      world.moveEntity(tube.id, top.id);
      world.moveEntity(player.id, tube.id);
      tube.add(new OpenableTrait({ isOpen: false }));
      expect(placeOf()).toEqual({ place: tube.id, enclosure: undefined });

      tube.get(OpenableTrait)!.isOpen = true;
      expect(placeOf()).toEqual({ place: top.id, enclosure: tube.id });
    });

    it('a vehicle ridden on, even closed and opaque, shows the room', () => {
      const raft = vehicle('raft', new VehicleTrait());
      raft.get(EnterableTrait)!.preposition = 'on';
      world.moveEntity(raft.id, top.id);
      world.moveEntity(player.id, raft.id);
      raft.add(new OpenableTrait({ isOpen: false }));
      expect(placeOf()).toEqual({ place: top.id, enclosure: raft.id });
    });

    it('a supporter shows the room around it', () => {
      const tram = world.createEntity('tram', EntityType.ITEM);
      tram.add(new SupporterTrait({ enterable: true }));
      world.moveEntity(tram.id, top.id);
      world.moveEntity(player.id, tram.id);
      expect(placeOf()).toEqual({ place: top.id, enclosure: tram.id });
    });
  });

  describe('the five models and the machine state they carry (D5, D5g)', () => {
    it('a compass model starts with no heading; a flight model with no destination', () => {
      const ship = new VehicleTrait({ model: { kind: 'compass', drive: 'player', pace: 2 }, commands: ['compass'] });
      expect(ship.model).toEqual({ kind: 'compass', drive: 'player', pace: 2, heading: null, turnsToStep: 0 });
      expect(ship.commands).toEqual(['compass']);
      const courier = new VehicleTrait({ model: { kind: 'flight', drive: 'control', destinations: [top.id, bottom.id], passage: 5 } });
      expect(courier.model).toEqual({ kind: 'flight', drive: 'control', destinations: [top.id, bottom.id], passage: 5, destination: null, turnsRemaining: 0 });
    });

    it('refuses a pace under one turn, a passage under one turn, and a flight with one destination', () => {
      expect(() => new VehicleTrait({ model: { kind: 'compass', drive: 'player', pace: 0 } })).toThrow('pace');
      expect(() => new VehicleTrait({ model: { kind: 'flight', drive: 'control', destinations: [top.id, bottom.id], passage: 0 } })).toThrow('passage');
      expect(() => new VehicleTrait({ model: { kind: 'flight', drive: 'control', destinations: [top.id, top.id], passage: 1 } })).toThrow('two destinations');
    });

    it('GO from inside a compass or flight vehicle rides; from a `none` vehicle it stays', () => {
      const ship = vehicle('ship', new VehicleTrait({ model: { kind: 'compass', drive: 'player', pace: 1 } }));
      world.moveEntity(ship.id, top.id);
      world.moveEntity(player.id, ship.id);
      expect(goingFromVehicle(world, player.id)).toEqual({ kind: 'rides', vehicle: ship });
      const tub = vehicle('tub', new VehicleTrait({ model: { kind: 'none' } }));
      world.moveEntity(tub.id, top.id);
      world.moveEntity(player.id, tub.id);
      expect(goingFromVehicle(world, player.id)).toEqual({ kind: 'stays', vehicle: tub });
    });
  });

  describe('the driving statements set the machine state (D5f)', () => {
    it('start puts a controlled line under way from its stop, turning back at a both-ways end', () => {
      const tram = vehicle('tram', new VehicleTrait({ model: { kind: 'line', stops: [top.id, bottom.id], oneWay: false, drive: 'control', pace: 2 } }));
      world.moveEntity(tram.id, bottom.id);
      expect(isUnderWay(tram)).toBe(false);
      expect(startVehicle(world, tram)).toBe(true);
      expect(tram.get(VehicleTrait)!.model).toMatchObject({ underWay: true, travelDirection: 'back', turnsToStep: 2 });
      expect(isUnderWay(tram)).toBe(true);
      expect(stopVehicle(tram)).toBe(true);
      expect(tram.get(VehicleTrait)!.model).toMatchObject({ underWay: false, turnsToStep: 0 });
    });

    it('start refuses a one-way line at its end', () => {
      const funicular = vehicle('funicular', new VehicleTrait({ model: { kind: 'line', stops: [top.id, bottom.id], oneWay: true, drive: 'control', pace: 1 } }));
      world.moveEntity(funicular.id, bottom.id);
      expect(startVehicle(world, funicular)).toBe(false);
      expect(isUnderWay(funicular)).toBe(false);
    });

    it('start heading sets a compass vehicle\'s heading; stop clears it', () => {
      const ship = vehicle('ship', new VehicleTrait({ model: { kind: 'compass', drive: 'control', pace: 3 } }));
      expect(startVehicle(world, ship)).toBe(false);
      expect(startVehicle(world, ship, 'NORTH')).toBe(true);
      expect(ship.get(VehicleTrait)!.model).toMatchObject({ heading: 'NORTH', turnsToStep: 3 });
      expect(isUnderWay(ship)).toBe(true);
      stopVehicle(ship);
      expect(ship.get(VehicleTrait)!.model).toMatchObject({ heading: null });
    });

    it('send binds a flight vehicle to one of its destinations and nothing else', () => {
      const courier = vehicle('courier', new VehicleTrait({ model: { kind: 'flight', drive: 'control', destinations: [top.id, bottom.id], passage: 4 } }));
      expect(sendVehicle(world, courier, elsewhere.id)).toBe(false);
      expect(sendVehicle(world, courier, bottom.id)).toBe(true);
      expect(courier.get(VehicleTrait)!.model).toMatchObject({ destination: bottom.id, turnsRemaining: 4 });
      expect(isUnderWay(courier)).toBe(true);
    });
  });

  describe('rooms aboard and the outside exit (D7)', () => {
    it('resolves to the vehicle\'s room on each use, through the door, and is blocked under way', () => {
      const courier = vehicle('courier', new VehicleTrait({ model: { kind: 'flight', drive: 'control', destinations: [top.id, bottom.id], passage: 4 } }));
      world.moveEntity(courier.id, top.id);
      const airlock = room('Airlock');
      airlock.add(new AboardTrait({ vehicleId: courier.id, outside: { WEST: { candidates: [top.id, bottom.id], via: 'd-hatch' } } }));
      registerVehicleExitResolver(world);
      const ctx = { world, actorId: player.id, random: { draw: () => 0 } as never };
      expect(airlock.get(AboardTrait)!.computedExits.WEST).toEqual({ candidates: [top.id, bottom.id] });
      expect(RoomBehavior.resolveExit(airlock, 'WEST', ctx)).toEqual({ kind: 'exit', destination: top.id, via: 'd-hatch' });
      world.moveEntity(courier.id, bottom.id);
      expect(RoomBehavior.resolveExit(airlock, 'WEST', ctx)).toEqual({ kind: 'exit', destination: bottom.id, via: 'd-hatch' });
      sendVehicle(world, courier, top.id);
      expect(RoomBehavior.resolveExit(airlock, 'WEST', ctx)).toMatchObject({ kind: 'blocked', messageId: 'if.action.going.vehicle_under_way' });
      expect(RoomBehavior.resolveExit(airlock, 'EAST', ctx)).toBeUndefined();
    });
  });
});
