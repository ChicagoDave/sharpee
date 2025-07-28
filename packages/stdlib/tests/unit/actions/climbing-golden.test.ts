/**
 * Golden test for climbing action - demonstrates testing climbing movements
 * 
 * This shows patterns for testing actions that:
 * - Handle directional climbing (up/down)
 * - Allow climbing onto objects (supporters, enterable items)
 * - Validate climb targets and paths
 * - Generate appropriate movement events
 */

import { describe, test, expect, beforeEach } from '@jest/globals';
import { climbingAction } from '../../../src/actions/standard/climbing';
import { IFActions } from '../../../src/actions/constants';
import { TraitType, WorldModel } from '@sharpee/world-model';
import { 
  createRealTestContext,
  expectEvent,
  TestData,
  createCommand,
  setupBasicWorld
} from '../../test-utils';
import type { EnhancedActionContext } from '../../../src/actions/enhanced-types';

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
      
      const events = climbingAction.execute(context);
      
      expectEvent(events, 'action.error', {
        messageId: expect.stringContaining('no_target'),
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
      
      const events = climbingAction.execute(context);
      
      expectEvent(events, 'action.error', {
        messageId: expect.stringContaining('not_climbable'),
        params: { object: 'red ball' }
      });
    });

    test('should fail when already on target', () => {
      const { world, player, room } = setupBasicWorld();
      
      const platform = world.createEntity('wooden platform', 'supporter');
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
      
      const events = climbingAction.execute(context);
      
      expectEvent(events, 'action.error', {
        messageId: expect.stringContaining('already_there'),
        params: { place: 'wooden platform' }
      });
    });

    test('should fail for invalid directions', () => {
      const { world, player } = setupBasicWorld();
      const command = createCommand(IFActions.CLIMBING);
      command.parsed.extras = { direction: 'north' }; // Invalid for climbing
      
      const context = createRealTestContext(climbingAction, world, command);
      
      const events = climbingAction.execute(context);
      
      expectEvent(events, 'action.error', {
        messageId: expect.stringContaining('cant_go_that_way'),
        params: { direction: 'north' }
      });
    });

    test('should fail when no exit in climb direction', () => {
      const world = new WorldModel();
      
      const room = world.createEntity('Ground Floor', 'room');
      room.add({
        type: TraitType.ROOM,
        exits: {
          north: { to: 'room2' }  // No up/down exits
        }
      });
      
      const player = world.createEntity('yourself', 'actor');
      player.add({ type: TraitType.ACTOR, isPlayer: true });
      world.setPlayer(player.id);
      world.moveEntity(player.id, room.id);
      
      const command = createCommand(IFActions.CLIMBING);
      command.parsed.extras = { direction: 'up' };
      
      const context = createRealTestContext(climbingAction, world, command);
      
      const events = climbingAction.execute(context);
      
      expectEvent(events, 'action.error', {
        messageId: expect.stringContaining('cant_go_that_way'),
        params: { direction: 'up' }
      });
    });

    test('should fail when not in a room for directional climbing', () => {
      const world = new WorldModel();
      
      const container = world.createEntity('box', 'container');
      container.add({ type: TraitType.CONTAINER });
      
      const player = world.createEntity('yourself', 'actor');
      player.add({ type: TraitType.ACTOR, isPlayer: true });
      world.setPlayer(player.id);
      world.moveEntity(player.id, container.id);
      
      const command = createCommand(IFActions.CLIMBING);
      command.parsed.extras = { direction: 'up' };
      
      const context = createRealTestContext(climbingAction, world, command);
      
      const events = climbingAction.execute(context);
      
      expectEvent(events, 'action.error', {
        messageId: expect.stringContaining('cant_go_that_way'),
        params: { direction: 'up' }
      });
    });
  });

  describe('Successful Climbing', () => {
    test('should climb up when exit exists', () => {
      const world = new WorldModel();
      
      const groundFloor = world.createEntity('Ground Floor', 'room');
      groundFloor.add({
        type: TraitType.ROOM,
        exits: {
          up: { to: 'attic' }
        }
      });
      
      const attic = world.createEntity('Attic', 'room');
      attic.add({
        type: TraitType.ROOM,
        exits: {
          down: { to: groundFloor.id }
        }
      });
      
      // Update ground floor exit to use actual ID
      const roomTrait = groundFloor.getTrait(TraitType.ROOM) as any;
      roomTrait.exits.up.to = attic.id;
      
      const player = world.createEntity('yourself', 'actor');
      player.add({ type: TraitType.ACTOR, isPlayer: true });
      world.setPlayer(player.id);
      world.moveEntity(player.id, groundFloor.id);
      
      const command = createCommand(IFActions.CLIMBING);
      command.parsed.extras = { direction: 'up' };
      
      const context = createRealTestContext(climbingAction, world, command);
      
      const events = climbingAction.execute(context);
      
      // Should emit CLIMBED event
      expectEvent(events, 'if.event.climbed', {
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
      
      // Should emit success message
      expectEvent(events, 'action.success', {
        messageId: expect.stringContaining('climbed_up')
      });
    });

    test('should climb down when exit exists', () => {
      const world = new WorldModel();
      
      const groundFloor = world.createEntity('Ground Floor', 'room');
      groundFloor.add({ type: TraitType.ROOM });
      
      const attic = world.createEntity('Attic', 'room');
      attic.add({
        type: TraitType.ROOM,
        exits: {
          down: { to: groundFloor.id }
        }
      });
      
      const player = world.createEntity('yourself', 'actor');
      player.add({ type: TraitType.ACTOR, isPlayer: true });
      world.setPlayer(player.id);
      world.moveEntity(player.id, attic.id);
      
      const command = createCommand(IFActions.CLIMBING);
      command.parsed.extras = { direction: 'down' };
      
      const context = createRealTestContext(climbingAction, world, command);
      
      const events = climbingAction.execute(context);
      
      expectEvent(events, 'if.event.climbed', {
        direction: 'down',
        method: 'directional',
        destinationId: groundFloor.id
      });
      
      expectEvent(events, 'action.success', {
        messageId: expect.stringContaining('climbed_down')
      });
    });

    test('should climb onto enterable supporter', () => {
      const { world, player, room } = setupBasicWorld();
      
      const tree = world.createEntity('oak tree', 'fixture');
      tree.add({
        type: TraitType.SUPPORTER,
        enterable: true
      });
      world.moveEntity(tree.id, room.id);
      
      const command = createCommand(IFActions.CLIMBING, {
        entity: tree
      });
      const context = createRealTestContext(climbingAction, world, command);
      
      const events = climbingAction.execute(context);
      
      // Should emit CLIMBED event
      expectEvent(events, 'if.event.climbed', {
        targetId: tree.id,
        method: 'onto'
      });
      
      // Should emit ENTERED event for climbing onto
      expectEvent(events, 'if.event.entered', {
        targetId: tree.id,
        method: 'climbing',
        preposition: 'onto'
      });
      
      // Should emit success message
      expectEvent(events, 'action.success', {
        messageId: expect.stringContaining('climbed_onto'),
        params: { object: 'oak tree' }
      });
    });

    test('should climb object with ENTRY trait', () => {
      const { world, player, room } = setupBasicWorld();
      
      const ladder = world.createEntity('wooden ladder', 'fixture');
      ladder.add({
        type: TraitType.ENTRY,
        canEnter: true,
        preposition: 'on'
      });
      world.moveEntity(ladder.id, room.id);
      
      const command = createCommand(IFActions.CLIMBING, {
        entity: ladder
      });
      const context = createRealTestContext(climbingAction, world, command);
      
      const events = climbingAction.execute(context);
      
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
      
      const room1 = world.createEntity('Room', 'room');
      room1.add({
        type: TraitType.ROOM,
        exits: {
          up: { to: 'room2' }
        }
      });
      
      const room2 = world.createEntity('Upper Room', 'room');
      room2.add({ type: TraitType.ROOM });
      
      // Update exit to use actual ID
      const roomTrait = room1.getTrait(TraitType.ROOM) as any;
      roomTrait.exits.up.to = room2.id;
      
      const player = world.createEntity('yourself', 'actor');
      player.add({ type: TraitType.ACTOR, isPlayer: true });
      world.setPlayer(player.id);
      world.moveEntity(player.id, room1.id);
      
      const command = createCommand(IFActions.CLIMBING);
      command.parsed.extras = { direction: 'UP' }; // Uppercase
      
      const context = createRealTestContext(climbingAction, world, command);
      
      const events = climbingAction.execute(context);
      
      expectEvent(events, 'if.event.climbed', {
        direction: 'up' // Normalized to lowercase
      });
    });
  });

  describe('Event Structure Validation', () => {
    test('should include proper entities in all events', () => {
      const { world, player, room } = setupBasicWorld();
      
      const platform = world.createEntity('platform', 'supporter');
      platform.add({
        type: TraitType.SUPPORTER,
        enterable: true
      });
      world.moveEntity(platform.id, room.id);
      
      const command = createCommand(IFActions.CLIMBING, {
        entity: platform
      });
      const context = createRealTestContext(climbingAction, world, command);
      
      const events = climbingAction.execute(context);
      
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

describe('Testing Pattern Examples for Climbing', () => {
  test('pattern: multi-level climbing', () => {
    const world = new WorldModel();
    
    // Test climbing through multiple levels
    const levels = [
      { id: 'basement', name: 'Basement', exits: { up: { to: 'ground' } } },
      { id: 'ground', name: 'Ground Floor', exits: { up: { to: 'first' }, down: { to: 'basement' } } },
      { id: 'first', name: 'First Floor', exits: { up: { to: 'attic' }, down: { to: 'ground' } } },
      { id: 'attic', name: 'Attic', exits: { down: { to: 'first' } } }
    ];
    
    const rooms = levels.map(level => {
      const room = world.createEntity(level.name, 'room');
      room.add({
        type: TraitType.ROOM,
        exits: level.exits
      });
      return { room, id: level.id };
    });
    
    // Verify climbing paths
    const groundRoom = rooms[1].room.getTrait(TraitType.ROOM) as any;
    expect(groundRoom.exits).toHaveProperty('up');
    expect(groundRoom.exits).toHaveProperty('down');
  });

  test('pattern: climbable objects vs movement', () => {
    const world = new WorldModel();
    
    // Shows difference between climbing onto objects vs climbing directions
    const climbableObjects = [
      {
        name: 'rope',
        traits: {
          [TraitType.ENTRY]: {
            type: TraitType.ENTRY,
            canEnter: true,
            preposition: 'on',
            posture: 'hanging'
          }
        },
        expectedMethod: 'onto'
      },
      {
        name: 'rock face',
        traits: {
          [TraitType.SUPPORTER]: {
            type: TraitType.SUPPORTER,
            enterable: true
          }
        },
        expectedMethod: 'onto'
      }
    ];
    
    climbableObjects.forEach(({ name, traits, expectedMethod }) => {
      const obj = world.createEntity(name, 'fixture');
      for (const [traitType, traitData] of Object.entries(traits)) {
        obj.add(traitData);
      }
      
      // Verify climbable
      const isClimbable = obj.hasTrait(TraitType.ENTRY) || 
                         (obj.hasTrait(TraitType.SUPPORTER) && (obj.getTrait(TraitType.SUPPORTER) as any).enterable);
      expect(isClimbable).toBe(true);
    });
  });
});
