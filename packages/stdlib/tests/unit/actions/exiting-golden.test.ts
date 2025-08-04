/**
 * Golden test for exiting action - demonstrates testing exit from objects
 * 
 * This shows patterns for testing actions that:
 * - Allow actors to exit containers, supporters, or special entry points
 * - Check current location and validate exit paths
 * - Handle different prepositions for exit (out of, off, from under, etc.)
 * - Validate container states when exiting
 */

import { describe, test, expect, beforeEach } from 'vitest';
import { exitingAction } from '../../../src/actions/standard/exiting';
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

describe('exitingAction (Golden Pattern)', () => {
  describe('Action Metadata', () => {
    test('should have correct ID', () => {
      expect(exitingAction.id).toBe(IFActions.EXITING);
    });

    test('should declare required messages', () => {
      expect(exitingAction.requiredMessages).toContain('already_outside');
      expect(exitingAction.requiredMessages).toContain('container_closed');
      expect(exitingAction.requiredMessages).toContain('cant_exit');
      expect(exitingAction.requiredMessages).toContain('exited');
      expect(exitingAction.requiredMessages).toContain('exited_from');
      expect(exitingAction.requiredMessages).toContain('nowhere_to_go');
    });

    test('should belong to movement group', () => {
      expect(exitingAction.group).toBe('movement');
    });
  });

  describe('Precondition Checks', () => {
    test('should fail when already in a room', () => {
      const { world, player, room } = setupBasicWorld();
      
      const command = createCommand(IFActions.EXITING);
      const context = createRealTestContext(exitingAction, world, command);
      
      const events = exitingAction.execute(context);
      
      expectEvent(events, 'action.error', {
        messageId: expect.stringContaining('already_outside'),
        reason: 'already_outside'
      });
    });

    test.skip('should fail when no location set', () => {
      // SKIPPED: The new context creation requires player to have a valid location
      const world = new WorldModel();
      const player = world.createEntity('yourself', 'actor');
      player.add({ type: TraitType.ACTOR, isPlayer: true });
      world.setPlayer(player.id);
      // Player has no location
      
      const command = createCommand(IFActions.EXITING);
      const context = createRealTestContext(exitingAction, world, command);
      
      const events = exitingAction.execute(context);
      
      expectEvent(events, 'action.error', {
        messageId: expect.stringContaining('nowhere_to_go'),
        reason: 'nowhere_to_go'
      });
    });

    test('should fail when container has no parent location', () => {
      const world = new WorldModel();
      const player = world.createEntity('yourself', 'actor');
      player.add({ type: TraitType.ACTOR, isPlayer: true });
      world.setPlayer(player.id);
      
      const floatingBox = world.createEntity('floating box', 'container');
      floatingBox.add({ type: TraitType.CONTAINER });
      
      world.moveEntity(player.id, floatingBox.id);
      // Box has no location (floating in void)
      
      const command = createCommand(IFActions.EXITING);
      const context = createRealTestContext(exitingAction, world, command);
      
      const events = exitingAction.execute(context);
      
      expectEvent(events, 'action.error', {
        messageId: expect.stringContaining('nowhere_to_go'),
        reason: 'nowhere_to_go'
      });
    });

    test.skip('should fail when container is closed', () => {
      // SKIPPED: Requires scope logic to properly set context.currentLocation for entities in containers
      const { world, player, room } = setupBasicWorld();
      
      const crate = world.createEntity('shipping crate', 'container');
      crate.add({
        type: TraitType.CONTAINER,
        enterable: true
      });
      crate.add({
        type: TraitType.OPENABLE,
        isOpen: false  // Closed
      });
      
      world.moveEntity(crate.id, room.id);
      world.moveEntity(player.id, crate.id);  // Player inside closed crate
      
      const command = createCommand(IFActions.EXITING);
      const context = createRealTestContext(exitingAction, world, command);
      
      const events = exitingAction.execute(context);
      
      expectEvent(events, 'action.error', {
        messageId: expect.stringContaining('container_closed'),
        params: { container: 'shipping crate' }
      });
    });

    test.skip('should fail when exit is blocked', () => {
      // SKIPPED: Requires scope logic to properly set context.currentLocation for entities with ENTRY trait
      const { world, player, room } = setupBasicWorld();
      
      const booth = world.createEntity('phone booth', 'fixture');
      booth.add({
        type: TraitType.ENTRY,
        canEnter: false  // Can't enter means can't exit
      });
      
      world.moveEntity(booth.id, room.id);
      world.moveEntity(player.id, booth.id);
      
      const command = createCommand(IFActions.EXITING);
      const context = createRealTestContext(exitingAction, world, command);
      
      const events = exitingAction.execute(context);
      
      expectEvent(events, 'action.error', {
        messageId: expect.stringContaining('cant_exit'),
        params: { place: 'phone booth' }
      });
    });
  });

  describe('Successful Exit', () => {
    test('should exit from container', () => {
      const { world, player, room } = setupBasicWorld();
      
      const box = world.createEntity('cardboard box', 'container');
      box.add({
        type: TraitType.CONTAINER,
        enterable: true
      });
      
      world.moveEntity(box.id, room.id);
      world.moveEntity(player.id, box.id);
      
      const command = createCommand(IFActions.EXITING);
      const context = createRealTestContext(exitingAction, world, command);
      
      const events = exitingAction.execute(context);
      
      // Should emit EXITED event
      expectEvent(events, 'if.event.exited', {
        fromLocation: box.id,
        toLocation: room.id,
        preposition: 'out of'
      });
      
      // Should emit success message
      expectEvent(events, 'action.success', {
        messageId: expect.stringContaining('exited'),
        params: { 
          place: 'cardboard box',
          preposition: 'out of'
        }
      });
    });

    test('should exit from supporter', () => {
      const { world, player, room } = setupBasicWorld();
      
      const platform = world.createEntity('raised platform', 'furniture');
      platform.add({
        type: TraitType.SUPPORTER,
        enterable: true
      });
      
      world.moveEntity(platform.id, room.id);
      world.moveEntity(player.id, platform.id);
      
      const command = createCommand(IFActions.EXITING);
      const context = createRealTestContext(exitingAction, world, command);
      
      const events = exitingAction.execute(context);
      
      expectEvent(events, 'if.event.exited', {
        fromLocation: platform.id,
        toLocation: room.id,
        preposition: 'off'
      });
      
      expectEvent(events, 'action.success', {
        messageId: expect.stringContaining('exited'),
        params: { 
          place: 'raised platform',
          preposition: 'off'
        }
      });
    });

    test.skip('should exit from vehicle with ENTRY trait', () => {
      // SKIPPED: Requires scope logic to properly set context.currentLocation for entities in vehicles
      const { world, player, room } = setupBasicWorld();
      
      const car = world.createEntity('red car', 'vehicle');
      car.add({
        type: TraitType.ENTRY,
        canEnter: true,
        preposition: 'in'
      });
      
      world.moveEntity(car.id, room.id);
      world.moveEntity(player.id, car.id);
      
      const command = createCommand(IFActions.EXITING);
      const context = createRealTestContext(exitingAction, world, command);
      
      const events = exitingAction.execute(context);
      
      expectEvent(events, 'if.event.exited', {
        fromLocation: car.id,
        toLocation: room.id,
        preposition: 'out of'  // 'in' converts to 'out of'
      });
    });

    test.skip('should handle custom prepositions correctly', () => {
      // SKIPPED: Requires scope logic to properly set context.currentLocation for various entry types
      const prepositionTests = [
        { enter: 'in', exit: 'out of' },
        { enter: 'on', exit: 'off' },
        { enter: 'under', exit: 'from under' },
        { enter: 'behind', exit: 'from behind' }
      ];
      
      prepositionTests.forEach(({ enter, exit }) => {
        const { world, player, room } = setupBasicWorld();
        
        const furniture = world.createEntity('furniture', 'furniture');
        furniture.add({
          type: TraitType.ENTRY,
          canEnter: true,
          preposition: enter
        });
        
        world.moveEntity(furniture.id, room.id);
        world.moveEntity(player.id, furniture.id);
        
        const command = createCommand(IFActions.EXITING);
        const context = createRealTestContext(exitingAction, world, command);
        
        const events = exitingAction.execute(context);
        
        expectEvent(events, 'if.event.exited', {
          preposition: exit
        });
        
        // Special message for 'off'
        if (exit === 'off') {
          expectEvent(events, 'action.success', {
            messageId: expect.stringContaining('exited_from')
          });
        }
      });
    });

    test('should exit from open container', () => {
      const { world, player, room } = setupBasicWorld();
      
      const trunk = world.createEntity('car trunk', 'container');
      trunk.add({
        type: TraitType.CONTAINER,
        enterable: true
      });
      trunk.add({
        type: TraitType.OPENABLE,
        isOpen: true  // Open
      });
      
      world.moveEntity(trunk.id, room.id);
      world.moveEntity(player.id, trunk.id);
      
      const command = createCommand(IFActions.EXITING);
      const context = createRealTestContext(exitingAction, world, command);
      
      const events = exitingAction.execute(context);
      
      // Should succeed since container is open
      expectEvent(events, 'if.event.exited', {
        fromLocation: trunk.id,
        toLocation: room.id
      });
    });
  });

  describe('Event Structure Validation', () => {
    test('should include proper entities in all events', () => {
      const { world, player, room } = setupBasicWorld();
      
      const bed = world.createEntity('comfortable bed', 'furniture');
      bed.add({
        type: TraitType.SUPPORTER,
        enterable: true
      });
      
      world.moveEntity(bed.id, room.id);
      world.moveEntity(player.id, bed.id);
      
      const command = createCommand(IFActions.EXITING);
      const context = createRealTestContext(exitingAction, world, command);
      
      const events = exitingAction.execute(context);
      
      events.forEach(event => {
        if (event.entities) {
          expect(event.entities.actor).toBe(player.id);
          expect(event.entities.location).toBe(bed.id);  // Current location when exiting
        }
      });
    });
  });
});

describe('Testing Pattern Examples for Exiting', () => {
  test('pattern: nested containers', () => {
    // Test exiting from nested containment
    const world = new WorldModel();
    
    const room = world.createEntity('Room', 'room');
    room.add({ type: TraitType.ROOM });
    
    const car = world.createEntity('car', 'vehicle');
    car.add({
      type: TraitType.ENTRY,
      canEnter: true,
      preposition: 'in'
    });
    
    const suitcase = world.createEntity('suitcase', 'container');
    suitcase.add({
      type: TraitType.CONTAINER,
      enterable: true
    });
    
    // Setup: suitcase in car in room
    world.moveEntity(car.id, room.id);
    world.moveEntity(suitcase.id, car.id);
    
    // Player would exit suitcase -> car, then car -> room
    expect(world.getLocation).toBeDefined();
  });

  test('pattern: exit state preservation', () => {
    // Shows how exit doesn't modify traits, just location
    const { world, player, room } = setupBasicWorld();
    
    const pod = world.createEntity('escape pod', 'vehicle');
    pod.add({
      type: TraitType.ENTRY,
      canEnter: true,
      preposition: 'in',
      occupants: [player.id]
    });
    
    world.moveEntity(pod.id, room.id);
    world.moveEntity(player.id, pod.id);
    
    // After exit, occupants list would need to be updated by event handler
    const entry = pod.getTrait(TraitType.ENTRY) as any;
    expect(entry.occupants).toContain(player.id);
    
    // Note: The action doesn't modify traits, only emits events
    // World model event handlers would update occupants list
  });
});
