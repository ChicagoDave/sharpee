// Tests for entity system updates with new ID system
import { WorldModel } from '../../src/world/WorldModel';
import { IFEntity } from '../../src/entities/if-entity';
import { TraitType } from '../../src/traits/trait-types';
import { RoomTrait } from '../../src/traits/room/roomTrait';
import { DoorTrait } from '../../src/traits/door/doorTrait';
import { ExitTrait } from '../../src/traits/exit/exitTrait';
import { ContainerTrait } from '../../src/traits/container/containerTrait';

describe('Entity System with ID Refactor', () => {
  let world: WorldModel;

  beforeEach(() => {
    world = new WorldModel();
  });

  describe('IFEntity with new ID system', () => {
    it('should store entity type in attributes', () => {
      const room = world.createEntity('Living Room', 'room');
      
      expect(room.attributes.entityType).toBe('room');
      expect(room.type).toBe('room');
    });

    it('should handle name property correctly', () => {
      const room = world.createEntity('Living Room', 'room');
      
      expect(room.name).toBe('Living Room');
      expect(room.attributes.displayName).toBe('Living Room');
      expect(room.attributes.name).toBe('Living Room');
    });

    it('should serialize with version number', () => {
      const room = world.createEntity('Living Room', 'room');
      const json = room.toJSON();
      
      expect(json.version).toBe(2);
      expect(json.id).toBe('r01');
      expect(json.type).toBe('room');
      expect(json.attributes.displayName).toBe('Living Room');
    });

    it('should deserialize both old and new formats', () => {
      // New format with version
      const newFormat = {
        id: 'r01',
        type: 'room',
        version: 2,
        attributes: {
          displayName: 'Living Room',
          entityType: 'room'
        },
        relationships: {},
        traits: []
      };
      
      const entity1 = IFEntity.fromJSON(newFormat);
      expect(entity1.type).toBe('room');
      expect(entity1.name).toBe('Living Room');
      
      // Old format without version
      const oldFormat = {
        id: 'kitchen',
        attributes: {
          name: 'Kitchen'
        },
        relationships: {},
        traits: []
      };
      
      const entity2 = IFEntity.fromJSON(oldFormat);
      expect(entity2.type).toBe('object'); // Default type
      expect(entity2.name).toBe('Kitchen');
      
      // New ID format without explicit type
      const inferredFormat = {
        id: 'd01',
        attributes: {
          displayName: 'Front Door'
        },
        relationships: {},
        traits: []
      };
      
      const entity3 = IFEntity.fromJSON(inferredFormat);
      expect(entity3.type).toBe('door'); // Inferred from ID prefix
    });
  });

  describe('Trait ID references', () => {
    it('should use IDs in room exits', () => {
      const livingRoom = world.createEntity('Living Room', 'room');
      const kitchen = world.createEntity('Kitchen', 'room');
      const door = world.createEntity('Kitchen Door', 'door');
      
      const roomTrait = new RoomTrait({
        exits: {
          north: { destination: kitchen.id, via: door.id }
        }
      });
      
      livingRoom.add(roomTrait);
      
      const exits = (livingRoom.get(TraitType.ROOM) as RoomTrait).exits;
      expect(exits.north.destination).toBe('r02'); // Kitchen ID
      expect(exits.north.via).toBe('d01'); // Door ID
    });

    it('should use IDs in door connections', () => {
      const room1 = world.createEntity('Room 1', 'room');
      const room2 = world.createEntity('Room 2', 'room');
      const door = world.createEntity('Connecting Door', 'door');
      
      const doorTrait = new DoorTrait({
        room1: room1.id,
        room2: room2.id
      });
      
      door.add(doorTrait);
      
      const trait = door.get(TraitType.DOOR) as DoorTrait;
      expect(trait.room1).toBe('r01');
      expect(trait.room2).toBe('r02');
    });

    it('should use IDs in exit traits', () => {
      const cave = world.createEntity('Cave', 'room');
      const tunnel = world.createEntity('Tunnel', 'room');
      const exit = world.createEntity('Cave Exit', 'exit');
      
      const exitTrait = new ExitTrait({
        from: cave.id,
        to: tunnel.id,
        command: 'north'
      });
      
      exit.add(exitTrait);
      
      const trait = exit.get(TraitType.EXIT) as ExitTrait;
      expect(trait.from).toBe('r01');
      expect(trait.to).toBe('r02');
    });
  });

  describe('WorldModel persistence with entities', () => {
    it('should save and restore entities with proper IDs', () => {
      // Create some entities
      const room1 = world.createEntity('Living Room', 'room');
      const room2 = world.createEntity('Kitchen', 'room');
      const door = world.createEntity('Kitchen Door', 'door');
      
      // Add traits
      room1.add(new RoomTrait({
        exits: {
          north: { destination: room2.id, via: door.id }
        }
      }));
      
      door.add(new DoorTrait({
        room1: room1.id,
        room2: room2.id
      }));
      
      // Save
      const saved = world.toJSON();
      
      // Load into new world
      const newWorld = new WorldModel();
      newWorld.loadJSON(saved);
      
      // Verify entities exist with correct IDs
      const loadedRoom1 = newWorld.getEntity('r01');
      const loadedRoom2 = newWorld.getEntity('r02');
      const loadedDoor = newWorld.getEntity('d01');
      
      expect(loadedRoom1).toBeDefined();
      expect(loadedRoom2).toBeDefined();
      expect(loadedDoor).toBeDefined();
      
      // Verify names are preserved correctly
      expect(loadedRoom1!.attributes.displayName).toBe('Living Room');
      expect(loadedRoom2!.attributes.displayName).toBe('Kitchen');
      expect(loadedDoor!.attributes.displayName).toBe('Kitchen Door');
      
      // Verify traits preserved correctly
      const loadedRoom = newWorld.getEntity('r01')!;
      const roomTrait = loadedRoom.get(TraitType.ROOM) as RoomTrait;
      expect(roomTrait.exits.north.destination).toBe('r02');
      expect(roomTrait.exits.north.via).toBe('d01');
    });
  });

  describe('Entity relationships with IDs', () => {
    it('should use IDs for all entity relationships', () => {
      const container = world.createEntity('Box', 'container');
      const item1 = world.createEntity('Red Ball', 'item');
      const item2 = world.createEntity('Blue Ball', 'item');
      
      // Add container trait so it can hold items
      container.add(new ContainerTrait());
      
      // Move items into container
      world.moveEntity(item1.id, container.id);
      world.moveEntity(item2.id, container.id);
      
      // Check relationships use IDs
      const contents = world.getContents(container.id);
      expect(contents.map(e => e.id)).toContain('i01');
      expect(contents.map(e => e.id)).toContain('i02');
      
      // Verify by container ID
      const boxContents = world.getContents(container.id);
      expect(boxContents.map(e => e.name)).toContain('Red Ball');
      expect(boxContents.map(e => e.name)).toContain('Blue Ball');
    });
  });
});
