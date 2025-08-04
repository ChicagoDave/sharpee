/**
 * Tests for the StandardWitnessSystem
 */

import { describe, test, expect, beforeEach, vi } from 'vitest';
import { WorldModel, TraitType } from '@sharpee/world-model';
import { StandardScopeResolver } from '../../../src/scope/scope-resolver';
import { StandardWitnessSystem } from '../../../src/scope/witness-system';
import { StateChange, WitnessLevel, SenseType } from '../../../src/scope/types';
import * as coreModule from '@sharpee/core';

// Mock the createEvent function
vi.mock('@sharpee/core', () => ({
  createEvent: vi.fn()
}));

describe('StandardWitnessSystem', () => {
  let world: WorldModel;
  let scopeResolver: StandardScopeResolver;
  let witnessSystem: StandardWitnessSystem;
  let player: any;
  let npc: any;
  let room: any;

  beforeEach(() => {
    vi.clearAllMocks();
    
    world = new WorldModel();
    scopeResolver = new StandardScopeResolver(world);
    witnessSystem = new StandardWitnessSystem(world, scopeResolver);

    // Create basic test world
    room = world.createEntity('Test Room', 'room');
    room.add({ type: TraitType.ROOM });

    player = world.createEntity('Player', 'actor');
    player.add({ type: TraitType.ACTOR, isPlayer: true });
    player.add({ type: TraitType.CONTAINER });
    
    npc = world.createEntity('Bob', 'actor');
    npc.add({ type: TraitType.ACTOR, isPlayer: false });
    npc.add({ type: TraitType.CONTAINER });
    
    world.moveEntity(player.id, room.id);
    world.moveEntity(npc.id, room.id);
    world.setPlayer(player.id);
  });

  describe('Basic Witnessing', () => {
    test('should record witnesses for movement in same room', () => {
      const ball = world.createEntity('red ball', 'thing');
      world.moveEntity(ball.id, room.id);

      const change: StateChange = {
        type: 'move',
        entityId: ball.id,
        from: room.id,
        to: player.id,
        actorId: player.id,
        timestamp: Date.now()
      };

      const record = witnessSystem.recordWitnesses(change);

      // NPC should witness the player taking the ball
      expect(record.witnesses.size).toBe(1);
      expect(record.witnesses.has(npc.id)).toBe(true);
      
      const detail = record.witnesses.get(npc.id)!;
      expect(detail.sense).toBe(SenseType.SIGHT);
      expect(detail.confidence).toBe('certain');
    });

    test('should not record actor as witness of their own action', () => {
      const ball = world.createEntity('red ball', 'thing');
      world.moveEntity(ball.id, room.id);

      const change: StateChange = {
        type: 'move',
        entityId: ball.id,
        from: room.id,
        to: player.id,
        actorId: player.id,
        timestamp: Date.now()
      };

      const record = witnessSystem.recordWitnesses(change);

      // Player should not witness their own action
      expect(record.witnesses.has(player.id)).toBe(false);
    });

    test('should not witness events in different rooms', () => {
      const otherRoom = world.createEntity('Other Room', 'room');
      otherRoom.add({ type: TraitType.ROOM });
      
      // Move NPC to other room
      world.moveEntity(npc.id, otherRoom.id);
      
      const ball = world.createEntity('red ball', 'thing');
      world.moveEntity(ball.id, room.id);

      const change: StateChange = {
        type: 'move',
        entityId: ball.id,
        from: room.id,
        to: player.id,
        actorId: player.id,
        timestamp: Date.now()
      };

      const record = witnessSystem.recordWitnesses(change);

      // NPC should not witness events in a different room
      expect(record.witnesses.size).toBe(0);
    });
  });

  describe('Knowledge Management', () => {
    test('should track discovered entities', () => {
      const coin = world.createEntity('gold coin', 'thing');
      world.moveEntity(coin.id, room.id);

      // Player discovers the coin
      const change: StateChange = {
        type: 'create',
        entityId: coin.id,
        timestamp: Date.now()
      };

      witnessSystem.recordWitnesses(change);

      // Check player's knowledge
      expect(witnessSystem.hasDiscovered(player.id, coin.id)).toBe(true);
      
      const knowledge = witnessSystem.getKnowledge(player.id, coin.id);
      expect(knowledge).toBeDefined();
      expect(knowledge!.exists).toBe(true);
      expect(knowledge!.discoveredBy).toBe(SenseType.SIGHT);
    });

    test('should track entity movement history', () => {
      const ball = world.createEntity('ball', 'thing');
      world.moveEntity(ball.id, room.id);

      // First movement
      const change1: StateChange = {
        type: 'move',
        entityId: ball.id,
        from: room.id,
        to: player.id,
        actorId: player.id,
        timestamp: Date.now()
      };
      witnessSystem.recordWitnesses(change1);

      // Second movement
      const change2: StateChange = {
        type: 'move',
        entityId: ball.id,
        from: player.id,
        to: room.id,
        actorId: player.id,
        timestamp: Date.now() + 1000
      };
      witnessSystem.recordWitnesses(change2);

      // Check NPC's knowledge
      const knowledge = witnessSystem.getKnowledge(npc.id, ball.id);
      expect(knowledge).toBeDefined();
      expect(knowledge!.movementHistory).toHaveLength(2);
      expect(knowledge!.lastKnownLocation).toBe(room.id);
    });

    test('should update visual properties when witnessed', () => {
      const door = world.createEntity('door', 'thing');
      door.add({ type: TraitType.OPENABLE, isOpen: false });
      world.moveEntity(door.id, room.id);

      const change: StateChange = {
        type: 'modify',
        entityId: door.id,
        property: 'isOpen',
        oldValue: false,
        newValue: true,
        actorId: player.id,
        timestamp: Date.now()
      };

      witnessSystem.recordWitnesses(change);

      const knowledge = witnessSystem.getKnowledge(npc.id, door.id);
      expect(knowledge).toBeDefined();
      expect(knowledge!.visualProperties).toBeDefined();
      expect(knowledge!.visualProperties!.get('isOpen')).toBe(true);
    });

    test('should mark entities as non-existent when destroyed', () => {
      const vase = world.createEntity('vase', 'thing');
      world.moveEntity(vase.id, room.id);

      // First, discover the vase
      witnessSystem.recordWitnesses({
        type: 'create',
        entityId: vase.id,
        timestamp: Date.now()
      });

      // Then destroy it
      witnessSystem.recordWitnesses({
        type: 'destroy',
        entityId: vase.id,
        actorId: player.id,
        timestamp: Date.now() + 1000
      });

      const knowledge = witnessSystem.getKnowledge(npc.id, vase.id);
      expect(knowledge).toBeDefined();
      expect(knowledge!.exists).toBe(false);
    });
  });

  describe('Witness Events', () => {
    test('should emit action witness event', () => {
      const ball = world.createEntity('ball', 'thing');
      world.moveEntity(ball.id, room.id);

      const change: StateChange = {
        type: 'action',
        entityId: ball.id,
        actorId: player.id,
        action: 'taking',
        target: ball.id,
        from: room.id,
        to: player.id,
        timestamp: Date.now()
      };

      witnessSystem.recordWitnesses(change);

      // Check that createEvent was called
      expect(coreModule.createEvent).toHaveBeenCalledWith(
        'if.witness.action',
        expect.objectContaining({
          witnessId: npc.id,
          sense: SenseType.SIGHT,
          action: 'taking',
          actorId: player.id,
          targetId: ball.id,
          level: WitnessLevel.FULL,
          fromLocation: room.id,
          toLocation: player.id
        }),
        expect.objectContaining({
          actor: npc.id,
          target: ball.id
        })
      );
    });

    test('should emit movement witness event', () => {
      const ball = world.createEntity('ball', 'thing');
      world.moveEntity(ball.id, room.id);

      const change: StateChange = {
        type: 'move',
        entityId: ball.id,
        from: room.id,
        to: player.id,
        actorId: player.id,
        timestamp: Date.now()
      };

      witnessSystem.recordWitnesses(change);

      expect(coreModule.createEvent).toHaveBeenCalledWith(
        'if.witness.movement',
        expect.objectContaining({
          witnessId: npc.id,
          sense: SenseType.SIGHT,
          entityId: ball.id,
          fromLocation: room.id,
          toLocation: player.id,
          level: WitnessLevel.FULL
        }),
        expect.objectContaining({
          actor: npc.id,
          target: ball.id
        })
      );
    });

    test('should emit unknown entity for partial witness level', () => {
      // Mock partial witness level
      vi.spyOn(scopeResolver, 'canReach').mockReturnValue(false);
      
      const figure = world.createEntity('mysterious figure', 'actor');
      world.moveEntity(figure.id, room.id);

      const change: StateChange = {
        type: 'move',
        entityId: figure.id,
        from: room.id,
        to: 'hallway',
        timestamp: Date.now()
      };

      witnessSystem.recordWitnesses(change);

      expect(coreModule.createEvent).toHaveBeenCalledWith(
        'if.witness.movement',
        expect.objectContaining({
          witnessId: player.id,
          entityId: 'unknown', // Can't identify at distance
          level: WitnessLevel.PARTIAL
        }),
        expect.objectContaining({
          actor: player.id,
          target: figure.id
        })
      );
    });
  });

  describe('Witness Levels', () => {
    test('should assign FULL level when can reach', () => {
      const ball = world.createEntity('ball', 'thing');
      world.moveEntity(ball.id, room.id);

      const change: StateChange = {
        type: 'move',
        entityId: ball.id,
        from: room.id,
        to: player.id,
        actorId: player.id,
        timestamp: Date.now()
      };

      const record = witnessSystem.recordWitnesses(change);
      const detail = record.witnesses.get(npc.id)!;
      
      expect(detail.level).toBe(WitnessLevel.FULL);
    });

    test('should assign PARTIAL level when can see but not reach', () => {
      // Create a closed container with something inside
      const box = world.createEntity('glass box', 'container');
      box.add({ type: TraitType.CONTAINER });
      box.add({ type: TraitType.OPENABLE, isOpen: false });
      world.moveEntity(box.id, room.id);
      
      // Mock that we can see but not reach
      vi.spyOn(scopeResolver, 'canReach').mockReturnValue(false);
      
      const change: StateChange = {
        type: 'move',
        entityId: box.id,
        from: room.id,
        to: 'shelf',
        timestamp: Date.now()
      };

      const record = witnessSystem.recordWitnesses(change);
      const detail = record.witnesses.get(player.id);
      
      expect(detail?.level).toBe(WitnessLevel.PARTIAL);
    });
  });

  describe('getKnownEntities', () => {
    test('should return all known entities for an actor', () => {
      // Create and witness multiple entities
      const ball = world.createEntity('ball', 'thing');
      const coin = world.createEntity('coin', 'thing');
      const key = world.createEntity('key', 'thing');
      
      world.moveEntity(ball.id, room.id);
      world.moveEntity(coin.id, room.id);
      world.moveEntity(key.id, room.id);

      // Witness all three
      witnessSystem.recordWitnesses({
        type: 'create',
        entityId: ball.id,
        timestamp: Date.now()
      });
      witnessSystem.recordWitnesses({
        type: 'create',
        entityId: coin.id,
        timestamp: Date.now()
      });
      witnessSystem.recordWitnesses({
        type: 'create',
        entityId: key.id,
        timestamp: Date.now()
      });

      const knownEntities = witnessSystem.getKnownEntities(player.id);
      
      expect(knownEntities).toHaveLength(3);
      expect(knownEntities.map(k => k.entityId)).toContain(ball.id);
      expect(knownEntities.map(k => k.entityId)).toContain(coin.id);
      expect(knownEntities.map(k => k.entityId)).toContain(key.id);
    });

    test('should return empty array for actor with no knowledge', () => {
      const unknownActor = world.createEntity('stranger', 'actor');
      const knownEntities = witnessSystem.getKnownEntities(unknownActor.id);
      
      expect(knownEntities).toEqual([]);
    });
  });
});