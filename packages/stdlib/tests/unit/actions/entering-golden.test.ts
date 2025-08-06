/**
 * Golden test for entering action - demonstrates testing entry into objects
 * 
 * This shows patterns for testing actions that:
 * - Allow actors to enter containers, supporters, or special entry points
 * - Check enterable traits and capacity
 * - Handle different prepositions (in, on, under, etc.)
 * - Validate container states (open/closed)
 */

import { describe, test, expect, beforeEach } from 'vitest';
import { enteringAction } from '../../../src/actions/standard/entering';
import { IFActions } from '../../../src/actions/constants';
import { TraitType, WorldModel, EntityType } from '@sharpee/world-model';
import { 
  createRealTestContext,
  setupBasicWorld,
  expectEvent,
  TestData,
  createCommand
} from '../../test-utils';
import type { ActionContext } from '../../../src/actions/enhanced-types';

describe('enteringAction (Golden Pattern)', () => {
  describe('Action Metadata', () => {
    test('should have correct ID', () => {
      expect(enteringAction.id).toBe(IFActions.ENTERING);
    });

    test('should declare required messages', () => {
      expect(enteringAction.requiredMessages).toContain('no_target');
      expect(enteringAction.requiredMessages).toContain('not_enterable');
      expect(enteringAction.requiredMessages).toContain('already_inside');
      expect(enteringAction.requiredMessages).toContain('container_closed');
      expect(enteringAction.requiredMessages).toContain('too_full');
      expect(enteringAction.requiredMessages).toContain('entered');
      expect(enteringAction.requiredMessages).toContain('entered_on');
      expect(enteringAction.requiredMessages).toContain('cant_enter');
    });

    test('should belong to movement group', () => {
      expect(enteringAction.group).toBe('movement');
    });
  });

  describe('Precondition Checks', () => {
    test('should fail when no target specified', () => {
      const { world, player } = setupBasicWorld();
      const command = createCommand(IFActions.ENTERING);
      const context = createRealTestContext(enteringAction, world, command);
      
      const events = enteringAction.execute(context);
      
      expectEvent(events, 'action.error', {
        messageId: expect.stringContaining('no_target'),
        reason: 'no_target'
      });
    });

    test('should fail when target is not enterable', () => {
      const { world, player, object } = TestData.withObject('red ball');
      // Ball has no entry, container, or supporter traits
      
      const command = createCommand(IFActions.ENTERING, {
        entity: object
      });
      const context = createRealTestContext(enteringAction, world, command);
      
      const events = enteringAction.execute(context);
      
      expectEvent(events, 'action.error', {
        messageId: expect.stringContaining('not_enterable'),
        params: { place: 'red ball' }
      });
    });

    test.skip('should fail when already inside target', () => {
      // SKIPPED: This test requires scope logic to properly track when player is inside a vehicle
      // Without scope logic, world.getLocation() returns undefined for entities in non-room containers
      const { world, player, room } = setupBasicWorld();
      
      const vehicle = world.createEntity('sports car', EntityType.OBJECT);
      vehicle.add({
        type: TraitType.ENTRY,
        canEnter: true,
        preposition: 'in'
      });
      world.moveEntity(vehicle.id, room.id);
      world.moveEntity(player.id, vehicle.id); // Already in car
      
      const command = createCommand(IFActions.ENTERING, {
        entity: vehicle
      });
      const context = createRealTestContext(enteringAction, world, command);
      
      const events = enteringAction.execute(context);
      
      expectEvent(events, 'action.error', {
        messageId: expect.stringContaining('already_inside'),
        params: { place: 'sports car' }
      });
    });

    test('should fail when entry is blocked', () => {
      const { world, player, room } = setupBasicWorld();
      
      const booth = world.createEntity('phone booth', EntityType.SCENERY);
      booth.add({
        type: TraitType.ENTRY,
        canEnter: false,  // Blocked
        blockedMessage: 'The door is jammed'
      });
      world.moveEntity(booth.id, room.id);
      
      const command = createCommand(IFActions.ENTERING, {
        entity: booth
      });
      const context = createRealTestContext(enteringAction, world, command);
      
      const events = enteringAction.execute(context);
      
      expectEvent(events, 'action.error', {
        messageId: expect.stringContaining('cant_enter'),
        params: { 
          place: 'phone booth',
          reason: 'The door is jammed'
        }
      });
    });

    test('should fail when container is closed', () => {
      const { world, player, room } = setupBasicWorld();
      
      const crate = world.createEntity('wooden crate', EntityType.CONTAINER);
      crate.add({
        type: TraitType.CONTAINER,
        enterable: true
      });
      crate.add({
        type: TraitType.OPENABLE,
        isOpen: false  // Closed
      });
      world.moveEntity(crate.id, room.id);
      
      const command = createCommand(IFActions.ENTERING, {
        entity: crate
      });
      const context = createRealTestContext(enteringAction, world, command);
      
      const events = enteringAction.execute(context);
      
      expectEvent(events, 'action.error', {
        messageId: expect.stringContaining('container_closed'),
        params: { container: 'wooden crate' }
      });
    });

    test('should fail when at maximum occupancy', () => {
      const { world, player, room } = setupBasicWorld();
      
      const elevator = world.createEntity('small elevator', EntityType.SCENERY);
      elevator.add({
        type: TraitType.ENTRY,
        canEnter: true,
        maxOccupants: 2,
        occupants: ['npc1', 'npc2']  // Already full
      });
      world.moveEntity(elevator.id, room.id);
      
      const command = createCommand(IFActions.ENTERING, {
        entity: elevator
      });
      const context = createRealTestContext(enteringAction, world, command);
      
      const events = enteringAction.execute(context);
      
      expectEvent(events, 'action.error', {
        messageId: expect.stringContaining('too_full'),
        params: { 
          place: 'small elevator',
          occupants: 2,
          max: 2
        }
      });
    });
  });

  describe('Successful Entry', () => {
    test('should enter object with ENTRY trait', () => {
      const { world, player, room } = setupBasicWorld();
      
      const car = world.createEntity('luxury car', EntityType.OBJECT);
      car.add({
        type: TraitType.ENTRY,
        canEnter: true,
        preposition: 'in',
        posture: 'sitting'
      });
      world.moveEntity(car.id, room.id);
      
      const command = createCommand(IFActions.ENTERING, {
        entity: car
      });
      const context = createRealTestContext(enteringAction, world, command);
      
      const events = enteringAction.execute(context);
      
      // Should emit ENTERED event
      expectEvent(events, 'if.event.entered', {
        targetId: car.id,
        fromLocation: room.id,
        preposition: 'in',
        posture: 'sitting'
      });
      
      // Should emit success message
      expectEvent(events, 'action.success', {
        messageId: expect.stringContaining('entered'),
        params: { 
          place: 'luxury car',
          preposition: 'in',
          posture: 'sitting'
        }
      });
    });

    test('should enter enterable container', () => {
      const { world, player, room } = setupBasicWorld();
      
      const box = world.createEntity('large box', 'container');
      box.add({
        type: TraitType.CONTAINER,
        enterable: true,
        capacity: 100
      });
      box.add({
        type: TraitType.OPENABLE,
        isOpen: true  // Open
      });
      world.moveEntity(box.id, room.id);
      
      const command = createCommand(IFActions.ENTERING, {
        entity: box
      });
      const context = createRealTestContext(enteringAction, world, command);
      
      const events = enteringAction.execute(context);
      
      expectEvent(events, 'if.event.entered', {
        targetId: box.id,
        fromLocation: room.id,
        preposition: 'in'
      });
      
      expectEvent(events, 'action.success', {
        messageId: expect.stringContaining('entered'),
        params: { 
          place: 'large box',
          preposition: 'in'
        }
      });
    });

    test('should enter enterable supporter', () => {
      const { world, player, room } = setupBasicWorld();
      
      const bed = world.createEntity('comfortable bed', 'supporter');
      bed.add({
        type: TraitType.SUPPORTER,
        enterable: true
      });
      world.moveEntity(bed.id, room.id);
      
      const command = createCommand(IFActions.ENTERING, {
        entity: bed
      });
      const context = createRealTestContext(enteringAction, world, command);
      
      const events = enteringAction.execute(context);
      
      expectEvent(events, 'if.event.entered', {
        targetId: bed.id,
        fromLocation: room.id,
        preposition: 'on'  // Supporters use 'on'
      });
      
      expectEvent(events, 'action.success', {
        messageId: expect.stringContaining('entered_on'),  // Different message for 'on'
        params: { 
          place: 'comfortable bed',
          preposition: 'on'
        }
      });
    });

    test('should check occupancy for containers with actors', () => {
      const { world, player, room } = setupBasicWorld();
      
      const npc = world.createEntity('guard', 'actor');
      npc.add({ type: TraitType.ACTOR });
      
      const booth = world.createEntity('guard booth', 'container');
      booth.add({
        type: TraitType.CONTAINER,
        enterable: true
      });
      
      world.moveEntity(booth.id, room.id);
      world.moveEntity(npc.id, booth.id);
      
      const command = createCommand(IFActions.ENTERING, {
        entity: booth
      });
      const context = createRealTestContext(enteringAction, world, command);
      
      const events = enteringAction.execute(context);
      
      // Should succeed - no max occupancy set
      expectEvent(events, 'if.event.entered', {
        targetId: booth.id
      });
    });

    test('should handle custom prepositions', () => {
      const { world, player, room } = setupBasicWorld();
      
      const desk = world.createEntity('wooden desk', EntityType.SUPPORTER);
      desk.add({
        type: TraitType.ENTRY,
        canEnter: true,
        preposition: 'under'  // Hide under the desk
      });
      world.moveEntity(desk.id, room.id);
      
      const command = createCommand(IFActions.ENTERING, {
        entity: desk
      });
      const context = createRealTestContext(enteringAction, world, command);
      
      const events = enteringAction.execute(context);
      
      expectEvent(events, 'if.event.entered', {
        targetId: desk.id,
        preposition: 'under'
      });
    });
  });

  describe('Event Structure Validation', () => {
    test('should include proper entities in all events', () => {
      const { world, player, room } = setupBasicWorld();
      
      const chair = world.createEntity('office chair', EntityType.SUPPORTER);
      chair.add({
        type: TraitType.SUPPORTER,
        enterable: true
      });
      world.moveEntity(chair.id, room.id);
      
      const command = createCommand(IFActions.ENTERING, {
        entity: chair
      });
      const context = createRealTestContext(enteringAction, world, command);
      
      const events = enteringAction.execute(context);
      
      events.forEach(event => {
        if (event.entities) {
          expect(event.entities.actor).toBe(player.id);
          expect(event.entities.target).toBe(chair.id);
          expect(event.entities.location).toBe(room.id);
        }
      });
    });
  });
});

describe('Testing Pattern Examples for Entering', () => {
  test('pattern: complex entry scenarios', () => {
    // Test various types of enterable objects
    const world = new WorldModel();
    const enterableObjects = [
      {
        name: 'taxi',
        traits: {
          [TraitType.ENTRY]: {
            type: TraitType.ENTRY,
            canEnter: true,
            preposition: 'in',
            posture: 'sitting',
            maxOccupants: 4
          }
        }
      },
      {
        name: 'swimming pool',
        traits: {
          [TraitType.ENTRY]: {
            type: TraitType.ENTRY,
            canEnter: true,
            preposition: 'in',
            posture: 'swimming'
          }
        }
      },
      {
        name: 'stage',
        traits: {
          [TraitType.SUPPORTER]: {
            type: TraitType.SUPPORTER,
            enterable: true
          }
        }
      }
    ];
    
    enterableObjects.forEach(({ name, traits }) => {
      const obj = world.createEntity(name, EntityType.SCENERY);
      for (const [traitType, traitData] of Object.entries(traits)) {
        obj.add(traitData);
      }
      
      // Verify enterable configuration
      if (obj.hasTrait(TraitType.ENTRY)) {
        const entry = obj.getTrait(TraitType.ENTRY) as any;
        expect(entry.canEnter).toBe(true);
      } else if (obj.hasTrait(TraitType.CONTAINER)) {
        const container = obj.getTrait(TraitType.CONTAINER) as any;
        expect(container.enterable).toBe(true);
      } else if (obj.hasTrait(TraitType.SUPPORTER)) {
        const supporter = obj.getTrait(TraitType.SUPPORTER) as any;
        expect(supporter.enterable).toBe(true);
      }
    });
  });

  test('pattern: testing occupancy management', () => {
    // Shows how to test occupancy tracking
    const { world, player, room } = setupBasicWorld();
    const actors = ['Person 1', 'Person 2', 'Person 3'].map(name => {
      const actor = world.createEntity(name, EntityType.ACTOR);
      actor.add({ type: TraitType.ACTOR });
      return actor;
    });
    
    const lifeboat = world.createEntity('lifeboat', EntityType.OBJECT);
    lifeboat.add({
      type: TraitType.ENTRY,
      canEnter: true,
      maxOccupants: 3,
      occupants: []
    });
    lifeboat.add({
      type: TraitType.CONTAINER,
      enterable: true
    });
    
    // Simulate filling the lifeboat
    const entry = lifeboat.getTrait(TraitType.ENTRY) as any;
    actors.forEach((actor, i) => {
      if (i < 3) {  // Max occupancy
        entry.occupants.push(actor.id);
      }
    });
    
    expect(entry.occupants.length).toBe(3);
    expect(entry.occupants.length).toBe(entry.maxOccupants);
  });
});
