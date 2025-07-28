// author-model.test.ts - Unit tests for AuthorModel

import { WorldModel } from '../../src/world/WorldModel';
import { AuthorModel } from '../../src/world/AuthorModel';
import { TraitType } from '../../src/traits/trait-types';
import { OpenableTrait } from '../../src/traits/openable/openableTrait';
import { LockableTrait } from '../../src/traits/lockable/lockableTrait';
import { ContainerTrait } from '../../src/traits/container/containerTrait';
import { RoomTrait } from '../../src/traits/room/roomTrait';

describe('AuthorModel', () => {
  let world: WorldModel;
  let author: AuthorModel;

  beforeEach(() => {
    world = new WorldModel();
    author = new AuthorModel(world.getDataStore(), world);
  });

  describe('Shared Data Store', () => {
    it('should share entities between WorldModel and AuthorModel', () => {
      // Create entity through author
      const box = author.createEntity('Box', 'container');
      
      // Should be accessible through world
      expect(world.getEntity(box.id)).toBe(box);
      expect(box.attributes.displayName).toBe('Box');
    });

    it('should share spatial relationships between models', () => {
      const room = world.createEntity('Room', 'room');
      const item = author.createEntity('Item', 'item');
      
      // Move through author
      author.moveEntity(item.id, room.id);
      
      // Check through world
      expect(world.getLocation(item.id)).toBe(room.id);
      expect(world.getContents(room.id)).toContain(item);
    });

    it('should share state between models', () => {
      author.setStateValue('game-phase', 'setup');
      expect(world.getStateValue('game-phase')).toBe('setup');
      
      world.setStateValue('turn-count', 5);
      expect(world.getStateValue('turn-count')).toBe(5);
    });
  });

  describe('Unrestricted Movement', () => {
    it('should move entities into closed containers', () => {
      const cabinet = author.createEntity('Cabinet', 'container');
      cabinet.add(new ContainerTrait());
      author.setupContainer(cabinet.id, false); // Closed
      
      const medicine = author.createEntity('Medicine', 'item');
      
      // This should work with AuthorModel
      author.moveEntity(medicine.id, cabinet.id);
      expect(world.getLocation(medicine.id)).toBe(cabinet.id);
      
      // But not with WorldModel
      const aspirin = world.createEntity('Aspirin', 'item');
      expect(world.moveEntity(aspirin.id, cabinet.id)).toBe(false);
      expect(world.getLocation(aspirin.id)).toBeUndefined();
    });

    it('should move entities into locked containers', () => {
      const safe = author.createEntity('Safe', 'container');
      safe.add(new ContainerTrait());
      const key = author.createEntity('Key', 'item');
      author.setupContainer(safe.id, false, true, key.id); // Closed and locked
      
      const gold = author.createEntity('Gold', 'item');
      
      // AuthorModel ignores lock
      author.moveEntity(gold.id, safe.id);
      expect(world.getLocation(gold.id)).toBe(safe.id);
    });

    it('should bypass container trait requirement', () => {
      const table = author.createEntity('Table', 'supporter');
      // No container trait added
      
      const vase = author.createEntity('Vase', 'item');
      
      // AuthorModel allows this even without container trait
      author.moveEntity(vase.id, table.id);
      expect(world.getLocation(vase.id)).toBe(table.id);
    });

    it('should not check for loops', () => {
      const box1 = author.createEntity('Box 1', 'container');
      const box2 = author.createEntity('Box 2', 'container');
      
      author.moveEntity(box2.id, box1.id);
      
      // This would create a loop, but AuthorModel allows it
      author.moveEntity(box1.id, box2.id);
      expect(world.getLocation(box1.id)).toBe(box2.id);
      
      // Note: This creates an invalid state, but that's the author's responsibility
    });
  });

  describe('Event Recording', () => {
    it('should not emit events by default', () => {
      const events: any[] = [];
      author.registerEventHandler('author:entity:created', (e) => events.push(e));
      author.registerEventHandler('author:entity:moved', (e) => events.push(e));
      
      const item = author.createEntity('Item', 'item');
      const room = author.createEntity('Room', 'room');
      author.moveEntity(item.id, room.id);
      
      expect(events).toHaveLength(0);
    });

    it('should emit events when recordEvent is true', () => {
      const events: any[] = [];
      author.registerEventHandler('author:entity:created', (e) => events.push(e));
      author.registerEventHandler('author:entity:moved', (e) => events.push(e));
      
      const item = author.createEntity('Item', 'item', true);
      const room = author.createEntity('Room', 'room', true);
      author.moveEntity(item.id, room.id, true);
      
      expect(events).toHaveLength(3);
      expect(events[0].type).toBe('author:entity:created');
      expect(events[0].name).toBe('Item');
      expect(events[1].type).toBe('author:entity:created');
      expect(events[1].name).toBe('Room');
      expect(events[2].type).toBe('author:entity:moved');
      expect(events[2].entityId).toBe(item.id);
      expect(events[2].to).toBe(room.id);
    });

    it('should use author: prefix for events', () => {
      const events: any[] = [];
      const allEventHandler = (e: any) => events.push(e);
      
      author.registerEventHandler('author:entity:created', allEventHandler);
      author.registerEventHandler('author:entity:property:changed', allEventHandler);
      author.registerEventHandler('author:entity:trait:added', allEventHandler);
      
      const box = author.createEntity('Box', 'container', true);
      author.setEntityProperty(box.id, 'weight', 5, true);
      author.addTrait(box.id, new OpenableTrait(), true);
      
      expect(events.every(e => e.type.startsWith('author:'))).toBe(true);
    });
  });

  describe('Convenience Methods', () => {
    it('should populate containers with multiple items', () => {
      const chest = author.createEntity('Chest', 'container');
      const sword = author.createEntity('Sword', 'item');
      const shield = author.createEntity('Shield', 'item');
      const potion = author.createEntity('Potion', 'item');
      
      author.populate(chest.id, [sword.id, shield.id, potion.id]);
      
      const contents = world.getContents(chest.id);
      expect(contents).toHaveLength(3);
      expect(contents).toContain(sword);
      expect(contents).toContain(shield);
      expect(contents).toContain(potion);
    });

    it('should connect rooms bidirectionally', () => {
      const kitchen = author.createEntity('Kitchen', 'room');
      const hallway = author.createEntity('Hallway', 'room');
      
      author.connect(kitchen.id, hallway.id, 'north');
      
      expect(kitchen.attributes.exits).toEqual({ north: hallway.id });
      expect(hallway.attributes.exits).toEqual({ south: kitchen.id });
    });

    it('should fill containers from specs', () => {
      const bag = author.createEntity('Bag', 'container');
      
      author.fillContainer(bag.id, [
        { name: 'Apple', type: 'food', attributes: { weight: 0.2 } },
        { name: 'Orange', type: 'food', attributes: { weight: 0.3 } },
        { name: 'Banana', type: 'food', attributes: { weight: 0.15 } }
      ]);
      
      const contents = world.getContents(bag.id);
      expect(contents).toHaveLength(3);
      
      const apple = contents.find(e => e.attributes.displayName === 'Apple');
      expect(apple).toBeDefined();
      expect(apple!.type).toBe('food');
      expect(apple!.attributes.weight).toBe(0.2);
    });

    it('should setup container properties', () => {
      const box = author.createEntity('Box', 'container');
      box.add(new ContainerTrait());
      
      const key = author.createEntity('Key', 'item');
      author.setupContainer(box.id, false, true, key.id);
      
      const openable = box.getTrait(TraitType.OPENABLE) as any;
      const lockable = box.getTrait(TraitType.LOCKABLE) as any;
      
      expect(openable).toBeDefined();
      expect(openable.isOpen).toBe(false);
      expect(lockable).toBeDefined();
      expect(lockable.isLocked).toBe(true);
      expect(lockable.requiredKey).toBe(key.id);
    });
  });

  describe('Entity Management', () => {
    it('should create entities with proper IDs', () => {
      const room = author.createEntity('Living Room', 'room');
      const item = author.createEntity('Lamp', 'item');
      const actor = author.createEntity('Bob', 'actor');
      
      expect(room.id).toMatch(/^r[0-9a-z]{2}$/);
      expect(item.id).toMatch(/^i[0-9a-z]{2}$/);
      expect(actor.id).toMatch(/^a[0-9a-z]{2}$/);
    });

    it('should remove entities completely', () => {
      const item = author.createEntity('Item', 'item');
      const container = author.createEntity('Container', 'container');
      
      author.moveEntity(item.id, container.id);
      author.removeEntity(item.id);
      
      expect(world.getEntity(item.id)).toBeUndefined();
      expect(world.getContents(container.id)).not.toContain(item);
    });

    it('should set entity properties directly', () => {
      const door = author.createEntity('Door', 'door');
      
      author.setEntityProperty(door.id, 'material', 'wood');
      author.setEntityProperty(door.id, 'height', 7);
      author.setEntityProperty(door.id, 'locked', true);
      
      expect(door.attributes.material).toBe('wood');
      expect(door.attributes.height).toBe(7);
      expect(door.attributes.locked).toBe(true);
    });
  });

  describe('State Management', () => {
    it('should set player without validation', () => {
      const ghost = author.createEntity('Ghost', 'spirit');
      // Not a typical player entity, but AuthorModel allows it
      
      author.setPlayer(ghost.id);
      expect(world.getPlayer()).toBe(ghost);
    });

    it('should clear all world data', () => {
      // Create some data
      const room = author.createEntity('Room', 'room');
      const item = author.createEntity('Item', 'item');
      author.moveEntity(item.id, room.id);
      author.setStateValue('test', 'value');
      author.setPlayer(item.id);
      
      // Clear everything
      author.clear();
      
      expect(world.getAllEntities()).toHaveLength(0);
      expect(world.getStateValue('test')).toBeUndefined();
      expect(world.getPlayer()).toBeUndefined();
    });
  });

  describe('Real-World Usage Patterns', () => {
    it('should handle complex world setup', () => {
      // Create a small house
      const kitchen = author.createEntity('Kitchen', 'room');
      const bedroom = author.createEntity('Bedroom', 'room');
      const bathroom = author.createEntity('Bathroom', 'room');
      
      // Add room traits
      kitchen.add(new RoomTrait());
      bedroom.add(new RoomTrait());
      bathroom.add(new RoomTrait());
      
      // Connect rooms
      author.connect(kitchen.id, bedroom.id, 'east');
      author.connect(bedroom.id, bathroom.id, 'north');
      
      // Add furniture with items inside
      const cabinet = author.createEntity('Kitchen Cabinet', 'container');
      cabinet.add(new ContainerTrait());
      author.setupContainer(cabinet.id, false); // Closed
      author.moveEntity(cabinet.id, kitchen.id);
      
      const dishes = author.createEntity('Dishes', 'item');
      const glasses = author.createEntity('Glasses', 'item');
      author.populate(cabinet.id, [dishes.id, glasses.id]);
      
      // Add a locked chest in bedroom
      const chest = author.createEntity('Treasure Chest', 'container');
      chest.add(new ContainerTrait());
      const key = author.createEntity('Golden Key', 'item');
      author.setupContainer(chest.id, false, true, key.id);
      author.moveEntity(chest.id, bedroom.id);
      
      const treasure = author.createEntity('Ancient Artifact', 'item');
      author.moveEntity(treasure.id, chest.id);
      
      // Hide key in bathroom
      const cabinet2 = author.createEntity('Medicine Cabinet', 'container');
      cabinet2.add(new ContainerTrait());
      author.moveEntity(cabinet2.id, bathroom.id);
      author.moveEntity(key.id, cabinet2.id);
      
      // Create and place player
      const player = author.createEntity('Player', 'actor');
      author.placeActor(player.id, kitchen.id);
      author.setPlayer(player.id);
      
      // Verify the setup
      expect(world.getContents(cabinet.id)).toHaveLength(2);
      expect(world.getLocation(treasure.id)).toBe(chest.id);
      expect(world.getLocation(key.id)).toBe(cabinet2.id);
      expect(world.getContainingRoom(player.id)?.id).toBe(kitchen.id);
    });
  });
});
