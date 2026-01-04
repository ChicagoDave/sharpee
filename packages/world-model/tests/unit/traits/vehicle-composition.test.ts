/**
 * Vehicle Composition Tests
 *
 * Tests how VehicleTrait composes with other traits (Container, Supporter)
 * to create different types of vehicles.
 *
 * Scenarios:
 * 1. Boat in river - container vehicle, moves between river locations
 * 2. Car on street - container vehicle, moves along roads
 * 3. Tram on cable - supporter vehicle (you stand on it), moves on fixed path
 * 4. Elevator - container vehicle, moves between floors
 */

import { WorldModel } from '../../../src/world/WorldModel';
import { IFEntity } from '../../../src/entities/if-entity';
import { EntityType } from '../../../src/entities/entity-types';
import { IdentityTrait } from '../../../src/traits/identity/identityTrait';
import { ContainerTrait } from '../../../src/traits/container/containerTrait';
import { SupporterTrait } from '../../../src/traits/supporter/supporterTrait';
import { OpenableTrait } from '../../../src/traits/openable/openableTrait';
import { RoomTrait } from '../../../src/traits/room/roomTrait';
import { VehicleTrait } from '../../../src/traits/vehicle/vehicleTrait';
import { TraitType } from '../../../src/traits/trait-types';
import { isVehicle, isActorInVehicle, canActorWalk } from '../../../src/traits/vehicle/vehicleBehavior';

describe('Vehicle Composition', () => {
  let world: WorldModel;

  beforeEach(() => {
    world = new WorldModel();
  });

  describe('Trait Composition Basics', () => {
    it('should allow VehicleTrait + ContainerTrait on same entity', () => {
      const boat = world.createEntity('boat', EntityType.ITEM);
      boat.add(new IdentityTrait({ name: 'rowboat' }));
      boat.add(new ContainerTrait({ capacity: { maxItems: 5 }, enterable: true }));
      boat.add(new VehicleTrait({ vehicleType: 'watercraft', blocksWalkingMovement: true }));

      expect(boat.has(TraitType.CONTAINER)).toBe(true);
      expect(boat.has(TraitType.VEHICLE)).toBe(true);

      const container = boat.get(TraitType.CONTAINER) as ContainerTrait;
      expect(container.enterable).toBe(true);

      const vehicle = boat.get(TraitType.VEHICLE) as VehicleTrait;
      expect(vehicle.vehicleType).toBe('watercraft');
    });

    it('should allow VehicleTrait + SupporterTrait on same entity', () => {
      const tram = world.createEntity('tram', EntityType.ITEM);
      tram.add(new IdentityTrait({ name: 'cable tram' }));
      tram.add(new SupporterTrait({ capacity: { maxItems: 10 }, enterable: true }));
      tram.add(new VehicleTrait({ vehicleType: 'cable', blocksWalkingMovement: true }));

      expect(tram.has(TraitType.SUPPORTER)).toBe(true);
      expect(tram.has(TraitType.VEHICLE)).toBe(true);

      const supporter = tram.get(TraitType.SUPPORTER) as SupporterTrait;
      expect(supporter.enterable).toBe(true);
    });

    it('should find enterable property on ContainerTrait', () => {
      const elevator = world.createEntity('elevator', EntityType.ITEM);
      elevator.add(new IdentityTrait({ name: 'elevator' }));
      elevator.add(new ContainerTrait({ capacity: { maxItems: 5 }, enterable: true }));
      elevator.add(new OpenableTrait({ isOpen: true }));
      elevator.add(new VehicleTrait({ vehicleType: 'generic', blocksWalkingMovement: true }));

      // This is what the scope evaluator needs to check
      const containerTrait = elevator.get(TraitType.CONTAINER) as ContainerTrait;
      expect(containerTrait).toBeDefined();
      expect(containerTrait.enterable).toBe(true);
    });

    it('should find enterable property on SupporterTrait', () => {
      const platform = world.createEntity('platform', EntityType.ITEM);
      platform.add(new IdentityTrait({ name: 'moving platform' }));
      platform.add(new SupporterTrait({ capacity: { maxItems: 3 }, enterable: true }));
      platform.add(new VehicleTrait({ vehicleType: 'generic', blocksWalkingMovement: true }));

      const supporterTrait = platform.get(TraitType.SUPPORTER) as SupporterTrait;
      expect(supporterTrait).toBeDefined();
      expect(supporterTrait.enterable).toBe(true);
    });
  });

  describe('Boat in River Scenario', () => {
    let riverBank: IFEntity;
    let middleRiver: IFEntity;
    let farShore: IFEntity;
    let boat: IFEntity;
    let player: IFEntity;

    beforeEach(() => {
      // Create river locations
      riverBank = world.createEntity('river-bank', EntityType.ROOM);
      riverBank.add(new RoomTrait({ exits: {} }));
      riverBank.add(new IdentityTrait({ name: 'River Bank', description: 'The near shore of a wide river.' }));

      middleRiver = world.createEntity('middle-river', EntityType.ROOM);
      middleRiver.add(new RoomTrait({ exits: {} }));
      middleRiver.add(new IdentityTrait({ name: 'Middle of River', description: 'You are in the middle of the river.' }));

      farShore = world.createEntity('far-shore', EntityType.ROOM);
      farShore.add(new RoomTrait({ exits: {} }));
      farShore.add(new IdentityTrait({ name: 'Far Shore', description: 'The far shore of the river.' }));

      // Create boat - an enterable container that is also a vehicle
      boat = world.createEntity('boat', EntityType.ITEM);
      boat.add(new IdentityTrait({
        name: 'rowboat',
        aliases: ['boat', 'small boat'],
        description: 'A small wooden rowboat.'
      }));
      boat.add(new ContainerTrait({
        capacity: { maxItems: 5, maxWeight: 100 },
        enterable: true
      }));
      boat.add(new VehicleTrait({
        vehicleType: 'watercraft',
        blocksWalkingMovement: true
      }));
      world.moveEntity(boat.id, riverBank.id);

      // Create player
      player = world.createEntity('player', EntityType.ACTOR);
      player.add(new IdentityTrait({ name: 'player' }));
      world.moveEntity(player.id, riverBank.id);
    });

    it('should allow player to enter the boat', () => {
      // Player enters boat
      world.moveEntity(player.id, boat.id);

      expect(world.getLocation(player.id)).toBe(boat.id);
    });

    it('should move player with boat when boat moves', () => {
      // Player enters boat
      world.moveEntity(player.id, boat.id);

      // Boat moves to middle of river
      world.moveEntity(boat.id, middleRiver.id);

      // Player should still be in boat
      expect(world.getLocation(player.id)).toBe(boat.id);
      // Boat should be in middle river
      expect(world.getLocation(boat.id)).toBe(middleRiver.id);
    });

    it('should allow player to exit boat', () => {
      // Player in boat, boat in middle river
      world.moveEntity(player.id, boat.id);
      world.moveEntity(boat.id, middleRiver.id);

      // Player exits to the room the boat is in
      const boatLocation = world.getLocation(boat.id);
      world.moveEntity(player.id, boatLocation!);

      expect(world.getLocation(player.id)).toBe(middleRiver.id);
    });
  });

  describe('Elevator Between Floors Scenario', () => {
    let floor1: IFEntity;
    let floor2: IFEntity;
    let floor3: IFEntity;
    let elevator: IFEntity;
    let player: IFEntity;

    beforeEach(() => {
      // Create floors
      floor1 = world.createEntity('floor-1', EntityType.ROOM);
      floor1.add(new RoomTrait({ exits: {} }));
      floor1.add(new IdentityTrait({ name: 'First Floor' }));

      floor2 = world.createEntity('floor-2', EntityType.ROOM);
      floor2.add(new RoomTrait({ exits: {} }));
      floor2.add(new IdentityTrait({ name: 'Second Floor' }));

      floor3 = world.createEntity('floor-3', EntityType.ROOM);
      floor3.add(new RoomTrait({ exits: {} }));
      floor3.add(new IdentityTrait({ name: 'Third Floor' }));

      // Create elevator - openable container vehicle
      elevator = world.createEntity('elevator', EntityType.ITEM);
      elevator.add(new IdentityTrait({
        name: 'elevator',
        aliases: ['lift', 'elevator car'],
        description: 'A small elevator with buttons for floors 1-3.'
      }));
      elevator.add(new ContainerTrait({
        capacity: { maxItems: 10, maxWeight: 500 },
        enterable: true
      }));
      elevator.add(new OpenableTrait({ isOpen: true }));
      elevator.add(new VehicleTrait({
        vehicleType: 'generic',
        blocksWalkingMovement: true
      }));
      world.moveEntity(elevator.id, floor1.id);

      // Create player
      player = world.createEntity('player', EntityType.ACTOR);
      player.add(new IdentityTrait({ name: 'player' }));
      world.moveEntity(player.id, floor1.id);
    });

    it('should allow entering elevator when open', () => {
      world.moveEntity(player.id, elevator.id);
      expect(world.getLocation(player.id)).toBe(elevator.id);
    });

    it('should transport player between floors', () => {
      // Enter elevator on floor 1
      world.moveEntity(player.id, elevator.id);

      // Elevator goes to floor 3
      world.moveEntity(elevator.id, floor3.id);

      // Player is still in elevator
      expect(world.getLocation(player.id)).toBe(elevator.id);
      // Elevator is on floor 3
      expect(world.getLocation(elevator.id)).toBe(floor3.id);

      // Exit elevator
      world.moveEntity(player.id, floor3.id);
      expect(world.getLocation(player.id)).toBe(floor3.id);
    });
  });

  describe('Cable Tram Scenario', () => {
    let station1: IFEntity;
    let station2: IFEntity;
    let tram: IFEntity;
    let player: IFEntity;

    beforeEach(() => {
      station1 = world.createEntity('station-1', EntityType.ROOM);
      station1.add(new RoomTrait({ exits: {} }));
      station1.add(new IdentityTrait({ name: 'Lower Station' }));

      station2 = world.createEntity('station-2', EntityType.ROOM);
      station2.add(new RoomTrait({ exits: {} }));
      station2.add(new IdentityTrait({ name: 'Upper Station' }));

      // Tram as a supporter (you stand ON it, not IN it)
      tram = world.createEntity('tram', EntityType.ITEM);
      tram.add(new IdentityTrait({
        name: 'cable tram',
        aliases: ['tram', 'cable car'],
        description: 'An open-air tram suspended from a cable.'
      }));
      tram.add(new SupporterTrait({
        capacity: { maxItems: 8 },
        enterable: true
      }));
      tram.add(new VehicleTrait({
        vehicleType: 'cable',
        blocksWalkingMovement: true
      }));
      world.moveEntity(tram.id, station1.id);

      player = world.createEntity('player', EntityType.ACTOR);
      player.add(new IdentityTrait({ name: 'player' }));
      world.moveEntity(player.id, station1.id);
    });

    it('should allow boarding tram (supporter)', () => {
      world.moveEntity(player.id, tram.id);
      expect(world.getLocation(player.id)).toBe(tram.id);
    });

    it('should transport player on tram', () => {
      world.moveEntity(player.id, tram.id);
      world.moveEntity(tram.id, station2.id);

      expect(world.getLocation(player.id)).toBe(tram.id);
      expect(world.getLocation(tram.id)).toBe(station2.id);
    });
  });

  describe('Vehicle Behavior Utilities', () => {
    let room: IFEntity;
    let vehicle: IFEntity;
    let player: IFEntity;

    beforeEach(() => {
      room = world.createEntity('room', EntityType.ROOM);
      room.add(new RoomTrait({ exits: {} }));

      vehicle = world.createEntity('car', EntityType.ITEM);
      vehicle.add(new IdentityTrait({ name: 'car' }));
      vehicle.add(new ContainerTrait({ enterable: true }));
      vehicle.add(new VehicleTrait({ vehicleType: 'generic', blocksWalkingMovement: true }));
      world.moveEntity(vehicle.id, room.id);

      player = world.createEntity('player', EntityType.ACTOR);
      world.moveEntity(player.id, room.id);
    });

    it('isVehicle should return true for entities with VehicleTrait', () => {
      expect(isVehicle(vehicle)).toBe(true);
      expect(isVehicle(room)).toBe(false);
    });

    it('isActorInVehicle should detect when player is in a vehicle', () => {
      expect(isActorInVehicle(world, player.id)).toBe(false);

      world.moveEntity(player.id, vehicle.id);
      expect(isActorInVehicle(world, player.id)).toBe(true);
    });

    it('canActorWalk should return false when in blocking vehicle', () => {
      const resultOutside = canActorWalk(world, player.id);
      expect(resultOutside.canWalk).toBe(true);

      world.moveEntity(player.id, vehicle.id);
      const resultInside = canActorWalk(world, player.id);
      expect(resultInside.canWalk).toBe(false);
      expect(resultInside.vehicle).toBe(vehicle);
    });
  });
});
