/**
 * Golden test for climbing action - demonstrates testing climbing movements
 * 
 * This shows patterns for testing actions that:
 * - Handle directional climbing (up/down)
 * - Allow climbing onto objects (supporters, enterable items)
 * - Validate climb targets and paths
 * - Generate appropriate movement events
 */

import { describe, test, expect, beforeEach } from 'vitest';
import { climbingAction } from '../../../src/actions/standard/climbing';
import { IFActions } from '../../../src/actions/constants';
import { TraitType, WorldModel, EntityType, RoomTrait } from '@sharpee/world-model';
import {
  createRealTestContext,
  expectEvent,
  executeWithValidation,
  TestData,
  createCommand,
  setupBasicWorld
} from '../../test-utils';
import type { ActionContext } from '../../../src/actions/enhanced-types';

describe('climbingAction (Golden Pattern)', () => {
  describe('Action Metadata', () => {
    test('should have correct ID', () => {
      expect(climbingAction.id).toBe(IFActions.CLIMBING);
    });

    test('should declare required messages', () => {
      expect(climbingAction.requiredMessages).toContain('no_target');
      expect(climbingAction.requiredMessages).toContain('not_climbable');
      expect(climbingAction.requiredMessages).toContain('cant_go_that_way');
      expect(climbingAction.requiredMessages).toContain('climbed_up');
      expect(climbingAction.requiredMessages).toContain('climbed_down');
      expect(climbingAction.requiredMessages).toContain('climbed_onto');
      expect(climbingAction.requiredMessages).toContain('already_there');
      expect(climbingAction.requiredMessages).toContain('too_high');
      expect(climbingAction.requiredMessages).toContain('too_dangerous');
    });

    test('should belong to movement group', () => {
      expect(climbingAction.group).toBe('movement');
    });
  });

  describe('Precondition Checks', () => {
    test('should fail when no target or direction specified', () => {
      const { world, player } = setupBasicWorld();
      const command = createCommand(IFActions.CLIMBING);
      const context = createRealTestContext(climbingAction, world, command);
      
      const events = executeWithValidation(climbingAction, context);

      expectEvent(events, 'if.event.climbed', {
        messageId: 'if.action.climbing.no_target',
        reason: 'no_target'
      });
    });

    test('should fail when object is not climbable', () => {
      const { world, player, room, object } = TestData.withObject('red ball');
      // Ball has no entry or supporter traits

      const command = createCommand(IFActions.CLIMBING, {
        entity: object
      });
      const context = createRealTestContext(climbingAction, world, command);

      const events = executeWithValidation(climbingAction, context);

      expectEvent(events, 'if.event.climbed', {
        messageId: 'if.action.climbing.not_climbable',
        reason: 'not_climbable'
      });
    });

    test('should fail when already on target', () => {
      const { world, player, room } = setupBasicWorld();

      const platform = world.createEntity('wooden platform', EntityType.SUPPORTER);
      platform.add({
        type: TraitType.SUPPORTER,
        enterable: true
      });
      world.moveEntity(platform.id, room.id);
      world.moveEntity(player.id, platform.id); // Already on platform

      const command = createCommand(IFActions.CLIMBING, {
        entity: platform
      });
      const context = createRealTestContext(climbingAction, world, command);

      const events = executeWithValidation(climbingAction, context);

      expectEvent(events, 'if.event.climbed', {
        messageId: 'if.action.climbing.already_there',
        reason: 'already_there'
      });
    });

    test('should fail for invalid directions', () => {
      const { world, player } = setupBasicWorld();
      const command = createCommand(IFActions.CLIMBING);
      command.parsed.extras = { direction: 'north' }; // Invalid for climbing

      const context = createRealTestContext(climbingAction, world, command);

      const events = executeWithValidation(climbingAction, context);

      expectEvent(events, 'if.event.climbed', {
        messageId: 'if.action.climbing.cant_go_that_way',
        reason: 'cant_go_that_way'
      });
    });

    test('should fail when no exit in climb direction', () => {
      const world = new WorldModel();

      const room = world.createEntity('Ground Floor', EntityType.ROOM);
      room.add({
        type: TraitType.ROOM,
        exits: {
          north: { to: 'room2' }  // No up/down exits
        }
      });

      const player = world.createEntity('yourself', EntityType.ACTOR);
      player.add({ type: TraitType.ACTOR, isPlayer: true });
      world.setPlayer(player.id);
      world.moveEntity(player.id, room.id);

      const command = createCommand(IFActions.CLIMBING);
      command.parsed.extras = { direction: 'up' };

      const context = createRealTestContext(climbingAction, world, command);

      const events = executeWithValidation(climbingAction, context);

      expectEvent(events, 'if.event.climbed', {
        messageId: 'if.action.climbing.cant_go_that_way',
        reason: 'cant_go_that_way'
      });
    });

    test('should fail when not in a room for directional climbing', () => {
      const world = new WorldModel();

      const container = world.createEntity('box', EntityType.CONTAINER);
      container.add({ type: TraitType.CONTAINER });

      const player = world.createEntity('yourself', EntityType.ACTOR);
      player.add({ type: TraitType.ACTOR, isPlayer: true });
      world.setPlayer(player.id);
      world.moveEntity(player.id, container.id);

      const command = createCommand(IFActions.CLIMBING);
      command.parsed.extras = { direction: 'up' };

      const context = createRealTestContext(climbingAction, world, command);

      const events = executeWithValidation(climbingAction, context);

      expectEvent(events, 'if.event.climbed', {
        messageId: 'if.action.climbing.cant_go_that_way',
        reason: 'cant_go_that_way'
      });
    });
  });

  describe('Successful Climbing', () => {
    test('should climb up when exit exists', () => {
      const world = new WorldModel();
      
      const groundFloor = world.createEntity('Ground Floor', EntityType.ROOM);
      groundFloor.add({
        type: TraitType.ROOM,
        exits: {
          up: { to: 'attic' }
        }
      });
      
      const attic = world.createEntity('Attic', EntityType.ROOM);
      attic.add({
        type: TraitType.ROOM,
        exits: {
          down: { to: groundFloor.id }
        }
      });
      
      // Update ground floor exit to use actual ID
      const roomTrait = groundFloor.getTrait(RoomTrait)!;
      roomTrait.exits.up.to = attic.id;
      
      const player = world.createEntity('yourself', EntityType.ACTOR);
      player.add({ type: TraitType.ACTOR, isPlayer: true });
      world.setPlayer(player.id);
      world.moveEntity(player.id, groundFloor.id);
      
      const command = createCommand(IFActions.CLIMBING);
      command.parsed.extras = { direction: 'up' };
      
      const context = createRealTestContext(climbingAction, world, command);
      
      const events = executeWithValidation(climbingAction, context);
      
      // Should emit CLIMBED event with messageId for text rendering
      expectEvent(events, 'if.event.climbed', {
        messageId: 'if.action.climbing.climbed_up',
        direction: 'up',
        method: 'directional',
        destinationId: attic.id
      });

      // Should emit movement event
      expectEvent(events, 'if.event.moved', {
        direction: 'up',
        fromRoom: groundFloor.id,
        toRoom: attic.id,
        method: 'climbing'
      });
    });

    test('should climb down when exit exists', () => {
      const world = new WorldModel();

      const groundFloor = world.createEntity('Ground Floor', EntityType.ROOM);
      groundFloor.add({ type: TraitType.ROOM });

      const attic = world.createEntity('Attic', EntityType.ROOM);
      attic.add({
        type: TraitType.ROOM,
        exits: {
          down: { to: groundFloor.id }
        }
      });

      const player = world.createEntity('yourself', EntityType.ACTOR);
      player.add({ type: TraitType.ACTOR, isPlayer: true });
      world.setPlayer(player.id);
      world.moveEntity(player.id, attic.id);

      const command = createCommand(IFActions.CLIMBING);
      command.parsed.extras = { direction: 'down' };

      const context = createRealTestContext(climbingAction, world, command);

      const events = executeWithValidation(climbingAction, context);

      expectEvent(events, 'if.event.climbed', {
        messageId: 'if.action.climbing.climbed_down',
        direction: 'down',
        method: 'directional',
        destinationId: groundFloor.id
      });
    });

    test('should climb onto enterable supporter', () => {
      const { world, player, room } = setupBasicWorld();
      
      const tree = world.createEntity('oak tree', EntityType.SCENERY);
      tree.add({
        type: TraitType.SUPPORTER,
        enterable: true
      });
      world.moveEntity(tree.id, room.id);
      
      const command = createCommand(IFActions.CLIMBING, {
        entity: tree
      });
      const context = createRealTestContext(climbingAction, world, command);
      
      const events = executeWithValidation(climbingAction, context);
      
      // Should emit CLIMBED event with messageId for text rendering
      expectEvent(events, 'if.event.climbed', {
        messageId: 'if.action.climbing.climbed_onto',
        params: { target: 'oak tree' },
        targetId: tree.id,
        method: 'onto'
      });

      // Should emit ENTERED event for climbing onto
      expectEvent(events, 'if.event.entered', {
        targetId: tree.id,
        method: 'climbing',
        preposition: 'onto'
      });
    });

    test('should climb object with CLIMBABLE trait', () => {
      const { world, player, room } = setupBasicWorld();
      
      const ladder = world.createEntity('wooden ladder', EntityType.OBJECT);
      ladder.add({
        type: TraitType.CLIMBABLE,
        canClimb: true,
        direction: 'up'
      });
      world.moveEntity(ladder.id, room.id);
      
      const command = createCommand(IFActions.CLIMBING, {
        entity: ladder
      });
      const context = createRealTestContext(climbingAction, world, command);
      
      const events = executeWithValidation(climbingAction, context);
      
      expectEvent(events, 'if.event.climbed', {
        targetId: ladder.id,
        method: 'onto'
      });
      
      expectEvent(events, 'if.event.entered', {
        targetId: ladder.id,
        method: 'climbing',
        preposition: 'onto'
      });
    });

    test('should handle direction normalization', () => {
      const world = new WorldModel();
      
      const room1 = world.createEntity('Room', EntityType.ROOM);
      room1.add({
        type: TraitType.ROOM,
        exits: {
          up: { to: 'room2' }
        }
      });
      
      const room2 = world.createEntity('Upper Room', EntityType.ROOM);
      room2.add({ type: TraitType.ROOM });
      
      // Update exit to use actual ID
      const roomTrait = room1.getTrait(RoomTrait)!;
      roomTrait.exits.up.to = room2.id;
      
      const player = world.createEntity('yourself', EntityType.ACTOR);
      player.add({ type: TraitType.ACTOR, isPlayer: true });
      world.setPlayer(player.id);
      world.moveEntity(player.id, room1.id);
      
      const command = createCommand(IFActions.CLIMBING);
      command.parsed.extras = { direction: 'UP' }; // Uppercase
      
      const context = createRealTestContext(climbingAction, world, command);
      
      const events = executeWithValidation(climbingAction, context);
      
      expectEvent(events, 'if.event.climbed', {
        direction: 'up' // Normalized to lowercase
      });
    });
  });

  describe('Event Structure Validation', () => {
    test('should include proper entities in all events', () => {
      const { world, player, room } = setupBasicWorld();
      
      const platform = world.createEntity('platform', EntityType.SUPPORTER);
      platform.add({
        type: TraitType.SUPPORTER,
        enterable: true
      });
      world.moveEntity(platform.id, room.id);
      
      const command = createCommand(IFActions.CLIMBING, {
        entity: platform
      });
      const context = createRealTestContext(climbingAction, world, command);
      
      const events = executeWithValidation(climbingAction, context);
      
      events.forEach(event => {
        if (event.entities) {
          expect(event.entities.actor).toBe(player.id);
          expect(event.entities.target).toBe(platform.id);
          expect(event.entities.location).toBe(room.id);
        }
      });
    });
  });
});
