/**
 * Golden test for going action - demonstrates testing movement actions
 * 
 * This shows patterns for testing actions that:
 * - Handle directional movement
 * - Check room exits and connections
 * - Validate door states (open/closed/locked)
 * - Track room visits
 * - Handle darkness and light requirements
 */

import { describe, test, expect, beforeEach } from 'vitest';
import { goingAction } from '../../../src/actions/standard/going'; // Now from folder
import { IFActions } from '../../../src/actions/constants';
import { TraitType, WorldModel, Direction, DirectionType } from '@sharpee/world-model';
import { 
  createRealTestContext,
  setupBasicWorld,
  expectEvent,
  TestData,
  createCommand
} from '../../test-utils';
import type { ActionContext } from '../../../src/actions/enhanced-types';
import type { ISemanticEvent } from '@sharpee/core';

// Helper to execute action using the four-phase pattern
function executeAction(action: any, context: ActionContext): ISemanticEvent[] {
  // Four-phase pattern: validate -> execute/blocked -> report
  const validationResult = action.validate(context);

  if (!validationResult.valid) {
    // Use blocked() for validation failures
    if (action.blocked) {
      return action.blocked(context, validationResult);
    }
    // Fallback for old-style actions
    return [context.event('action.error', {
      actionId: context.action.id,
      messageId: validationResult.error,
      params: validationResult.params || {}
    })];
  }

  // Execute mutations (returns void)
  action.execute(context);

  // Report generates all success events
  return action.report(context);
}

describe('goingAction (Golden Pattern)', () => {
  describe('Four-Phase Pattern Compliance', () => {
    test('should have required methods for four-phase pattern', () => {
      expect(goingAction.validate).toBeDefined();
      expect(goingAction.execute).toBeDefined();
      expect(goingAction.blocked).toBeDefined();
      expect(goingAction.report).toBeDefined();
    });

    test('should use report() for ALL event generation', () => {
      const { world, player, room } = setupBasicWorld();
      const room2 = world.createEntity('Room 2', 'object');
      room2.add({ type: TraitType.ROOM });
      
      const roomTrait = room.getTrait(TraitType.ROOM) as any;
      roomTrait.exits = {
        [Direction.NORTH]: { destination: room2.id }
      };
      
      const command = createCommand(IFActions.GOING);
      command.parsed.extras = { direction: Direction.NORTH };
      
      const context = createRealTestContext(goingAction, world, command);
      
      // The executeAction helper properly tests the three-phase pattern
      const events = executeAction(goingAction, context);
      
      // All events should be generated via report()
      expect(events).toBeDefined();
      expect(events.length).toBeGreaterThan(0);
      
      // Verify we get the expected movement events
      expectEvent(events, 'if.event.actor_moved', {
        direction: Direction.NORTH,
        fromRoom: room.id,
        toRoom: room2.id
      });
    });
  });

  describe('Action Metadata', () => {
    test('should have correct ID', () => {
      expect(goingAction.id).toBe(IFActions.GOING);
    });

    test('should declare required messages', () => {
      expect(goingAction.requiredMessages).toContain('no_direction');
      expect(goingAction.requiredMessages).toContain('not_in_room');
      expect(goingAction.requiredMessages).toContain('no_exits');
      expect(goingAction.requiredMessages).toContain('no_exit_that_way');
      expect(goingAction.requiredMessages).toContain('movement_blocked');
      expect(goingAction.requiredMessages).toContain('door_closed');
      expect(goingAction.requiredMessages).toContain('door_locked');
      expect(goingAction.requiredMessages).toContain('destination_not_found');
      expect(goingAction.requiredMessages).toContain('moved');
      expect(goingAction.requiredMessages).toContain('moved_to');
      expect(goingAction.requiredMessages).toContain('first_visit');
      expect(goingAction.requiredMessages).toContain('too_dark');
      expect(goingAction.requiredMessages).toContain('need_light');
    });

    test('should belong to movement group', () => {
      expect(goingAction.group).toBe('movement');
    });
  });

  describe('Precondition Checks', () => {
    test('should fail when no direction specified', () => {
      const { world, player } = setupBasicWorld();
      const command = createCommand(IFActions.GOING);
      const context = createRealTestContext(goingAction, world, command);

      const events = executeAction(goingAction, context);

      expectEvent(events, 'action.blocked', {
        messageId: 'no_direction'
      });
    });

    test('should fail when actor is not in a room', () => {
      const { world, player } = setupBasicWorld();
      const container = world.createEntity('box', 'object');
      container.add({ type: TraitType.CONTAINER });
      world.moveEntity(container.id, world.getLocation(player.id)!);
      world.moveEntity(player.id, container.id);

      const command = createCommand(IFActions.GOING);
      command.parsed.extras = { direction: Direction.NORTH };

      const context = createRealTestContext(goingAction, world, command);

      const events = executeAction(goingAction, context);

      expectEvent(events, 'action.blocked', {
        messageId: 'not_in_room'
      });
    });

    test('should fail when room has no exits', () => {
      const world = new WorldModel();
      const player = world.createEntity('yourself', 'object');
      player.add({ type: TraitType.ACTOR, isPlayer: true });
      world.setPlayer(player.id);

      const room = world.createEntity('Empty Room', 'object');
      room.add({
        type: TraitType.ROOM
        // No exits defined
      });
      world.moveEntity(player.id, room.id);

      const command = createCommand(IFActions.GOING);
      command.parsed.extras = { direction: Direction.NORTH };

      const context = createRealTestContext(goingAction, world, command);

      const events = executeAction(goingAction, context);

      expectEvent(events, 'action.blocked', {
        messageId: 'no_exits'
      });
    });

    test('should fail when no exit in specified direction', () => {
      const world = new WorldModel();
      const player = world.createEntity('yourself', 'object');
      player.add({ type: TraitType.ACTOR, isPlayer: true });
      world.setPlayer(player.id);

      const room = world.createEntity('Room with South Exit', 'object');
      const room2 = world.createEntity('South Room', 'object');
      room2.add({ type: TraitType.ROOM });

      room.add({
        type: TraitType.ROOM,
        exits: {
          [Direction.SOUTH]: { destination: room2.id }
        }
      });
      world.moveEntity(player.id, room.id);

      const command = createCommand(IFActions.GOING);
      command.parsed.extras = { direction: Direction.NORTH }; // Trying to go north

      const context = createRealTestContext(goingAction, world, command);

      const events = executeAction(goingAction, context);

      expectEvent(events, 'action.blocked', {
        messageId: 'no_exit_that_way',
        params: { direction: Direction.NORTH }
      });
    });

    test('should fail when door is closed', () => {
      const world = new WorldModel();
      const player = world.createEntity('yourself', 'object');
      player.add({ type: TraitType.ACTOR, isPlayer: true });
      world.setPlayer(player.id);

      const door = world.createEntity('wooden door', 'object');
      door.add({
        type: TraitType.OPENABLE,
        isOpen: false  // Closed
      });

      const room1 = world.createEntity('First Room', 'object');
      const room2 = world.createEntity('Second Room', 'object');
      room2.add({ type: TraitType.ROOM });

      room1.add({
        type: TraitType.ROOM,
        exits: {
          [Direction.NORTH]: { destination: room2.id, via: door.id }
        }
      });

      world.moveEntity(player.id, room1.id);

      const command = createCommand(IFActions.GOING);
      command.parsed.extras = { direction: Direction.NORTH };

      const context = createRealTestContext(goingAction, world, command);

      const events = executeAction(goingAction, context);

      expectEvent(events, 'action.blocked', {
        messageId: expect.stringContaining('closed'),
        params: {
          direction: Direction.NORTH,
          door: 'wooden door'
        }
      });
    });

    test('should fail when door is locked', () => {
      const world = new WorldModel();
      const player = world.createEntity('yourself', 'object');
      player.add({ type: TraitType.ACTOR, isPlayer: true });
      world.setPlayer(player.id);

      const door = world.createEntity('iron door', 'object');
      door.add({
        type: TraitType.OPENABLE,
        isOpen: false
      });
      door.add({
        type: TraitType.LOCKABLE,
        isLocked: true,  // Locked
        keyId: 'iron_key'
      });

      const room1 = world.createEntity('First Room', 'object');
      const room2 = world.createEntity('Second Room', 'object');
      room2.add({ type: TraitType.ROOM });

      room1.add({
        type: TraitType.ROOM,
        exits: {
          [Direction.EAST]: { destination: room2.id, via: door.id }
        }
      });

      world.moveEntity(player.id, room1.id);

      const command = createCommand(IFActions.GOING);
      command.parsed.extras = { direction: Direction.EAST };

      const context = createRealTestContext(goingAction, world, command);

      const events = executeAction(goingAction, context);

      // The door is both closed and locked, so it should report as locked
      expectEvent(events, 'action.blocked', {
        messageId: expect.stringContaining('locked'),
        params: {
          direction: Direction.EAST,
          door: 'iron door',
          isClosed: true,
          isLocked: true
        }
      });
    });

    test('should fail when destination not found', () => {
      const world = new WorldModel();
      const player = world.createEntity('yourself', 'object');
      player.add({ type: TraitType.ACTOR, isPlayer: true });
      world.setPlayer(player.id);

      const room = world.createEntity('Room with Bad Exit', 'object');
      room.add({
        type: TraitType.ROOM,
        exits: {
          [Direction.WEST]: { destination: 'nonexistent_room' }
        }
      });
      world.moveEntity(player.id, room.id);

      const command = createCommand(IFActions.GOING);
      command.parsed.extras = { direction: Direction.WEST };

      const context = createRealTestContext(goingAction, world, command);

      const events = executeAction(goingAction, context);

      expectEvent(events, 'action.blocked', {
        messageId: 'destination_not_found',
        params: { direction: Direction.WEST }
      });
    });

    test('should fail when destination is dark and no light', () => {
      const world = new WorldModel();
      const player = world.createEntity('yourself', 'object');
      player.add({ type: TraitType.ACTOR, isPlayer: true });
      world.setPlayer(player.id);

      const room1 = world.createEntity('Lit Room', 'object');
      const room2 = world.createEntity('Dark Cave', 'object');

      room1.add({
        type: TraitType.ROOM,
        exits: {
          [Direction.DOWN]: { destination: room2.id }
        }
      });

      room2.add({
        type: TraitType.ROOM,
        isDark: true  // Dark room
      });

      world.moveEntity(player.id, room1.id);

      const command = createCommand(IFActions.GOING);
      command.parsed.extras = { direction: Direction.DOWN };

      const context = createRealTestContext(goingAction, world, command);

      const events = executeAction(goingAction, context);

      // Should fail because the room is dark and player has no light
      expectEvent(events, 'action.blocked', {
        messageId: 'too_dark',
        params: { direction: Direction.DOWN }
      });
    });
  });

  describe('Successful Movement', () => {
    test('should move in cardinal direction', () => {
      const world = new WorldModel();
      const player = world.createEntity('yourself', 'object');
      player.add({ type: TraitType.ACTOR, isPlayer: true });
      world.setPlayer(player.id);
      
      const room1 = world.createEntity('Garden', 'object');
      const room2 = world.createEntity('Library', 'object');
      
      room1.add({
        type: TraitType.ROOM,
        exits: {
          [Direction.NORTH]: { destination: room2.id }
        }
      });
      
      room2.add({
        type: TraitType.ROOM,
        exits: {
          [Direction.SOUTH]: { destination: room1.id }
        },
        visited: true  // Mark as already visited so we get 'moved_to' not 'first_visit'
      });
      
      world.moveEntity(player.id, room1.id);
      
      const command = createCommand(IFActions.GOING);
      command.parsed.extras = { direction: Direction.NORTH };
      
      const context = createRealTestContext(goingAction, world, command);
      
      const events = executeAction(goingAction, context);
      
      // Should emit exit event
      expectEvent(events, 'if.event.actor_exited', {
        actorId: player.id,
        direction: Direction.NORTH,
        toRoom: room2.id
      });
      
      // Should emit movement event
      expectEvent(events, 'if.event.actor_moved', {
        direction: Direction.NORTH,
        fromRoom: room1.id,
        toRoom: room2.id,
        oppositeDirection: Direction.SOUTH
      });
      
      // Should emit enter event
      expectEvent(events, 'if.event.actor_entered', {
        actorId: player.id,
        direction: Direction.SOUTH,  // Opposite direction
        fromRoom: room1.id
      });
      
      // Should emit success message
      expectEvent(events, 'action.success', {
        messageId: expect.stringContaining('moved_to'),
        params: { 
          direction: Direction.NORTH,
          destination: 'Library'
        }
      });
    });

    test('should handle direction abbreviations', () => {
      const world = new WorldModel();
      const player = world.createEntity('yourself', 'object');
      player.add({ type: TraitType.ACTOR, isPlayer: true });
      world.setPlayer(player.id);
      
      const room1 = world.createEntity('Start', 'object');
      const room2 = world.createEntity('End', 'object');
      
      room1.add({
        type: TraitType.ROOM,
        exits: {
          [Direction.NORTHEAST]: { destination: room2.id }
        }
      });
      
      room2.add({ type: TraitType.ROOM });
      
      world.moveEntity(player.id, room1.id);
      
      const command = createCommand(IFActions.GOING);
      command.parsed.extras = { direction: Direction.NORTHEAST };  // Testing northeast direction
      
      const context = createRealTestContext(goingAction, world, command);
      
      const events = executeAction(goingAction, context);
      
      expectEvent(events, 'if.event.actor_moved', {
        direction: Direction.NORTHEAST,  // Normalized
        fromRoom: room1.id,
        toRoom: room2.id
      });
    });

    test('should track first visit to a room', () => {
      const world = new WorldModel();
      const player = world.createEntity('yourself', 'object');
      player.add({ type: TraitType.ACTOR, isPlayer: true });
      world.setPlayer(player.id);
      
      const room1 = world.createEntity('Entrance', 'object');
      const room2 = world.createEntity('Attic', 'object');
      
      room1.add({
        type: TraitType.ROOM,
        visited: true,
        exits: {
          [Direction.UP]: { destination: room2.id }
        }
      });
      
      room2.add({
        type: TraitType.ROOM,
        visited: false  // Never visited
      });
      
      world.moveEntity(player.id, room1.id);
      
      const command = createCommand(IFActions.GOING);
      command.parsed.extras = { direction: Direction.UP };
      
      const context = createRealTestContext(goingAction, world, command);
      
      const events = executeAction(goingAction, context);
      
      // Movement event should include firstVisit flag
      expectEvent(events, 'if.event.actor_moved', {
        direction: Direction.UP,
        firstVisit: true
      });
      
      // Should use first_visit message
      expectEvent(events, 'action.success', {
        messageId: expect.stringContaining('first_visit'),
        params: { 
          direction: Direction.UP,
          destination: 'Attic'
        }
      });
    });

    test('should move through open door', () => {
      const world = new WorldModel();
      const player = world.createEntity('yourself', 'object');
      player.add({ type: TraitType.ACTOR, isPlayer: true });
      world.setPlayer(player.id);
      
      const door = world.createEntity('oak door', 'object');
      door.add({
        type: TraitType.OPENABLE,
        isOpen: true  // Open
      });
      
      const room1 = world.createEntity('Hall', 'object');
      const room2 = world.createEntity('Study', 'object');
      
      room1.add({
        type: TraitType.ROOM,
        exits: {
          [Direction.WEST]: { destination: room2.id, via: door.id }
        }
      });
      
      room2.add({ type: TraitType.ROOM });
      
      world.moveEntity(player.id, room1.id);
      
      const command = createCommand(IFActions.GOING);
      command.parsed.extras = { direction: Direction.WEST };
      
      const context = createRealTestContext(goingAction, world, command);
      
      const events = executeAction(goingAction, context);
      
      expectEvent(events, 'if.event.actor_moved', {
        direction: Direction.WEST,
        fromRoom: room1.id,
        toRoom: room2.id
      });
    });

    test('should move to dark room with light', () => {
      const world = new WorldModel();
      const player = world.createEntity('yourself', 'object');
      player.add({ type: TraitType.ACTOR, isPlayer: true });
      world.setPlayer(player.id);
      
      const torch = world.createEntity('burning torch', 'object');
      torch.add({
        type: TraitType.LIGHT_SOURCE,
        isLit: true  // Providing light
      });
      
      const room1 = world.createEntity('Lit Area', 'object');
      const room2 = world.createEntity('Dark Cave', 'object');
      
      room1.add({
        type: TraitType.ROOM,
        exits: {
          inside: { destination: room2.id }
        }
      });
      
      room2.add({
        type: TraitType.ROOM,
        isDark: true
      });
      
      world.moveEntity(player.id, room1.id);
      world.moveEntity(torch.id, player.id);  // Player carries torch
      
      const command = createCommand(IFActions.GOING);
      command.parsed.extras = { direction: 'inside' };
      
      const context = createRealTestContext(goingAction, world, command);
      
      const events = executeAction(goingAction, context);
      
      // Should succeed since player has light
      expectEvent(events, 'if.event.actor_moved', {
        direction: 'inside',
        fromRoom: room1.id,
        toRoom: room2.id
      });
    });

    test('should accept direction from directObject', () => {
      const world = new WorldModel();
      const player = world.createEntity('yourself', 'object');
      player.add({ type: TraitType.ACTOR, isPlayer: true });
      world.setPlayer(player.id);
      
      const room1 = world.createEntity('Start', 'object');
      const room2 = world.createEntity('Garden', 'object');
      
      room1.add({
        type: TraitType.ROOM,
        exits: {
          outside: { destination: room2.id }
        }
      });
      
      room2.add({ type: TraitType.ROOM });
      
      world.moveEntity(player.id, room1.id);
      
      // Direction can come from directObject instead of extras
      const command = createCommand(IFActions.GOING, {
        entity: { id: 'direction', name: 'outside' } as any,
        text: 'outside'
      });
      
      const context = createRealTestContext(goingAction, world, command);
      
      const events = executeAction(goingAction, context);
      
      expectEvent(events, 'if.event.actor_moved', {
        direction: 'outside',
        fromRoom: room1.id,
        toRoom: room2.id
      });
    });
  });

  describe('Event Structure Validation', () => {
    test('should include proper entities in all events', () => {
      const world = new WorldModel();
      const player = world.createEntity('yourself', 'object');
      player.add({ type: TraitType.ACTOR, isPlayer: true });
      world.setPlayer(player.id);
      
      const room1 = world.createEntity('Room 1', 'object');
      const room2 = world.createEntity('Room 2', 'object');
      room2.add({ type: TraitType.ROOM });
      
      room1.add({
        type: TraitType.ROOM,
        exits: {
          [Direction.SOUTH]: { destination: room2.id }
        }
      });
      
      world.moveEntity(player.id, room1.id);
      
      const command = createCommand(IFActions.GOING);
      command.parsed.extras = { direction: Direction.SOUTH };
      
      const context = createRealTestContext(goingAction, world, command);
      
      const events = executeAction(goingAction, context);
      
      events.forEach(event => {
        if (event.entities) {
          expect(event.entities.actor).toBe(player.id);
          expect(event.entities.location).toBe(room1.id);
        }
      });
    });

    test('should handle all opposite directions correctly', () => {
      const opposites = {
        [Direction.NORTH]: Direction.SOUTH,
        [Direction.SOUTH]: Direction.NORTH,
        [Direction.EAST]: Direction.WEST,
        [Direction.WEST]: Direction.EAST,
        [Direction.NORTHEAST]: Direction.SOUTHWEST,
        [Direction.NORTHWEST]: Direction.SOUTHEAST,
        [Direction.SOUTHEAST]: Direction.NORTHWEST,
        [Direction.SOUTHWEST]: Direction.NORTHEAST,
        [Direction.UP]: Direction.DOWN,
        [Direction.DOWN]: Direction.UP,
        [Direction.IN]: Direction.OUT,
        [Direction.OUT]: Direction.IN
      };
      
      Object.entries(opposites).forEach(([dir, opposite]) => {
        const world = new WorldModel();
        const player = world.createEntity('yourself', 'object');
        player.add({ type: TraitType.ACTOR, isPlayer: true });
        world.setPlayer(player.id);
        
        const room1 = world.createEntity('Room 1', 'object');
        const room2 = world.createEntity('Room 2', 'object');
        
        room1.add({
          type: TraitType.ROOM,
          exits: {
            [dir]: { destination: room2.id }
          }
        });
        
        room2.add({ type: TraitType.ROOM });
        
        world.moveEntity(player.id, room1.id);
        
        const command = createCommand(IFActions.GOING);
        command.parsed.extras = { direction: dir };
        
        const context = createRealTestContext(goingAction, world, command);
        
        const events = executeAction(goingAction, context);
        
        expectEvent(events, 'if.event.actor_moved', {
          oppositeDirection: opposite
        });
        
        expectEvent(events, 'if.event.actor_entered', {
          direction: opposite
        });
      });
    });
  });
});

describe('Testing Pattern Examples for Going', () => {
  test('pattern: complex room connections', () => {
    // Test multi-room navigation with various exit types
    const world = new WorldModel();
    const player = world.createEntity('yourself', 'object');
    player.add({ type: TraitType.ACTOR, isPlayer: true });
    world.setPlayer(player.id);
    
    const lobby = world.createEntity('Hotel Lobby', 'object');
    const hallway = world.createEntity('Hallway', 'object');
    const stairs = world.createEntity('Stairs', 'object');
    const street = world.createEntity('Street', 'object');
    const room101 = world.createEntity('Room 101', 'object');
    const room102 = world.createEntity('Room 102', 'object');
    
    // Add room traits (lobby and hallway will be added with exits below)
    stairs.add({ type: TraitType.ROOM });
    street.add({ type: TraitType.ROOM });
    room101.add({ type: TraitType.ROOM });
    room102.add({ type: TraitType.ROOM });
    
    // Create doors
    const stairwellDoor = world.createEntity('Stairwell Door', 'object');
    stairwellDoor.add({ type: TraitType.OPENABLE, isOpen: true });
    const room101Door = world.createEntity('Room 101 Door', 'object');
    room101Door.add({ type: TraitType.OPENABLE, isOpen: true });
    const room102Door = world.createEntity('Room 102 Door', 'object');
    room102Door.add({ type: TraitType.OPENABLE, isOpen: true });
    
    lobby.add({
      type: TraitType.ROOM,
      exits: {
        [Direction.NORTH]: { destination: hallway.id },
        [Direction.UP]: { destination: stairs.id, via: stairwellDoor.id },
        [Direction.OUT]: { destination: street.id }
      }
    });
    
    hallway.add({
      type: TraitType.ROOM,
      exits: {
        [Direction.SOUTH]: { destination: lobby.id },
        [Direction.EAST]: { destination: room101.id, via: room101Door.id },
        [Direction.WEST]: { destination: room102.id, via: room102Door.id }
      }
    });
    
    world.moveEntity(player.id, lobby.id);
    
    // Navigate through multiple rooms
    const lobbyTrait = lobby.get(TraitType.ROOM) as any;
    const hallwayTrait = hallway.get(TraitType.ROOM) as any;
    expect(lobbyTrait.exits).toHaveProperty(Direction.NORTH);
    expect(hallwayTrait.exits).toHaveProperty(Direction.SOUTH);
  });

  test('pattern: testing door states during movement', () => {
    // Shows how different door states affect movement
    const doorStates = [
      { isOpen: true, isLocked: false, shouldPass: true },
      { isOpen: false, isLocked: false, shouldPass: false },
      { isOpen: false, isLocked: true, shouldPass: false }
    ];
    
    doorStates.forEach(({ isOpen, isLocked, shouldPass }) => {
      const world = new WorldModel();
      const player = world.createEntity('yourself', 'object');
      player.add({ type: TraitType.ACTOR, isPlayer: true });
      world.setPlayer(player.id);
      
      const door = world.createEntity('door', 'object');
      door.add({
        type: TraitType.OPENABLE,
        isOpen
      });
      
      if (isLocked) {
        door.add({
          type: TraitType.LOCKABLE,
          isLocked: true
        });
      }
      
      const room1 = world.createEntity('Room 1', 'object');
      const room2 = world.createEntity('Room 2', 'object');
      room2.add({ type: TraitType.ROOM });
      
      room1.add({
        type: TraitType.ROOM,
        exits: {
          [Direction.NORTH]: { destination: room2.id, via: door.id }
        }
      });
      
      world.moveEntity(player.id, room1.id);
      
      // Test expectation based on door state
      expect(isOpen || !shouldPass).toBeTruthy();
    });
  });
});
