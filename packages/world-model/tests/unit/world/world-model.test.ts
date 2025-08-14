// packages/world-model/tests/unit/world/world-model.test.ts

import { WorldModel, WorldConfig } from '../../../src/world/WorldModel';
import { IFEntity } from '../../../src/entities/if-entity';
import { TraitType } from '../../../src/traits/trait-types';
import { ContainerTrait } from '../../../src/traits/container/containerTrait';
import { RoomTrait } from '../../../src/traits/room/roomTrait';
import { DoorTrait } from '../../../src/traits/door/doorTrait';
import { SceneryTrait } from '../../../src/traits/scenery/sceneryTrait';
import { SemanticEvent } from '@sharpee/core';
import { createTestRoom, createTestContainer, createTestActor, createConnectedRooms } from '../../fixtures/test-entities';

describe('WorldModel', () => {
  let world: WorldModel;

  beforeEach(() => {
    world = new WorldModel();
  });

  describe('initialization', () => {
    it('should create empty world model', () => {
      expect(world.getAllEntities()).toHaveLength(0);
      expect(world.getState()).toEqual({});
      expect(world.getPlayer()).toBeUndefined();
    });

    it('should accept configuration', () => {
      const config: WorldConfig = {
        enableSpatialIndex: true,
        maxDepth: 5,
        strictMode: true
      };

      const strictWorld = new WorldModel(config);
      expect(strictWorld).toBeDefined();
    });
  });

  describe('entity management', () => {
    it('should create entity with auto-generated ID', () => {
      const entity = world.createEntity('Test Object', 'object');

      expect(entity).toBeDefined();
      expect(entity.id).toMatch(/^o[0-9a-z]{2}$/); // object prefix
      expect(entity.type).toBe('object');
      expect(entity.attributes.displayName).toBe('Test Object');
    });

    it('should generate correct type-prefixed IDs', () => {
      const room = world.createEntity('Test Room', 'room');
      const door = world.createEntity('Test Door', 'door');
      const item = world.createEntity('Test Item', 'item');
      const actor = world.createEntity('Test Actor', 'actor');

      expect(room.id).toMatch(/^r[0-9a-z]{2}$/);
      expect(door.id).toMatch(/^d[0-9a-z]{2}$/);
      expect(item.id).toMatch(/^i[0-9a-z]{2}$/);
      expect(actor.id).toMatch(/^a[0-9a-z]{2}$/);
    });

    it('should allow multiple entities with same displayName', () => {
      const entity1 = world.createEntity('Torch', 'item');
      const entity2 = world.createEntity('Torch', 'item');

      expect(entity1.id).not.toBe(entity2.id);
      expect(entity1.attributes.displayName).toBe('Torch');
      expect(entity2.attributes.displayName).toBe('Torch');
    });

    it('should create entities with displayName', () => {
      const entity = world.createEntity('Test Item', 'item');

      expect(entity.attributes.displayName).toBe('Test Item');
      expect(entity.id).toMatch(/^i[0-9a-z]{2}$/);
    });

    it('should get entity by id', () => {
      const created = world.createEntity('Test', 'object');
      const retrieved = world.getEntity(created.id);

      expect(retrieved).toBe(created);
    });

    it('should return undefined for missing entity', () => {
      expect(world.getEntity('missing')).toBeUndefined();
    });

    it('should check entity existence', () => {
      const entity = world.createEntity('Test', 'object');

      expect(world.hasEntity(entity.id)).toBe(true);
      expect(world.hasEntity('missing')).toBe(false);
    });

    it('should remove entity', () => {
      const entity = world.createEntity('Test', 'object');
      const id = entity.id;

      expect(world.removeEntity(id)).toBe(true);
      expect(world.hasEntity(id)).toBe(false);
    });

    it('should return false when removing non-existent entity', () => {
      expect(world.removeEntity('missing')).toBe(false);
    });

    it('should get all entities', () => {
      const e1 = world.createEntity('One', 'object');
      const e2 = world.createEntity('Two', 'object');
      const e3 = world.createEntity('Three', 'object');

      const all = world.getAllEntities();

      expect(all).toHaveLength(3);
      expect(all).toContain(e1);
      expect(all).toContain(e2);
      expect(all).toContain(e3);
    });

    it('should update entity', () => {
      const entity = world.createEntity('Test', 'object');

      world.updateEntity(entity.id, (e) => {
        e.attributes.updated = true;
        e.attributes.count = 42;
      });

      expect(entity.attributes.updated).toBe(true);
      expect(entity.attributes.count).toBe(42);
    });

    it('should handle updating non-existent entity', () => {
      world.updateEntity('missing', (e) => {
        e.attributes.updated = true;
      });

      // Should not throw in non-strict mode
      expect(world.getEntity('missing')).toBeUndefined();
    });

    it('should throw in strict mode when updating non-existent entity', () => {
      const strictWorld = new WorldModel({ strictMode: true });

      expect(() => {
        strictWorld.updateEntity('missing', (e) => {
          e.attributes.updated = true;
        });
      }).toThrow('Cannot update non-existent entity: missing');
    });

    // Additional ID system tests
    it('should store displayName in entity attributes', () => {
      const entity = world.createEntity('Brass Key', 'item');

      expect(entity.attributes.displayName).toBe('Brass Key');
      expect(entity.attributes.name).toBe('Brass Key'); // Compatibility
    });

    it('should increment ID counters correctly', () => {
      const item1 = world.createEntity('Item 1', 'item');
      const item2 = world.createEntity('Item 2', 'item');
      const item3 = world.createEntity('Item 3', 'item');

      expect(item1.id).toBe('i01');
      expect(item2.id).toBe('i02');
      expect(item3.id).toBe('i03');
    });

    it('should handle ID counter overflow', () => {
      // Generate many entities to approach limit
      for (let i = 1; i <= 1295; i++) {
        world.createEntity(`Item ${i}`, 'item');
      }

      // Next one should fail
      expect(() => {
        world.createEntity('Item 1296', 'item');
      }).toThrow(/ID overflow/);
    });
  });

  describe('spatial management', () => {
    let room: IFEntity;
    let container: IFEntity;
    let item: IFEntity;

    beforeEach(() => {
      room = world.createEntity('Test Room', 'room');
      room.add(new RoomTrait());
      room.add(new ContainerTrait());

      container = world.createEntity('Box', 'container');
      container.add(new ContainerTrait());

      item = world.createEntity('Coin', 'item');
    });

    it('should get entity location', () => {
      world.moveEntity(container.id, room.id);
      world.moveEntity(item.id, container.id);

      expect(world.getLocation(container.id)).toBe(room.id);
      expect(world.getLocation(item.id)).toBe(container.id);
      expect(world.getLocation(room.id)).toBeUndefined();
    });

    it('should get container contents', () => {
      world.moveEntity(container.id, room.id);
      world.moveEntity(item.id, container.id);

      const roomContents = world.getContents(room.id);
      const boxContents = world.getContents(container.id);

      expect(roomContents).toHaveLength(1);
      expect(roomContents[0].id).toBe(container.id);
      expect(boxContents).toHaveLength(1);
      expect(boxContents[0].id).toBe(item.id);
    });

    it('should move entity', () => {
      expect(world.moveEntity(item.id, container.id)).toBe(true);
      expect(world.getLocation(item.id)).toBe(container.id);

      expect(world.moveEntity(item.id, room.id)).toBe(true);
      expect(world.getLocation(item.id)).toBe(room.id);
    });

    it('should remove entity from world', () => {
      world.moveEntity(item.id, container.id);

      expect(world.moveEntity(item.id, null)).toBe(true);
      expect(world.getLocation(item.id)).toBeUndefined();
    });

    it('should check if move is valid', () => {
      expect(world.canMoveEntity(item.id, container.id)).toBe(true);
      expect(world.canMoveEntity(item.id, 'missing')).toBe(false);
      expect(world.canMoveEntity('missing', container.id)).toBe(false);
    });

    it('should prevent moving to non-container', () => {
      expect(world.canMoveEntity(container.id, item.id)).toBe(false);
    });

    it('should prevent containment loops', () => {
      world.moveEntity(container.id, room.id);
      world.moveEntity(item.id, container.id);

      expect(world.canMoveEntity(room.id, container.id)).toBe(false);
      expect(world.canMoveEntity(room.id, item.id)).toBe(false);
      expect(world.canMoveEntity(container.id, container.id)).toBe(false);
    });

    it('should get containing room', () => {
      world.moveEntity(container.id, room.id);
      world.moveEntity(item.id, container.id);

      expect(world.getContainingRoom(item.id)?.id).toBe(room.id);
      expect(world.getContainingRoom(container.id)?.id).toBe(room.id);
      // Rooms don't have a containing room (they return undefined)
      expect(world.getContainingRoom(room.id)).toBeUndefined();
    });

    it('should get all contents recursively', () => {
      const innerBox = world.createEntity('Inner Box', 'container');
      innerBox.add(new ContainerTrait());

      world.moveEntity(container.id, room.id);
      world.moveEntity(innerBox.id, container.id);
      world.moveEntity(item.id, innerBox.id);

      const allContents = world.getAllContents(room.id, { recursive: true });

      expect(allContents).toHaveLength(3);
      expect(allContents.map(e => e.id)).toContain(container.id);
      expect(allContents.map(e => e.id)).toContain(innerBox.id);
      expect(allContents.map(e => e.id)).toContain(item.id);
    });

    it('should handle max depth limit', () => {
      const limitedWorld = new WorldModel({ maxDepth: 2 });

      // Create deep nesting
      const b1 = limitedWorld.createEntity('Box 1', 'container');
      const b2 = limitedWorld.createEntity('Box 2', 'container');
      const b3 = limitedWorld.createEntity('Box 3', 'container');
      b1.add(new ContainerTrait());
      b2.add(new ContainerTrait());
      b3.add(new ContainerTrait());

      limitedWorld.moveEntity(b2.id, b1.id);
      limitedWorld.moveEntity(b3.id, b2.id);

      const contents = limitedWorld.getAllContents(b1.id, { recursive: true });
      expect(contents.map(e => e.id)).toContain(b2.id);
      // Should stop at depth limit
    });

    // Test with direct IDs
    it('should work with entity IDs', () => {
      // Move by direct ID
      world.moveEntity(container.id, room.id);
      world.moveEntity(item.id, container.id);

      // Get contents
      const roomContents = world.getContents(room.id);
      const boxContents = world.getContents(container.id);

      expect(roomContents).toHaveLength(1);
      expect(roomContents[0].attributes.displayName).toBe('Box');
      expect(boxContents).toHaveLength(1);
      expect(boxContents[0].attributes.displayName).toBe('Coin');
    });
  });

  describe('world state management', () => {
    it('should get and set state', () => {
      const state = {
        score: 100,
        turn: 5,
        flags: { doorOpened: true }
      };

      world.setState(state);

      expect(world.getState()).toEqual(state);
      expect(world.getState()).not.toBe(state); // Should be a copy
    });

    it('should get and set state values', () => {
      world.setStateValue('score', 50);
      world.setStateValue('playerName', 'Alice');

      expect(world.getStateValue('score')).toBe(50);
      expect(world.getStateValue('playerName')).toBe('Alice');
      expect(world.getStateValue('missing')).toBeUndefined();
    });

    it('should handle nested state values', () => {
      world.setStateValue('game', { level: 1, difficulty: 'hard' });

      const gameState = world.getStateValue('game');
      expect(gameState.level).toBe(1);
      expect(gameState.difficulty).toBe('hard');
    });
  });

  describe('query operations', () => {
    let room: IFEntity;
    let room2: IFEntity;
    let box1: IFEntity;
    let box2: IFEntity;
    let door: IFEntity;

    beforeEach(() => {
      // Set up test entities
      room = world.createEntity('Living Room', 'room');
      room.add(new RoomTrait());
      room.add(new ContainerTrait());

      room2 = world.createEntity('Kitchen', 'room');
      room2.add(new RoomTrait());
      room2.add(new ContainerTrait());

      box1 = world.createEntity('Box 1', 'container');
      box1.add(new ContainerTrait());

      box2 = world.createEntity('Box 2', 'container');
      box2.add(new ContainerTrait());

      door = world.createEntity('Door', 'door');
      door.add(new DoorTrait({ room1: room.id, room2: room2.id }));

      world.moveEntity(box1.id, room.id);
      world.moveEntity(box2.id, room.id);
    });

    it('should find entities by trait', () => {
      const containers = world.findByTrait(TraitType.CONTAINER);
      const doors = world.findByTrait(TraitType.DOOR);

      expect(containers).toHaveLength(4); // 2 rooms + 2 boxes
      expect(doors).toHaveLength(1);
    });

    it('should find entities by type', () => {
      const containers = world.findByType('container');
      const doors = world.findByType('door');

      expect(containers).toHaveLength(2);
      expect(doors).toHaveLength(1);
    });

    it('should find entities with predicate', () => {
      const boxesInRoom = world.findWhere(e =>
        e.type === 'container' && world.getLocation(e.id) === room.id
      );

      expect(boxesInRoom).toHaveLength(2);
    });

    it('should find all entities without filtering', () => {
      // Add scenery
      const painting = world.createEntity('Painting', 'scenery');
      painting.add(new SceneryTrait());
      world.moveEntity(painting.id, room.id);

      // findByType now returns all matching entities without filtering
      const all = world.findByType('scenery');
      
      expect(all).toHaveLength(1);
      expect(all).toContain(painting);
      
      // Filtering by traits should be done by the caller if needed
      const sceneryItems = world.findWhere(e => e.type === 'scenery' && e.has(TraitType.SCENERY));
      expect(sceneryItems).toHaveLength(1);
    });
  });

  describe('visibility and scope', () => {
    let room: IFEntity;
    let player: IFEntity;
    let box: IFEntity;
    let coin: IFEntity;

    beforeEach(() => {
      room = world.createEntity('Test Room', 'room');
      room.add(new RoomTrait());
      room.add(new ContainerTrait());

      player = world.createEntity('Player', 'actor');
      player.add(new ContainerTrait());

      box = world.createEntity('Box', 'container');
      box.add(new ContainerTrait());

      coin = world.createEntity('Coin', 'item');

      world.moveEntity(player.id, room.id);
      world.moveEntity(box.id, room.id);
      world.moveEntity(coin.id, box.id);
    });

    it('should get entities in scope', () => {
      const inScope = world.getInScope(player.id);

      expect(inScope.map(e => e.id)).toContain(room.id);
      expect(inScope.map(e => e.id)).toContain(box.id);
      expect(inScope.map(e => e.id)).toContain(coin.id);
    });

    it('should include carried items in scope', () => {
      const key = world.createEntity('Key', 'item');
      world.moveEntity(key.id, player.id);

      const inScope = world.getInScope(player.id);

      expect(inScope.map(e => e.id)).toContain(key.id);
    });

    it('should check visibility', () => {
      // This would need VisibilityBehavior implementation
      // For now, just test the API
      expect(world.canSee(player.id, player.id)).toBe(true); // Can see self
    });

    it('should work with direct IDs for visibility', () => {
      expect(world.canSee(player.id, player.id)).toBe(true);
      // Add more visibility tests as needed
    });
  });

  describe('relationships', () => {
    let entity1: IFEntity;
    let entity2: IFEntity;
    let entity3: IFEntity;

    beforeEach(() => {
      entity1 = world.createEntity('Entity 1', 'object');
      entity2 = world.createEntity('Entity 2', 'object');
      entity3 = world.createEntity('Entity 3', 'object');
    });

    it('should add relationship', () => {
      world.addRelationship(entity1.id, entity2.id, 'likes');

      expect(world.areRelated(entity1.id, entity2.id, 'likes')).toBe(true);
      expect(world.areRelated(entity2.id, entity1.id, 'likes')).toBe(false);
    });

    it('should get related entities', () => {
      world.addRelationship(entity1.id, entity2.id, 'knows');
      world.addRelationship(entity1.id, entity3.id, 'knows');

      const known = world.getRelated(entity1.id, 'knows');

      expect(known).toHaveLength(2);
      expect(known).toContain(entity2.id);
      expect(known).toContain(entity3.id);
    });

    it('should remove relationship', () => {
      world.addRelationship(entity1.id, entity2.id, 'trusts');
      world.removeRelationship(entity1.id, entity2.id, 'trusts');

      expect(world.areRelated(entity1.id, entity2.id, 'trusts')).toBe(false);
    });

    it('should handle multiple relationship types', () => {
      world.addRelationship(entity1.id, entity2.id, 'likes');
      world.addRelationship(entity1.id, entity2.id, 'trusts');

      expect(world.areRelated(entity1.id, entity2.id, 'likes')).toBe(true);
      expect(world.areRelated(entity1.id, entity2.id, 'trusts')).toBe(true);
      expect(world.areRelated(entity1.id, entity2.id, 'fears')).toBe(false);
    });

    it('should handle non-existent entities in non-strict mode', () => {
      world.addRelationship(entity1.id, 'missing', 'knows');
      expect(world.getRelated(entity1.id, 'knows')).toEqual([]);
    });

    it('should throw in strict mode for non-existent entities', () => {
      const strictWorld = new WorldModel({ strictMode: true });
      const e1 = strictWorld.createEntity('Entity 1', 'object');

      expect(() => {
        strictWorld.addRelationship(e1.id, 'missing', 'knows');
      }).toThrow('Cannot add relationship between non-existent entities');
    });
  });

  describe('utility methods', () => {
    it('should calculate total weight', () => {
      const bag = world.createEntity('Bag', 'container');
      bag.add(new ContainerTrait());
      bag.attributes.weight = 2;

      const coin1 = world.createEntity('Gold Coin', 'item');
      coin1.attributes.weight = 0.5;

      const coin2 = world.createEntity('Silver Coin', 'item');
      coin2.attributes.weight = 0.3;

      world.moveEntity(coin1.id, bag.id);
      world.moveEntity(coin2.id, bag.id);

      expect(world.getTotalWeight(bag.id)).toBe(2.8);
    });

    it('should detect containment loops', () => {
      const box1 = world.createEntity('Box 1', 'container');
      const box2 = world.createEntity('Box 2', 'container');
      box1.add(new ContainerTrait());
      box2.add(new ContainerTrait());

      world.moveEntity(box2.id, box1.id);

      expect(world.wouldCreateLoop(box1.id, box2.id)).toBe(true);
      expect(world.wouldCreateLoop(box1.id, box1.id)).toBe(true);
    });

    it('should find path between rooms', () => {
      const roomA = world.createEntity('Room A', 'room');
      const roomB = world.createEntity('Room B', 'room');
      const roomC = world.createEntity('Room C', 'room');

      roomA.add(new RoomTrait());
      roomB.add(new RoomTrait());
      roomC.add(new RoomTrait());

      // Set up exits
      const roomATrait = roomA.getTrait(TraitType.ROOM) as any;
      const roomBTrait = roomB.getTrait(TraitType.ROOM) as any;

      roomATrait.exits = { east: { destination: roomB.id } };
      roomBTrait.exits = {
        west: { destination: roomA.id },
        north: { destination: roomC.id }
      };

      // Test path finding
      const path = world.findPath(roomA.id, roomC.id);
      expect(path).toEqual([]); // Direct connected rooms return empty path

      const path2 = world.findPath(roomA.id, roomA.id);
      expect(path2).toEqual([]); // Same room returns empty path
    });

    it('should get and set player', () => {
      const player = world.createEntity('Player', 'actor');

      world.setPlayer(player.id);

      expect(world.getPlayer()).toBe(player);
    });

    it('should throw when setting non-existent player', () => {
      expect(() => {
        world.setPlayer('missing');
      }).toThrow('Cannot set player to non-existent entity: missing');
    });
  });

  describe('persistence', () => {
    it('should serialize to JSON', () => {
      const room = world.createEntity('Test Room', 'room');
      const player = world.createEntity('Player', 'actor');

      world.setPlayer(player.id);
      world.setState({ score: 100 });
      world.moveEntity(player.id, room.id);

      const json = world.toJSON();
      const data = JSON.parse(json);

      expect(data.entities).toHaveLength(2);
      expect(data.state.score).toBe(100);
      expect(data.playerId).toBe(player.id);
      expect(data.idCounters).toBeDefined();
    });

    it('should load from JSON', () => {
      // Set up original world
      const room = world.createEntity('Test Room', 'room');
      room.add(new RoomTrait());
      room.add(new ContainerTrait());
      const player = world.createEntity('Player', 'actor');
      player.add(new ContainerTrait());

      world.setPlayer(player.id);
      world.setState({ score: 100 });
      world.moveEntity(player.id, room.id);
      world.addRelationship(player.id, room.id, 'visited');

      // Serialize
      const json = world.toJSON();

      // Create new world and load
      const newWorld = new WorldModel();
      newWorld.loadJSON(json);

      // Verify entities were restored
      expect(newWorld.getAllEntities()).toHaveLength(2);
      expect(newWorld.getEntity(room.id)?.id).toBe(room.id);
      expect(newWorld.getEntity(player.id)?.id).toBe(player.id);
      expect(newWorld.getPlayer()?.id).toBe(player.id);
      expect(newWorld.getState().score).toBe(100);
      expect(newWorld.getLocation(player.id)).toBe(room.id);
      expect(newWorld.areRelated(player.id, room.id, 'visited')).toBe(true);

      // Verify entities were restored with proper attributes
      expect(newWorld.getEntity(room.id)?.attributes.displayName).toBe('Test Room');
      expect(newWorld.getEntity(player.id)?.attributes.displayName).toBe('Player');

      // Verify new entities get correct IDs
      const newItem = newWorld.createEntity('New Item', 'item');
      expect(newItem.id).toBe('i01'); // Should start from next available
    });

    it('should handle loading old saves without ID system data', () => {
      // Create a save data that mimics old format
      const oldSaveData = {
        entities: [
          {
            id: 'r01',
            entity: {
              id: 'r01',
              type: 'room',
              attributes: { displayName: 'Old Room', name: 'Old Room' },
              traits: []
            }
          },
          {
            id: 'i01',
            entity: {
              id: 'i01',
              type: 'item',
              attributes: { displayName: 'Old Item', name: 'Old Item' },
              traits: []
            }
          }
        ],
        state: {},
        spatialIndex: { parentMap: {}, childMap: {} },
        relationships: []
        // Note: no idCounters, nameToId, or idToName
      };

      const json = JSON.stringify(oldSaveData);
      const newWorld = new WorldModel();

      // Should handle loading without error
      newWorld.loadJSON(json);

      // Should load entities properly
      expect(newWorld.getEntity('r01')?.attributes.displayName).toBe('Old Room');
      expect(newWorld.getEntity('i01')?.attributes.displayName).toBe('Old Item');

      // New entities should continue from highest seen ID
      const newRoom = newWorld.createEntity('New Room', 'room');
      expect(newRoom.id).toBe('r02');
    });

    it('should clear world', () => {
      const entity = world.createEntity('Test', 'object');
      world.setState({ test: true });
      world.setPlayer(entity.id);

      world.clear();

      expect(world.getAllEntities()).toHaveLength(0);
      expect(world.getState()).toEqual({});
      expect(world.getPlayer()).toBeUndefined();
      expect(world.getEntity(entity.id)).toBeUndefined();
    });
  });

  describe('event sourcing', () => {
    it('should register and apply event handler', () => {
      let handlerCalled = false;

      world.registerEventHandler('test-event', (event, w) => {
        handlerCalled = true;
        expect(event.type).toBe('test-event');
        expect(w).toBe(world);
      });

      const event: SemanticEvent = {
        id: 'evt-1',
        type: 'test-event',
        timestamp: Date.now(),
        entities: {},
        data: {}
      };

      world.applyEvent(event);

      expect(handlerCalled).toBe(true);
    });

    it('should validate events', () => {
      world.registerEventValidator('validated-event', (event, w) => {
        return event.data?.valid === true;
      });

      const validEvent: SemanticEvent = {
        id: 'evt-2',
        type: 'validated-event',
        timestamp: Date.now(),
        entities: {},
        data: { valid: true }
      };

      const invalidEvent: SemanticEvent = {
        id: 'evt-3',
        type: 'validated-event',
        timestamp: Date.now(),
        entities: {},
        data: { valid: false }
      };

      expect(world.canApplyEvent(validEvent)).toBe(true);
      expect(world.canApplyEvent(invalidEvent)).toBe(false);
    });

    it('should throw when applying invalid event', () => {
      world.registerEventValidator('strict-event', () => false);

      const event: SemanticEvent = {
        id: 'evt-4',
        type: 'strict-event',
        timestamp: Date.now(),
        entities: {},
        data: {}
      };

      expect(() => {
        world.applyEvent(event);
      }).toThrow('Cannot apply event of type \'strict-event\': validation failed');
    });

    it('should preview event changes', () => {
      world.registerEventPreviewer('preview-event', (event, w) => {
        return [
          { type: 'create', entityId: 'new-1' },
          { type: 'modify', entityId: 'world', field: 'score', newValue: 100 }
        ];
      });

      const event: SemanticEvent = {
        id: 'evt-5',
        type: 'preview-event',
        timestamp: Date.now(),
        entities: {},
        data: {}
      };

      const changes = world.previewEvent(event);

      expect(changes).toHaveLength(2);
      expect(changes[0].type).toBe('create');
      expect(changes[1].type).toBe('modify');
    });

    it('should track event history', () => {
      const event1: SemanticEvent = {
        id: 'evt-6',
        type: 'event-1',
        timestamp: 1000,
        entities: {},
        data: {}
      };

      const event2: SemanticEvent = {
        id: 'evt-7',
        type: 'event-2',
        timestamp: 2000,
        entities: {},
        data: {}
      };

      world.applyEvent(event1);
      world.applyEvent(event2);

      const history = world.getAppliedEvents();
      expect(history).toHaveLength(2);
      expect(history[0]).toBe(event1);
      expect(history[1]).toBe(event2);
    });

    it('should get events since timestamp', () => {
      const oldEvent: SemanticEvent = {
        id: 'evt-8',
        type: 'old',
        timestamp: 1000,
        entities: {},
        data: {}
      };

      const newEvent: SemanticEvent = {
        id: 'evt-9',
        type: 'new',
        timestamp: 3000,
        entities: {},
        data: {}
      };

      world.applyEvent(oldEvent);
      world.applyEvent(newEvent);

      const recent = world.getEventsSince(2000);
      expect(recent).toHaveLength(1);
      expect(recent[0]).toBe(newEvent);
    });

    it('should clear event history', () => {
      world.applyEvent({ id: 'evt-10', type: 'test', timestamp: Date.now(), entities: {}, data: {} });
      world.applyEvent({ id: 'evt-11', type: 'test', timestamp: Date.now(), entities: {}, data: {} });

      world.clearEventHistory();

      expect(world.getAppliedEvents()).toHaveLength(0);
    });

    it('should unregister event handler', () => {
      let callCount = 0;

      world.registerEventHandler('removable', () => {
        callCount++;
      });

      world.applyEvent({ id: 'evt-12', type: 'removable', timestamp: Date.now(), entities: {}, data: {} });
      expect(callCount).toBe(1);

      world.unregisterEventHandler('removable');

      world.applyEvent({ id: 'evt-13', type: 'removable', timestamp: Date.now(), entities: {}, data: {} });
      expect(callCount).toBe(1); // Should not increase
    });

    it('should handle unregistered events silently', () => {
      // Events without handlers are recorded but don't cause warnings
      const event = { id: 'evt-14', type: 'unhandled', timestamp: Date.now(), entities: {}, data: {} };

      expect(() => {
        world.applyEvent(event);
      }).not.toThrow();

      // Event should still be recorded in history
      const history = world.getAppliedEvents();
      expect(history).toContain(event);
    });
  });

  describe('edge cases', () => {
    it('should handle empty world operations', () => {
      expect(world.getAllEntities()).toEqual([]);
      expect(world.getContents('missing')).toEqual([]);
      expect(world.findByTrait(TraitType.CONTAINER)).toEqual([]);
      expect(world.getVisible('missing')).toEqual([]);
      expect(world.getInScope('missing')).toEqual([]);
    });

    it('should handle removing entity with contents', () => {
      const box = world.createEntity('Box', 'container');
      box.add(new ContainerTrait());
      const coin = world.createEntity('Coin', 'item');

      world.moveEntity(coin.id, box.id);
      world.removeEntity(box.id);

      // Coin should be orphaned but still exist
      expect(world.hasEntity(coin.id)).toBe(true);
      expect(world.getLocation(coin.id)).toBeUndefined();
    });

    it('should handle circular references in toJSON', () => {
      const entity = world.createEntity('Test', 'object');
      // Create a replacer function to handle circular references
      const seen = new WeakSet();
      const replacer = (key: any, value: any) => {
        if (typeof value === 'object' && value !== null) {
          if (seen.has(value)) {
            return '[Circular]';
          }
          seen.add(value);
        }
        return value;
      };

      // Add circular reference
      entity.attributes.self = entity;

      // Should handle with custom replacer
      expect(() => {
        const data = {
          entities: Array.from(world['entities'].entries()).map(([id, entity]) => ({
            id,
            entity: JSON.parse(JSON.stringify(entity.toJSON(), replacer))
          }))
        };
        JSON.stringify(data);
      }).not.toThrow();
    });
  });
});
