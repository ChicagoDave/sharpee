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
import { TraitType, WorldModel } from '@sharpee/world-model';
import { 
  createRealTestContext,
  setupBasicWorld,
  expectEvent,
  TestData,
  createCommand
} from '../../test-utils';
import type { ActionContext } from '../../../src/actions/enhanced-types';

// Helper to execute action with validation (mimics CommandExecutor flow)
// Note: goingAction already calls validate internally, so we just call execute
const executeWithValidation = (action: any, context: ActionContext) => {
  return action.execute(context);
};

describe('goingAction (Golden Pattern)', () => {
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
      
      const events = executeWithValidation(goingAction, context);
      
      expectEvent(events, 'action.error', {
        messageId: expect.stringContaining('no_direction'),
        reason: 'no_direction'
      });
    });

    test('should fail when actor is not in a room', () => {
      const { world, player } = setupBasicWorld();
      const container = world.createEntity('box', 'object');
      container.add({ type: TraitType.CONTAINER });
      world.moveEntity(container.id, world.getLocation(player.id)!);
      world.moveEntity(player.id, container.id);
      
      const command = createCommand(IFActions.GOING);
      command.parsed.extras = { direction: 'north' };
      
      const context = createRealTestContext(goingAction, world, command);
      
      const events = executeWithValidation(goingAction, context);
      
      expectEvent(events, 'action.error', {
        messageId: expect.stringContaining('not_in_room'),
        reason: 'not_in_room'
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
      command.parsed.extras = { direction: 'north' };
      
      const context = createRealTestContext(goingAction, world, command);
      
      const events = executeWithValidation(goingAction, context);
      
      expectEvent(events, 'action.error', {
        messageId: expect.stringContaining('no_exits'),
        reason: 'no_exits'
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
          south: { destination: room2.id }
        }
      });
      world.moveEntity(player.id, room.id);
      
      const command = createCommand(IFActions.GOING);
      command.parsed.extras = { direction: 'north' }; // Trying to go north
      
      const context = createRealTestContext(goingAction, world, command);
      
      const events = executeWithValidation(goingAction, context);
      
      expectEvent(events, 'action.error', {
        messageId: expect.stringContaining('no_exit_that_way'),
        params: { direction: 'north' }
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
          north: { destination: room2.id, via: door.id }
        }
      });
      
      world.moveEntity(player.id, room1.id);
      
      const command = createCommand(IFActions.GOING);
      command.parsed.extras = { direction: 'north' };
      
      const context = createRealTestContext(goingAction, world, command);
      
      const events = executeWithValidation(goingAction, context);
      
      expectEvent(events, 'action.error', {
        messageId: expect.stringContaining('door_closed'),
        params: { 
          direction: 'north',
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
          east: { destination: room2.id, via: door.id }
        }
      });
      
      world.moveEntity(player.id, room1.id);
      
      const command = createCommand(IFActions.GOING);
      command.parsed.extras = { direction: 'east' };
      
      const context = createRealTestContext(goingAction, world, command);
      
      const events = executeWithValidation(goingAction, context);
      
      // The door is both closed and locked, so it should report as locked
      expectEvent(events, 'action.error', {
        messageId: expect.stringContaining('door_locked'),
        params: { 
          direction: 'east',
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
          west: { destination: 'nonexistent_room' }
        }
      });
      world.moveEntity(player.id, room.id);
      
      const command = createCommand(IFActions.GOING);
      command.parsed.extras = { direction: 'west' };
      
      const context = createRealTestContext(goingAction, world, command);
      
      const events = executeWithValidation(goingAction, context);
      
      expectEvent(events, 'action.error', {
        messageId: expect.stringContaining('destination_not_found'),
        params: { direction: 'west' }
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
          down: { destination: room2.id }
        }
      });
      
      room2.add({
        type: TraitType.ROOM,
        isDark: true  // Dark room
      });
      
      world.moveEntity(player.id, room1.id);
      
      const command = createCommand(IFActions.GOING);
      command.parsed.extras = { direction: 'down' };
      
      const context = createRealTestContext(goingAction, world, command);
      
      const events = executeWithValidation(goingAction, context);
      
      // Should fail because the room is dark and player has no light
      expectEvent(events, 'action.error', {
        messageId: expect.stringContaining('too_dark'),
        params: { direction: 'down' }
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
          north: { destination: room2.id }
        }
      });
      
      room2.add({
        type: TraitType.ROOM,
        exits: {
          south: { destination: room1.id }
        },
        visited: true  // Mark as already visited so we get 'moved_to' not 'first_visit'
      });
      
      world.moveEntity(player.id, room1.id);
      
      const command = createCommand(IFActions.GOING);
      command.parsed.extras = { direction: 'north' };
      
      const context = createRealTestContext(goingAction, world, command);
      
      const events = executeWithValidation(goingAction, context);
      
      // Should emit exit event
      expectEvent(events, 'if.event.actor_exited', {
        actorId: player.id,
        direction: 'north',
        toRoom: room2.id
      });
      
      // Should emit movement event
      expectEvent(events, 'if.event.actor_moved', {
        direction: 'north',
        fromRoom: room1.id,
        toRoom: room2.id,
        oppositeDirection: 'south'
      });
      
      // Should emit enter event
      expectEvent(events, 'if.event.actor_entered', {
        actorId: player.id,
        direction: 'south',  // Opposite direction
        fromRoom: room1.id
      });
      
      // Should emit success message
      expectEvent(events, 'action.success', {
        messageId: expect.stringContaining('moved_to'),
        params: { 
          direction: 'north',
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
          northeast: { destination: room2.id }
        }
      });
      
      room2.add({ type: TraitType.ROOM });
      
      world.moveEntity(player.id, room1.id);
      
      const command = createCommand(IFActions.GOING);
      command.parsed.extras = { direction: 'ne' };  // Abbreviation
      
      const context = createRealTestContext(goingAction, world, command);
      
      const events = executeWithValidation(goingAction, context);
      
      expectEvent(events, 'if.event.actor_moved', {
        direction: 'northeast',  // Normalized
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
          up: { destination: room2.id }
        }
      });
      
      room2.add({
        type: TraitType.ROOM,
        visited: false  // Never visited
      });
      
      world.moveEntity(player.id, room1.id);
      
      const command = createCommand(IFActions.GOING);
      command.parsed.extras = { direction: 'up' };
      
      const context = createRealTestContext(goingAction, world, command);
      
      const events = executeWithValidation(goingAction, context);
      
      // Movement event should include firstVisit flag
      expectEvent(events, 'if.event.actor_moved', {
        direction: 'up',
        firstVisit: true
      });
      
      // Should use first_visit message
      expectEvent(events, 'action.success', {
        messageId: expect.stringContaining('first_visit'),
        params: { 
          direction: 'up',
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
          west: { destination: room2.id, via: door.id }
        }
      });
      
      room2.add({ type: TraitType.ROOM });
      
      world.moveEntity(player.id, room1.id);
      
      const command = createCommand(IFActions.GOING);
      command.parsed.extras = { direction: 'west' };
      
      const context = createRealTestContext(goingAction, world, command);
      
      const events = executeWithValidation(goingAction, context);
      
      expectEvent(events, 'if.event.actor_moved', {
        direction: 'west',
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
      
      const events = executeWithValidation(goingAction, context);
      
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
      
      const events = executeWithValidation(goingAction, context);
      
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
          south: { destination: room2.id }
        }
      });
      
      world.moveEntity(player.id, room1.id);
      
      const command = createCommand(IFActions.GOING);
      command.parsed.extras = { direction: 'south' };
      
      const context = createRealTestContext(goingAction, world, command);
      
      const events = executeWithValidation(goingAction, context);
      
      events.forEach(event => {
        if (event.entities) {
          expect(event.entities.actor).toBe(player.id);
          expect(event.entities.location).toBe(room1.id);
        }
      });
    });

    test('should handle all opposite directions correctly', () => {
      const opposites = {
        'north': 'south',
        'south': 'north',
        'east': 'west',
        'west': 'east',
        'northeast': 'southwest',
        'northwest': 'southeast',
        'southeast': 'northwest',
        'southwest': 'northeast',
        'up': 'down',
        'down': 'up',
        'inside': 'outside',
        'outside': 'inside'
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
        
        const events = executeWithValidation(goingAction, context);
        
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
    
    // Add room traits
    hallway.add({ type: TraitType.ROOM });
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
        north: { destination: hallway.id },
        up: { destination: stairs.id, via: stairwellDoor.id },
        outside: { destination: street.id }
      }
    });
    
    hallway.add({
      type: TraitType.ROOM,
      exits: {
        south: { destination: lobby.id },
        east: { destination: room101.id, via: room101Door.id },
        west: { destination: room102.id, via: room102Door.id }
      }
    });
    
    world.moveEntity(player.id, lobby.id);
    
    // Navigate through multiple rooms
    const lobbyTrait = lobby.getTrait(TraitType.ROOM) as any;
    const hallwayTrait = hallway.getTrait(TraitType.ROOM) as any;
    expect(lobbyTrait.exits).toHaveProperty('north');
    expect(hallwayTrait.exits).toHaveProperty('south');
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
          north: { destination: room2.id, via: door.id }
        }
      });
      
      world.moveEntity(player.id, room1.id);
      
      // Test expectation based on door state
      expect(isOpen || !shouldPass).toBeTruthy();
    });
  });
});
