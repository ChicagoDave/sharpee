// author-model.test.ts - Tests for AuthorModel unrestricted world access

import { WorldModel } from '../../../src/world/WorldModel';
import { AuthorModel } from '../../../src/world/AuthorModel';
import { IFEntity } from '../../../src/entities/if-entity';
import { TraitType } from '../../../src/traits/trait-types';
import { ContainerTrait } from '../../../src/traits/container/containerTrait';
import { OpenableTrait } from '../../../src/traits/openable/openableTrait';
import { LockableTrait } from '../../../src/traits/lockable/lockableTrait';
import { RoomTrait } from '../../../src/traits/room/roomTrait';
import { ActorTrait } from '../../../src/traits/actor/actorTrait';

describe('AuthorModel', () => {
  let world: WorldModel;
  let author: AuthorModel;

  beforeEach(() => {
    world = new WorldModel();
    author = new AuthorModel(world.getDataStore(), world);
  });

  describe('Basic Entity Management', () => {
    it('should create entities with proper IDs', () => {
      const room = author.createEntity('Test Room', 'room');
      const item = author.createEntity('Test Item', 'item');
      
      expect(room.id).toBe('r01');
      expect(item.id).toBe('i01');
      expect(room.type).toBe('room');
      expect(item.type).toBe('item');
    });

    it('should share entities with WorldModel', () => {
      const entity = author.createEntity('Shared Entity', 'item');
      
      // Should be accessible from WorldModel
      const fromWorld = world.getEntity(entity.id);
      expect(fromWorld).toBe(entity);
      expect(fromWorld?.attributes.displayName).toBe('Shared Entity');
    });

    it('should remove entities', () => {
      const entity = author.createEntity('To Remove', 'item');
      const id = entity.id;
      
      author.removeEntity(id);
      
      expect(world.getEntity(id)).toBeUndefined();
    });
  });

  describe('Unrestricted Movement', () => {
    it('should move entities into closed containers', () => {
      const room = author.createEntity('Room', 'room');
      room.add(new RoomTrait());
      room.add(new ContainerTrait());
      
      const cabinet = author.createEntity('Cabinet', 'container');
      cabinet.add(new ContainerTrait());
      cabinet.add(new OpenableTrait({ isOpen: false })); // Closed!
      
      const medicine = author.createEntity('Medicine', 'item');
      
      // Move cabinet to room
      author.moveEntity(cabinet.id, room.id);
      
      // Should be able to move medicine into closed cabinet
      author.moveEntity(medicine.id, cabinet.id);
      
      // Verify it worked
      expect(world.getLocation(medicine.id)).toBe(cabinet.id);
      expect(world.getContents(cabinet.id)).toContain(medicine);
    });

    it('should move entities into locked containers', () => {
      const room = author.createEntity('Room', 'room');
      room.add(new RoomTrait());
      
      const safe = author.createEntity('Safe', 'container');
      safe.add(new ContainerTrait());
      safe.add(new OpenableTrait({ isOpen: false }));
      safe.add(new LockableTrait({ isLocked: true }));
      
      const gold = author.createEntity('Gold', 'item');
      
      author.moveEntity(safe.id, room.id);
      author.moveEntity(gold.id, safe.id);
      
      expect(world.getLocation(gold.id)).toBe(safe.id);
    });

    it('should handle deeply nested containers', () => {
      const room = author.createEntity('Room', 'room');
      room.add(new RoomTrait());
      
      const chest = author.createEntity('Chest', 'container');
      chest.add(new ContainerTrait());
      chest.add(new OpenableTrait({ isOpen: false }));
      
      const box = author.createEntity('Box', 'container');
      box.add(new ContainerTrait());
      box.add(new OpenableTrait({ isOpen: false }));
      
      const pouch = author.createEntity('Pouch', 'container');
      pouch.add(new ContainerTrait());
      pouch.add(new OpenableTrait({ isOpen: false }));
      
      const gem = author.createEntity('Gem', 'item');
      
      // Create nested structure with all containers closed
      author.moveEntity(chest.id, room.id);
      author.moveEntity(box.id, chest.id);
      author.moveEntity(pouch.id, box.id);
      author.moveEntity(gem.id, pouch.id);
      
      // Verify the structure
      expect(world.getLocation(gem.id)).toBe(pouch.id);
      expect(world.getLocation(pouch.id)).toBe(box.id);
      expect(world.getLocation(box.id)).toBe(chest.id);
      expect(world.getLocation(chest.id)).toBe(room.id);
      
      // Verify getAllContents works
      const allContents = world.getAllContents(chest.id, { recursive: true });
      expect(allContents).toContain(box);
      expect(allContents).toContain(pouch);
      expect(allContents).toContain(gem);
    });
  });

  describe('Convenience Methods', () => {
    it('should populate containers with multiple items', () => {
      const room = author.createEntity('Room', 'room');
      const box = author.createEntity('Box', 'container');
      const item1 = author.createEntity('Item 1', 'item');
      const item2 = author.createEntity('Item 2', 'item');
      const item3 = author.createEntity('Item 3', 'item');
      
      author.moveEntity(box.id, room.id);
      author.populate(box.id, [item1.id, item2.id, item3.id]);
      
      const contents = world.getContents(box.id);
      expect(contents).toHaveLength(3);
      expect(contents).toContain(item1);
      expect(contents).toContain(item2);
      expect(contents).toContain(item3);
    });

    it('should connect rooms bidirectionally', () => {
      const room1 = author.createEntity('Room 1', 'room');
      const room2 = author.createEntity('Room 2', 'room');
      
      author.connect(room1.id, room2.id, 'north');
      
      expect(room1.attributes.exits).toEqual({ north: room2.id });
      expect(room2.attributes.exits).toEqual({ south: room1.id });
    });

    it('should setup containers with properties', () => {
      const cabinet = author.createEntity('Cabinet', 'container');
      cabinet.add(new ContainerTrait());
      
      author.setupContainer(cabinet.id, false, true, 'key123');
      
      const openable = cabinet.getTrait(TraitType.OPENABLE) as any;
      const lockable = cabinet.getTrait(TraitType.LOCKABLE) as any;
      
      expect(openable).toBeDefined();
      expect(openable.isOpen).toBe(false);
      expect(lockable).toBeDefined();
      expect(lockable.isLocked).toBe(true);
      expect(lockable.requiredKey).toBe('key123');
    });

    it('should fill containers with item specs', () => {
      const room = author.createEntity('Room', 'room');
      const chest = author.createEntity('Chest', 'container');
      
      author.moveEntity(chest.id, room.id);
      author.fillContainer(chest.id, [
        { name: 'Gold Coin', type: 'item', attributes: { weight: 0.1 } },
        { name: 'Silver Coin', type: 'item', attributes: { weight: 0.08 } },
        { name: 'Copper Coin', type: 'item', attributes: { weight: 0.1 } }
      ]);
      
      const contents = world.getContents(chest.id);
      expect(contents).toHaveLength(3);
      
      const gold = contents.find(e => e.name === 'Gold Coin');
      expect(gold).toBeDefined();
      expect(gold!.attributes.weight).toBe(0.1);
    });

    it('should place actors at locations', () => {
      const room = author.createEntity('Room', 'room');
      const player = author.createEntity('Player', 'actor');
      player.add(new ActorTrait());
      
      author.placeActor(player.id, room.id);
      
      expect(world.getLocation(player.id)).toBe(room.id);
    });
  });

  describe('State Management', () => {
    it('should set state values', () => {
      author.setStateValue('gameStarted', true);
      author.setStateValue('score', 100);
      
      expect(world.getStateValue('gameStarted')).toBe(true);
      expect(world.getStateValue('score')).toBe(100);
    });

    it('should set player', () => {
      const player = author.createEntity('Player', 'actor');
      author.setPlayer(player.id);
      
      expect(world.getPlayer()).toBe(player);
    });

    it('should clear world data', () => {
      // Create some entities
      author.createEntity('Room', 'room');
      author.createEntity('Item', 'item');
      author.setStateValue('test', true);
      
      // Clear everything
      author.clear();
      
      expect(world.getAllEntities()).toHaveLength(0);
      expect(world.getStateValue('test')).toBeUndefined();
    });
  });

  describe('Entity Properties', () => {
    it('should set entity properties directly', () => {
      const entity = author.createEntity('Test', 'item');
      
      author.setEntityProperty(entity.id, 'customProp', 'customValue');
      author.setEntityProperty(entity.id, 'weight', 5);
      
      expect(entity.attributes.customProp).toBe('customValue');
      expect(entity.attributes.weight).toBe(5);
    });

    it('should add and remove traits', () => {
      const entity = author.createEntity('Test', 'item');
      const container = new ContainerTrait();
      
      author.addTrait(entity.id, container);
      expect(entity.hasTrait(TraitType.CONTAINER)).toBe(true);
      
      author.removeTrait(entity.id, TraitType.CONTAINER);
      expect(entity.hasTrait(TraitType.CONTAINER)).toBe(false);
    });
  });

  describe('Scope and Visibility Integration', () => {
    it('should include items in closed containers in scope', () => {
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
      
      // Setup world state
      author.moveEntity(player.id, room.id);
      author.moveEntity(cabinet.id, room.id);
      author.moveEntity(medicine.id, cabinet.id);
      
      // Check scope
      const inScope = world.getInScope(player.id);
      expect(inScope).toContain(room);
      expect(inScope).toContain(cabinet);
      expect(inScope).toContain(medicine); // Should be in scope even in closed container
      
      // But not visible
      const visible = world.getVisible(player.id);
      expect(visible).toContain(cabinet);
      expect(visible).not.toContain(medicine); // Not visible when container is closed
    });
  });

  describe('Event Recording', () => {
    it('should emit events when recordEvent is true', () => {
      const events: any[] = [];
      author.registerEventHandler('author:entity:created', (e) => events.push(e));
      
      const entity = author.createEntity('Test', 'item', true);
      
      expect(events).toHaveLength(1);
      expect(events[0].type).toBe('author:entity:created');
      expect(events[0].name).toBe('Test');
      expect(events[0].entityId).toBe(entity.id);
      expect(events[0].entityType).toBe('item');
    });

    it('should not emit events by default', () => {
      const events: any[] = [];
      author.registerEventHandler('author:entity:created', (e) => events.push(e));
      
      author.createEntity('Test', 'item'); // No recordEvent parameter
      
      expect(events).toHaveLength(0);
    });
  });
});
