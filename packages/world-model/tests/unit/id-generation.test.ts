// Tests for ID generation system
import { WorldModel } from '../../src/world/WorldModel';

describe('ID Generation System', () => {
  let world: WorldModel;

  beforeEach(() => {
    world = new WorldModel();
  });

  describe('generateId', () => {
    it('should generate sequential IDs with type prefixes', () => {
      const room1 = world.createEntity('Living Room', 'room');
      expect(room1.id).toBe('r01');
      
      const room2 = world.createEntity('Kitchen', 'room');
      expect(room2.id).toBe('r02');
      
      const door1 = world.createEntity('Front Door', 'door');
      expect(door1.id).toBe('d01');
      
      const actor1 = world.createEntity('Player', 'actor');
      expect(actor1.id).toBe('a01');
    });

    it('should use default prefix for unknown types', () => {
      const obj1 = world.createEntity('Mystery Object', 'unknown-type');
      expect(obj1.id).toBe('o01');
      
      const obj2 = world.createEntity('Another Object');
      expect(obj2.id).toBe('o02');
    });

    it('should handle base36 conversion correctly', () => {
      // Create 35 items to test base36 rollover
      for (let i = 1; i <= 35; i++) {
        world.createEntity(`Item ${i}`, 'item');
      }
      
      const item36 = world.createEntity('Item 36', 'item');
      expect(item36.id).toBe('i10'); // 36 in base36 is '10'
    });
  });

  describe('entity creation and removal', () => {
    it('should store entity name in attributes', () => {
      const kitchen = world.createEntity('Kitchen', 'room');
      
      expect(kitchen.id).toBe('r01');
      expect(kitchen.attributes.displayName).toBe('Kitchen');
      expect(kitchen.attributes.name).toBe('Kitchen');
    });

    it('should allow duplicate names', () => {
      const kitchen1 = world.createEntity('Kitchen', 'room');
      const kitchen2 = world.createEntity('Kitchen', 'room');
      
      expect(kitchen1.id).toBe('r01');
      expect(kitchen2.id).toBe('r02');
      expect(kitchen1.attributes.displayName).toBe('Kitchen');
      expect(kitchen2.attributes.displayName).toBe('Kitchen');
    });

    it('should remove entities by ID', () => {
      const kitchen = world.createEntity('Kitchen', 'room');
      
      expect(world.getEntity(kitchen.id)).toBe(kitchen);
      
      world.removeEntity(kitchen.id);
      
      expect(world.getEntity(kitchen.id)).toBeUndefined();
    });
  });

  // Backwards compatibility test removed - createEntity only accepts (displayName, type)

  describe('persistence', () => {
    it('should save and restore ID system state', () => {
      world.createEntity('Room 1', 'room');
      world.createEntity('Room 2', 'room');
      world.createEntity('Door 1', 'door');
      
      const json = world.toJSON();
      
      const newWorld = new WorldModel();
      newWorld.loadJSON(json);
      
      // Verify counters are preserved
      const room3 = newWorld.createEntity('Room 3', 'room');
      expect(room3.id).toBe('r03'); // Should continue from r02
      
      // Verify entities are preserved
      const room1 = newWorld.getEntity('r01');
      expect(room1).toBeDefined();
      expect(room1!.attributes.displayName).toBe('Room 1');
    });

    // Legacy save format test removed - not needed for pre-release software
  });

  describe('entity attributes', () => {
    it('should set displayName in entity attributes', () => {
      const room = world.createEntity('Living Room', 'room');
      
      expect(room.attributes.displayName).toBe('Living Room');
      expect(room.attributes.name).toBe('Living Room'); // For compatibility
    });
  });
});
