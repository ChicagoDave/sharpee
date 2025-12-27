/**
 * Unit tests for PerceptionService
 *
 * Tests the perception filtering system that determines what events
 * the player can perceive based on environmental factors (darkness)
 * and actor state (blindness, blindfold - future).
 *
 * @see ADR-069 Perception-Based Event Filtering
 */

import { describe, test, expect, beforeEach } from 'vitest';
import { WorldModel, IFEntity, EntityType, RoomTrait, IdentityTrait } from '@sharpee/world-model';
import { ISemanticEvent } from '@sharpee/core';
import { PerceptionService } from '../../../src/services/PerceptionService';

describe('PerceptionService', () => {
  let world: WorldModel;
  let player: IFEntity;
  let litRoom: IFEntity;
  let darkRoom: IFEntity;
  let service: PerceptionService;

  beforeEach(() => {
    world = new WorldModel();
    service = new PerceptionService();

    // Create player
    player = world.createEntity('player', EntityType.ACTOR);
    world.setPlayer(player.id);

    // Create a lit room
    litRoom = world.createEntity('Lit Room', EntityType.ROOM);
    litRoom.add(new RoomTrait({ isDark: false }));
    litRoom.add(new IdentityTrait({ name: 'Lit Room', description: 'A well-lit room.' }));

    // Create a dark room
    darkRoom = world.createEntity('Dark Room', EntityType.ROOM);
    darkRoom.add(new RoomTrait({ isDark: true }));
    darkRoom.add(new IdentityTrait({ name: 'Dark Room', description: 'A pitch-dark room.' }));

    // Place player in lit room by default
    world.moveEntity(player.id, litRoom.id);
  });

  describe('canPerceive', () => {
    test('should return true for sight in a lit room', () => {
      const canSee = service.canPerceive(player, litRoom, world, 'sight');
      expect(canSee).toBe(true);
    });

    test('should return false for sight in a dark room', () => {
      const canSee = service.canPerceive(player, darkRoom, world, 'sight');
      expect(canSee).toBe(false);
    });

    test('should return true for hearing in any room', () => {
      expect(service.canPerceive(player, litRoom, world, 'hearing')).toBe(true);
      expect(service.canPerceive(player, darkRoom, world, 'hearing')).toBe(true);
    });

    test('should return true for smell in any room', () => {
      expect(service.canPerceive(player, litRoom, world, 'smell')).toBe(true);
      expect(service.canPerceive(player, darkRoom, world, 'smell')).toBe(true);
    });

    test('should return true for touch in any room', () => {
      expect(service.canPerceive(player, litRoom, world, 'touch')).toBe(true);
      expect(service.canPerceive(player, darkRoom, world, 'touch')).toBe(true);
    });
  });

  describe('filterEvents - in lit room', () => {
    beforeEach(() => {
      world.moveEntity(player.id, litRoom.id);
    });

    test('should pass through all events unchanged', () => {
      const events: ISemanticEvent[] = [
        createEvent('if.event.room.description', { room: { name: 'Lit Room' } }),
        createEvent('if.event.contents.listed', { items: [] }),
        createEvent('action.success', { messageId: 'contents_list' }),
        createEvent('action.success', { messageId: 'other' }),
        createEvent('action.failure', { reason: 'test' }),
      ];

      const filtered = service.filterEvents(events, player, world);

      expect(filtered).toHaveLength(5);
      expect(filtered[0].type).toBe('if.event.room.description');
      expect(filtered[1].type).toBe('if.event.contents.listed');
      expect(filtered[2].type).toBe('action.success');
      expect(filtered[3].type).toBe('action.success');
      expect(filtered[4].type).toBe('action.failure');
    });
  });

  describe('filterEvents - in dark room', () => {
    beforeEach(() => {
      world.moveEntity(player.id, darkRoom.id);
    });

    test('should transform room description to perception blocked', () => {
      const events: ISemanticEvent[] = [
        createEvent('if.event.room.description', { room: { name: 'Dark Room' } }),
      ];

      const filtered = service.filterEvents(events, player, world);

      expect(filtered).toHaveLength(1);
      expect(filtered[0].type).toBe('if.event.perception.blocked');
      expect((filtered[0].data as any).originalType).toBe('if.event.room.description');
      expect((filtered[0].data as any).reason).toBe('darkness');
      expect((filtered[0].data as any).sense).toBe('sight');
    });

    test('should transform contents list to perception blocked', () => {
      const events: ISemanticEvent[] = [
        createEvent('if.event.contents.listed', { items: ['item1', 'item2'] }),
      ];

      const filtered = service.filterEvents(events, player, world);

      expect(filtered).toHaveLength(1);
      expect(filtered[0].type).toBe('if.event.perception.blocked');
      expect((filtered[0].data as any).originalType).toBe('if.event.contents.listed');
    });

    test('should transform action.success with contents_list to perception blocked', () => {
      const events: ISemanticEvent[] = [
        createEvent('action.success', { messageId: 'contents_list' }),
      ];

      const filtered = service.filterEvents(events, player, world);

      expect(filtered).toHaveLength(1);
      expect(filtered[0].type).toBe('if.event.perception.blocked');
      expect((filtered[0].data as any).originalType).toBe('action.success');
    });

    test('should NOT transform non-visual action.success events', () => {
      const events: ISemanticEvent[] = [
        createEvent('action.success', { messageId: 'item_taken' }),
      ];

      const filtered = service.filterEvents(events, player, world);

      expect(filtered).toHaveLength(1);
      expect(filtered[0].type).toBe('action.success');
      expect((filtered[0].data as any).messageId).toBe('item_taken');
    });

    test('should NOT transform action.failure events', () => {
      const events: ISemanticEvent[] = [
        createEvent('action.failure', { reason: 'too_heavy' }),
      ];

      const filtered = service.filterEvents(events, player, world);

      expect(filtered).toHaveLength(1);
      expect(filtered[0].type).toBe('action.failure');
    });

    test('should NOT transform game.message events', () => {
      const events: ISemanticEvent[] = [
        createEvent('game.message', { message: 'Blundering in dark!' }),
      ];

      const filtered = service.filterEvents(events, player, world);

      expect(filtered).toHaveLength(1);
      expect(filtered[0].type).toBe('game.message');
    });
  });

  describe('filterEvents - edge cases', () => {
    test('should pass through events when player location cannot be determined', () => {
      // Create a player not in any room
      const orphanPlayer = world.createEntity('orphan', EntityType.ACTOR);

      const events: ISemanticEvent[] = [
        createEvent('if.event.room.description', { room: { name: 'Test' } }),
      ];

      const filtered = service.filterEvents(events, orphanPlayer, world);

      // Should pass through unchanged since location can't be determined
      expect(filtered).toHaveLength(1);
      expect(filtered[0].type).toBe('if.event.room.description');
    });

    test('should preserve original event data in blocked event', () => {
      world.moveEntity(player.id, darkRoom.id);

      const originalData = { room: { name: 'Test', description: 'A test room.' } };
      const events: ISemanticEvent[] = [
        createEvent('if.event.room.description', originalData),
      ];

      const filtered = service.filterEvents(events, player, world);

      expect((filtered[0].data as any).originalData).toEqual(originalData);
    });

    test('should handle empty events array', () => {
      const filtered = service.filterEvents([], player, world);
      expect(filtered).toHaveLength(0);
    });

    test('should handle mixed event types correctly', () => {
      world.moveEntity(player.id, darkRoom.id);

      const events: ISemanticEvent[] = [
        createEvent('if.event.room.description', {}),
        createEvent('game.message', { message: 'Test' }),
        createEvent('if.event.contents.listed', {}),
        createEvent('action.failure', { reason: 'test' }),
      ];

      const filtered = service.filterEvents(events, player, world);

      expect(filtered).toHaveLength(4);
      expect(filtered[0].type).toBe('if.event.perception.blocked');
      expect(filtered[1].type).toBe('game.message');
      expect(filtered[2].type).toBe('if.event.perception.blocked');
      expect(filtered[3].type).toBe('action.failure');
    });
  });
});

// Helper to create test events
function createEvent(type: string, data: any): ISemanticEvent {
  return {
    id: `test-${Date.now()}-${Math.random()}`,
    type,
    timestamp: Date.now(),
    data,
    entities: {},
  };
}
