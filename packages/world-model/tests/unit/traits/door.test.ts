// tests/unit/traits/door.test.ts

import { DoorTrait } from '../../../src/traits/door/doorTrait';
import { IFEntity } from '../../../src/entities/if-entity';
import { TraitType } from '../../../src/traits/trait-types';
import { WorldModel } from '../../../src/world/WorldModel';
import { OpenableTrait } from '../../../src/traits/openable/openableTrait';
import { LockableTrait } from '../../../src/traits/lockable/lockableTrait';
import { createTestDoor, createConnectedRoomsWithDoor } from '../../fixtures/test-interactive';
import { RoomTrait } from '../../../src/traits/room/roomTrait';

describe('DoorTrait', () => {
  let world: WorldModel;

  beforeEach(() => {
    world = new WorldModel();
  });

  describe('initialization', () => {
    it('should create trait with required room connections', () => {
      const kitchen = world.createEntity('Kitchen', 'room');
      const hallway = world.createEntity('Hallway', 'room');
      
      const trait = new DoorTrait({
        room1: kitchen.id,
        room2: hallway.id
      });
      
      expect(trait.type).toBe(TraitType.DOOR);
      expect(trait.room1).toBe(kitchen.id);
      expect(trait.room2).toBe(hallway.id);
      expect(trait.bidirectional).toBe(true);
    });

    it('should throw error without room connections', () => {
      expect(() => new DoorTrait()).toThrow('Door must connect two rooms');
      expect(() => new DoorTrait({})).toThrow('Door must connect two rooms');
      expect(() => new DoorTrait({ room1: 'r01' })).toThrow('Door must connect two rooms');
      expect(() => new DoorTrait({ room2: 'r02' })).toThrow('Door must connect two rooms');
    });

    it('should handle unidirectional doors', () => {
      const entrance = world.createEntity('Entrance', 'room');
      const lobby = world.createEntity('Lobby', 'room');
      
      const trait = new DoorTrait({
        room1: entrance.id,
        room2: lobby.id,
        bidirectional: false
      });
      
      expect(trait.bidirectional).toBe(false);
    });

    it('should maintain bidirectional as default', () => {
      const room1 = world.createEntity('Room 1', 'room');
      const room2 = world.createEntity('Room 2', 'room');
      
      const trait = new DoorTrait({
        room1: room1.id,
        room2: room2.id
      });
      
      expect(trait.bidirectional).toBe(true);
    });
  });

  describe('entity integration', () => {
    it('should attach to entity correctly', () => {
      const northRoom = world.createEntity('North Room', 'room');
      const southRoom = world.createEntity('South Room', 'room');
      const entity = world.createEntity('Wooden Door', 'door');
      const trait = new DoorTrait({
        room1: northRoom.id,
        room2: southRoom.id
      });
      
      entity.add(trait);
      
      expect(entity.hasTrait(TraitType.DOOR)).toBe(true);
      expect(entity.getTrait(TraitType.DOOR)).toBe(trait);
    });

    it('should work with test fixture', () => {
      const library = world.createEntity('Library', 'room');
      const study = world.createEntity('Study', 'room');
      const door = createTestDoor(world, 'Oak Door', library.id, study.id);
      
      expect(door.hasTrait(TraitType.DOOR)).toBe(true);
      expect(door.hasTrait(TraitType.OPENABLE)).toBe(true);
      
      const doorTrait = door.getTrait(TraitType.DOOR) as DoorTrait;
      expect(doorTrait.room1).toBe(library.id);
      expect(doorTrait.room2).toBe(study.id);
    });

    it('should create door with openable trait', () => {
      const room1 = world.createEntity('Room 1', 'room');
      const room2 = world.createEntity('Room 2', 'room');
      const door = createTestDoor(world, 'Glass Door', room1.id, room2.id, {
        isOpen: true
      });
      
      const openable = door.getTrait(TraitType.OPENABLE) as OpenableTrait;
      expect(openable.isOpen).toBe(true);
    });

    it('should create lockable door', () => {
      const vault = world.createEntity('Vault', 'room');
      const corridor = world.createEntity('Corridor', 'room');
      const door = createTestDoor(world, 'Security Door', vault.id, corridor.id, {
        isLocked: true,
        keyId: 'security-key'
      });
      
      expect(door.hasTrait(TraitType.LOCKABLE)).toBe(true);
      
      const lockable = door.getTrait(TraitType.LOCKABLE) as LockableTrait;
      expect(lockable.isLocked).toBe(true);
      expect(lockable.keyId).toBe('security-key');
    });
  });

  describe('room connections', () => {
    it('should connect two specific rooms', () => {
      const bedroom = world.createEntity('Bedroom', 'room');
      const bathroom = world.createEntity('Bathroom', 'room');
      
      const trait = new DoorTrait({
        room1: bedroom.id,
        room2: bathroom.id
      });
      
      expect(trait.room1).toBe(bedroom.id);
      expect(trait.room2).toBe(bathroom.id);
    });

    it('should handle room order consistently', () => {
      const roomA = world.createEntity('Room A', 'room');
      const roomB = world.createEntity('Room B', 'room');
      
      const trait1 = new DoorTrait({
        room1: roomA.id,
        room2: roomB.id
      });
      
      const trait2 = new DoorTrait({
        room1: roomB.id,
        room2: roomA.id
      });
      
      // Both are valid - the order just determines which is room1/room2
      expect(trait1.room1).toBe(roomA.id);
      expect(trait1.room2).toBe(roomB.id);
      expect(trait2.room1).toBe(roomB.id);
      expect(trait2.room2).toBe(roomA.id);
    });
  });

  describe('connected rooms fixture', () => {
    it('should create complete room-door-room setup', () => {
      const { room1, room2, door } = createConnectedRoomsWithDoor(
        world,
        'Kitchen',
        'Dining Room',
        'Swinging Door'
      );
      
      // IDs will be auto-generated: r01, r02, d01
      expect(room1.id).toMatch(/^r[0-9a-z]{2}$/);
      expect(room2.id).toMatch(/^r[0-9a-z]{2}$/);
      expect(door.id).toMatch(/^d[0-9a-z]{2}$/);
      
      // Check names are correct
      expect(room1.attributes.displayName).toBe('Kitchen');
      expect(room2.attributes.displayName).toBe('Dining Room');
      expect(door.attributes.displayName).toBe('Swinging Door');
      
      const doorTrait = door.getTrait(TraitType.DOOR) as DoorTrait;
      expect(doorTrait.room1).toBe(room1.id);
      expect(doorTrait.room2).toBe(room2.id);
      
      // Check room exits are set up
      const room1Trait = room1.getTrait(TraitType.ROOM) as any;
      const room2Trait = room2.getTrait(TraitType.ROOM) as any;
      
      expect(room1Trait.exits.east).toEqual({
        destination: room2.id,
        via: door.id
      });
      
      expect(room2Trait.exits.west).toEqual({
        destination: room1.id,
        via: door.id
      });
    });

    it('should create locked door between rooms', () => {
      const { room1, room2, door } = createConnectedRoomsWithDoor(
        world,
        'Office',
        'Storage Room',
        'Office Door',
        {
          isLocked: true,
          keyId: 'office-key'
        }
      );
      
      expect(door.hasTrait(TraitType.LOCKABLE)).toBe(true);
      
      const lockable = door.getTrait(TraitType.LOCKABLE) as LockableTrait;
      expect(lockable.isLocked).toBe(true);
      expect(lockable.keyId).toBe('office-key');
    });
  });

  describe('edge cases', () => {
    it('should handle self-connecting door', () => {
      // Weird but valid - a door that connects a room to itself
      const strangeRoom = world.createEntity('Strange Room', 'room');
      const trait = new DoorTrait({
        room1: strangeRoom.id,
        room2: strangeRoom.id
      });
      
      expect(trait.room1).toBe(strangeRoom.id);
      expect(trait.room2).toBe(strangeRoom.id);
    });

    it('should preserve all properties during assignment', () => {
      const startRoom = world.createEntity('Start Room', 'room');
      const endRoom = world.createEntity('End Room', 'room');
      
      const data = {
        room1: startRoom.id,
        room2: endRoom.id,
        bidirectional: false,
        customProperty: 'test'
      };
      
      const trait = new DoorTrait(data);
      
      expect(trait.room1).toBe(startRoom.id);
      expect(trait.room2).toBe(endRoom.id);
      expect(trait.bidirectional).toBe(false);
      expect((trait as any).customProperty).toBe('test');
    });

    it('should maintain type constant', () => {
      expect(DoorTrait.type).toBe(TraitType.DOOR);
      
      const roomA = world.createEntity('Room A', 'room');
      const roomB = world.createEntity('Room B', 'room');
      
      const trait = new DoorTrait({
        room1: roomA.id,
        room2: roomB.id
      });
      expect(trait.type).toBe(TraitType.DOOR);
      expect(trait.type).toBe(DoorTrait.type);
    });
  });

  describe('common door patterns', () => {
    it('should support standard room door', () => {
      const bedroom = world.createEntity('Bedroom', 'room');
      const hallway = world.createEntity('Hallway', 'room');
      const door = createTestDoor(world, 'Bedroom Door', bedroom.id, hallway.id, {
        isOpen: false
      });
      
      expect(door.hasTrait(TraitType.DOOR)).toBe(true);
      expect(door.hasTrait(TraitType.OPENABLE)).toBe(true);
      expect(door.hasTrait(TraitType.LOCKABLE)).toBe(false);
    });

    it('should support locked exterior door', () => {
      const foyer = world.createEntity('Foyer', 'room');
      const outside = world.createEntity('Outside', 'room');
      const door = createTestDoor(world, 'Front Door', foyer.id, outside.id, {
        isOpen: false,
        isLocked: true,
        keyId: 'house-key'
      });
      
      expect(door.hasTrait(TraitType.DOOR)).toBe(true);
      expect(door.hasTrait(TraitType.OPENABLE)).toBe(true);
      expect(door.hasTrait(TraitType.LOCKABLE)).toBe(true);
      
      const lockable = door.getTrait(TraitType.LOCKABLE) as LockableTrait;
      expect(lockable.keyId).toBe('house-key');
    });

    it('should support archway (always open)', () => {
      const greatHall = world.createEntity('Great Hall', 'room');
      const throneRoom = world.createEntity('Throne Room', 'room');
      const entity = world.createEntity('Stone Archway', 'door');
      entity.add(new DoorTrait({
        room1: greatHall.id,
        room2: throneRoom.id
      }));
      // No openable trait - always passable
      
      expect(entity.hasTrait(TraitType.DOOR)).toBe(true);
      expect(entity.hasTrait(TraitType.OPENABLE)).toBe(false);
    });
  });
});
