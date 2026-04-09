// author-model.test.ts - Unit tests for AuthorModel

import { WorldModel } from '../../src/world/WorldModel';
import { AuthorModel } from '../../src/world/AuthorModel';
import { TraitType } from '../../src/traits/trait-types';
import { OpenableTrait } from '../../src/traits/openable/openableTrait';
import { LockableTrait } from '../../src/traits/lockable/lockableTrait';
import { ContainerTrait } from '../../src/traits/container/containerTrait';
import { RoomTrait } from '../../src/traits/room/roomTrait';
import { ActorTrait } from '../../src/traits/actor/actorTrait';

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
      cabinet.add(new OpenableTrait({ isOpen: false }));

      const medicine = author.createEntity('Medicine', 'item');

      // This should work with AuthorModel
      author.moveEntity(medicine.id, cabinet.id);
      expect(world.getLocation(medicine.id)).toBe(cabinet.id);
    });

    it('should move entities into locked containers', () => {
      const safe = author.createEntity('Safe', 'container');
      safe.add(new ContainerTrait());
      safe.add(new OpenableTrait({ isOpen: false }));
      safe.add(new LockableTrait({ isLocked: true }));

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
      const kitchen = author.createEntity('Kitchen', 'room');
      kitchen.add(new RoomTrait());

      // Add furniture with items inside
      const cabinet = author.createEntity('Kitchen Cabinet', 'container');
      cabinet.add(new ContainerTrait());
      cabinet.add(new OpenableTrait({ isOpen: false }));
      author.moveEntity(cabinet.id, kitchen.id);

      const dishes = author.createEntity('Dishes', 'item');
      const glasses = author.createEntity('Glasses', 'item');
      author.moveEntity(dishes.id, cabinet.id);
      author.moveEntity(glasses.id, cabinet.id);

      // Add a locked chest
      const chest = author.createEntity('Treasure Chest', 'container');
      chest.add(new ContainerTrait());
      chest.add(new OpenableTrait({ isOpen: false }));
      chest.add(new LockableTrait({ isLocked: true }));

      const treasure = author.createEntity('Ancient Artifact', 'item');
      author.moveEntity(treasure.id, chest.id);

      // Create and place player
      const player = author.createEntity('Player', 'actor');
      player.add(new ActorTrait());
      author.moveEntity(player.id, kitchen.id);
      author.setPlayer(player.id);

      // Verify the setup
      expect(world.getContents(cabinet.id)).toHaveLength(2);
      expect(world.getLocation(treasure.id)).toBe(chest.id);
      expect(world.getPlayer()).toBe(player);
    });
  });

  describe('Scope and Visibility Integration', () => {
    it('should include items in closed containers in scope but not visible', () => {
      const room = author.createEntity('Room', 'room');
      room.add(new RoomTrait());
      room.add(new ContainerTrait());

      const player = author.createEntity('Player', 'actor');
      player.add(new ActorTrait());
      player.add(new ContainerTrait());

      const cabinet = author.createEntity('Cabinet', 'container');
      cabinet.add(new ContainerTrait());
      cabinet.add(new OpenableTrait({ isOpen: false }));

      const medicine = author.createEntity('Medicine', 'item');

      author.moveEntity(player.id, room.id);
      author.moveEntity(cabinet.id, room.id);
      author.moveEntity(medicine.id, cabinet.id);

      const inScope = world.getInScope(player.id);
      expect(inScope).toContain(room);
      expect(inScope).toContain(cabinet);
      expect(inScope).toContain(medicine);

      const visible = world.getVisible(player.id);
      expect(visible).toContain(cabinet);
      expect(visible).not.toContain(medicine);
    });
  });
});
