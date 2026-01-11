/**
 * Tests for implicit take functionality
 *
 * When an action requires a CARRIED item but the item is only REACHABLE,
 * the system should automatically attempt to take the item first.
 */

import { describe, test, expect, beforeEach } from 'vitest';
import { WorldModel, TraitType, EntityType, IFEntity } from '@sharpee/world-model';
import { createActionContext } from '../../../src/actions/enhanced-context';
import { Action, ValidationResult } from '../../../src/actions/enhanced-types';
import { ScopeLevel } from '../../../src/scope/types';
import { ValidatedCommand } from '../../../src/validation/types';

describe('Implicit Takes (requireCarriedOrImplicitTake)', () => {
  let world: WorldModel;
  let player: IFEntity;
  let room: IFEntity;

  // Dummy action for testing - just needs to create a context
  const testAction: Action = {
    id: 'test.action',
    validate: () => ({ valid: true }),
    execute: () => {},
    report: () => []
  };

  function createTestCommand(entity?: IFEntity): ValidatedCommand {
    return {
      parsed: {
        rawInput: 'test',
        action: testAction.id,
        tokens: [],
        structure: { verb: { tokens: [0], text: 'test', head: 'test' } },
        pattern: 'VERB_NOUN',
        confidence: 1.0
      },
      actionId: testAction.id,
      directObject: entity ? {
        entity,
        parsed: { text: entity.name, candidates: [entity.name] }
      } : undefined
    };
  }

  beforeEach(() => {
    world = new WorldModel();

    // Create room
    room = world.createEntity('Test Room', EntityType.ROOM);
    room.add({ type: TraitType.ROOM });

    // Create player
    player = world.createEntity('Player', EntityType.ACTOR);
    player.add({ type: TraitType.ACTOR, isPlayer: true });
    player.add({ type: TraitType.CONTAINER }); // Can hold things

    world.moveEntity(player.id, room.id);
    world.setPlayer(player.id);
  });

  describe('Already Carried', () => {
    test('should succeed without implicit take when item is already carried', () => {
      const coin = world.createEntity('gold coin', EntityType.OBJECT);
      world.moveEntity(coin.id, player.id);

      const command = createTestCommand(coin);
      const context = createActionContext(world, player, testAction, command);

      const result = context.requireCarriedOrImplicitTake(coin);

      expect(result.ok).toBe(true);
      expect(result.implicitTakeEvents).toBeUndefined();
      expect(context.sharedData.implicitTakeEvents).toBeUndefined();
    });
  });

  describe('Reachable and Takeable', () => {
    test('should perform implicit take when item is reachable but not carried', () => {
      const coin = world.createEntity('gold coin', EntityType.OBJECT);
      world.moveEntity(coin.id, room.id);

      const command = createTestCommand(coin);
      const context = createActionContext(world, player, testAction, command);

      // Verify precondition
      expect(world.getLocation(coin.id)).toBe(room.id);

      const result = context.requireCarriedOrImplicitTake(coin);

      expect(result.ok).toBe(true);
      expect(result.implicitTakeEvents).toBeDefined();
      expect(result.implicitTakeEvents!.length).toBeGreaterThan(0);

      // Item should now be carried
      expect(world.getLocation(coin.id)).toBe(player.id);
    });

    test('should emit if.event.implicit_take event', () => {
      const coin = world.createEntity('gold coin', EntityType.OBJECT);
      world.moveEntity(coin.id, room.id);

      const command = createTestCommand(coin);
      const context = createActionContext(world, player, testAction, command);

      const result = context.requireCarriedOrImplicitTake(coin);

      expect(result.ok).toBe(true);
      const implicitEvent = result.implicitTakeEvents!.find(
        e => e.type === 'if.event.implicit_take'
      );
      expect(implicitEvent).toBeDefined();
      expect(implicitEvent!.data.itemName).toBe('gold coin');
    });

    test('should emit if.event.taken event after implicit take', () => {
      const coin = world.createEntity('gold coin', EntityType.OBJECT);
      world.moveEntity(coin.id, room.id);

      const command = createTestCommand(coin);
      const context = createActionContext(world, player, testAction, command);

      const result = context.requireCarriedOrImplicitTake(coin);

      expect(result.ok).toBe(true);
      const takenEvent = result.implicitTakeEvents!.find(
        e => e.type === 'if.event.taken'
      );
      expect(takenEvent).toBeDefined();
    });

    test('should store events in sharedData.implicitTakeEvents', () => {
      const coin = world.createEntity('gold coin', EntityType.OBJECT);
      world.moveEntity(coin.id, room.id);

      const command = createTestCommand(coin);
      const context = createActionContext(world, player, testAction, command);

      context.requireCarriedOrImplicitTake(coin);

      expect(context.sharedData.implicitTakeEvents).toBeDefined();
      expect(context.sharedData.implicitTakeEvents.length).toBeGreaterThan(0);
    });
  });

  describe('Not Reachable', () => {
    test('should return scope error when item is not reachable', () => {
      const otherRoom = world.createEntity('Other Room', EntityType.ROOM);
      otherRoom.add({ type: TraitType.ROOM });

      const coin = world.createEntity('gold coin', EntityType.OBJECT);
      world.moveEntity(coin.id, otherRoom.id);

      const command = createTestCommand(coin);
      const context = createActionContext(world, player, testAction, command);

      const result = context.requireCarriedOrImplicitTake(coin);

      expect(result.ok).toBe(false);
      expect(result.error).toBeDefined();
      // Should be a scope error (not reachable or not visible)
      expect(result.error!.error).toMatch(/scope\.(not_reachable|not_visible|not_known)/);
    });

    test('should not attempt to take item in different room', () => {
      const otherRoom = world.createEntity('Other Room', EntityType.ROOM);
      otherRoom.add({ type: TraitType.ROOM });

      const coin = world.createEntity('gold coin', EntityType.OBJECT);
      world.moveEntity(coin.id, otherRoom.id);

      const command = createTestCommand(coin);
      const context = createActionContext(world, player, testAction, command);

      const result = context.requireCarriedOrImplicitTake(coin);

      // Item should still be in the other room
      expect(world.getLocation(coin.id)).toBe(otherRoom.id);
      expect(result.ok).toBe(false);
    });
  });

  describe('Scenery (Not Takeable)', () => {
    test('should return fixed_in_place error for scenery items', () => {
      const statue = world.createEntity('marble statue', EntityType.OBJECT);
      statue.add({ type: TraitType.SCENERY });
      world.moveEntity(statue.id, room.id);

      const command = createTestCommand(statue);
      const context = createActionContext(world, player, testAction, command);

      const result = context.requireCarriedOrImplicitTake(statue);

      expect(result.ok).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error!.error).toBe('fixed_in_place');
    });

    test('should not attempt to take scenery', () => {
      const statue = world.createEntity('marble statue', EntityType.OBJECT);
      statue.add({ type: TraitType.SCENERY });
      world.moveEntity(statue.id, room.id);

      const command = createTestCommand(statue);
      const context = createActionContext(world, player, testAction, command);

      context.requireCarriedOrImplicitTake(statue);

      // Item should still be in the room
      expect(world.getLocation(statue.id)).toBe(room.id);
    });
  });

  describe('Take Validation Fails', () => {
    test('should return error when trying to take yourself', () => {
      // Player is an actor which can't be taken
      const command = createTestCommand(player);
      const context = createActionContext(world, player, testAction, command);

      const result = context.requireCarriedOrImplicitTake(player);

      expect(result.ok).toBe(false);
      expect(result.error).toBeDefined();
    });

    test('should return error when trying to take a room', () => {
      const command = createTestCommand(room);
      const context = createActionContext(world, player, testAction, command);

      const result = context.requireCarriedOrImplicitTake(room);

      expect(result.ok).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('Multiple Implicit Takes', () => {
    test('should accumulate events from multiple implicit takes', () => {
      const coin = world.createEntity('gold coin', EntityType.OBJECT);
      const key = world.createEntity('brass key', EntityType.OBJECT);
      world.moveEntity(coin.id, room.id);
      world.moveEntity(key.id, room.id);

      const command = createTestCommand(coin);
      const context = createActionContext(world, player, testAction, command);

      // First implicit take
      const result1 = context.requireCarriedOrImplicitTake(coin);
      expect(result1.ok).toBe(true);
      const eventsAfterFirst = context.sharedData.implicitTakeEvents.length;

      // Second implicit take
      const result2 = context.requireCarriedOrImplicitTake(key);
      expect(result2.ok).toBe(true);

      // Events should accumulate
      expect(context.sharedData.implicitTakeEvents.length).toBeGreaterThan(eventsAfterFirst);
    });
  });
});
