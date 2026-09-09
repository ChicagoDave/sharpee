/**
 * Golden test for entering action - demonstrates testing entry into objects
 * 
 * This shows patterns for testing actions that:
 * - Allow actors to enter containers, supporters, or special entry points
 * - Check enterable traits and capacity
 * - Handle different prepositions (in, on, under, etc.)
 * - Validate container states (open/closed)
 */

import { describe, test, expect } from 'vitest';
import { enteringAction } from '../../../src/actions/standard/entering';
import { IFActions } from '../../../src/actions/constants';
import { TraitType, EntityType } from '@sharpee/world-model';
import {
  createRealTestContext,
  setupBasicWorld,
  expectEvent,
  executeWithValidation,
  TestData,
  createCommand
} from '../../test-utils';

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
      
      const events = executeWithValidation(enteringAction, context);

      expectEvent(events, 'if.event.entered', {
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

      const events = executeWithValidation(enteringAction, context);

      expectEvent(events, 'if.event.entered', {
        messageId: expect.stringContaining('not_enterable'),
        reason: 'not_enterable'
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
        type: TraitType.ENTERABLE,
        preposition: 'in'
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
      
      const events = executeWithValidation(enteringAction, context);
      
      expectEvent(events, 'if.event.entered', {
        messageId: expect.stringContaining('container_closed'),
        reason: 'container_closed'
      });
    });
  });

  describe('Successful Entry', () => {
    test('should enter enterable container (car)', () => {
      const { world, player, room } = setupBasicWorld();

      const car = world.createEntity('luxury car', EntityType.CONTAINER);
      car.add({
        type: TraitType.CONTAINER,
        enterable: true
      });
      car.add({
        type: TraitType.ENTERABLE,
        preposition: 'in'
      });
      world.moveEntity(car.id, room.id);
      
      const command = createCommand(IFActions.ENTERING, {
        entity: car
      });
      const context = createRealTestContext(enteringAction, world, command);
      
      const events = executeWithValidation(enteringAction, context);
      
      // Should emit ENTERED event with messageId for text rendering
      expectEvent(events, 'if.event.entered', {
        targetId: car.id,
        fromLocation: room.id,
        preposition: 'in',  // Containers use 'in'
        messageId: expect.stringContaining('entered')
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
        type: TraitType.ENTERABLE,
        preposition: 'in'
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
      
      const events = executeWithValidation(enteringAction, context);
      
      expectEvent(events, 'if.event.entered', {
        targetId: box.id,
        fromLocation: room.id,
        preposition: 'in',
        messageId: expect.stringContaining('entered')
      });
    });

    test('should enter enterable supporter', () => {
      const { world, player, room } = setupBasicWorld();

      const bed = world.createEntity('comfortable bed', 'supporter');
      bed.add({
        type: TraitType.SUPPORTER,
        enterable: true
      });
      bed.add({
        type: TraitType.ENTERABLE,
        preposition: 'on'
      });
      world.moveEntity(bed.id, room.id);
      
      const command = createCommand(IFActions.ENTERING, {
        entity: bed
      });
      const context = createRealTestContext(enteringAction, world, command);
      
      const events = executeWithValidation(enteringAction, context);
      
      expectEvent(events, 'if.event.entered', {
        targetId: bed.id,
        fromLocation: room.id,
        preposition: 'on',  // Supporters use 'on'
        messageId: expect.stringContaining('entered_on')  // Different message for 'on'
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
      booth.add({
        type: TraitType.ENTERABLE,
        preposition: 'in'
      });

      world.moveEntity(booth.id, room.id);
      world.moveEntity(npc.id, booth.id);
      
      const command = createCommand(IFActions.ENTERING, {
        entity: booth
      });
      const context = createRealTestContext(enteringAction, world, command);
      
      const events = executeWithValidation(enteringAction, context);
      
      // Should succeed - no max occupancy set
      expectEvent(events, 'if.event.entered', {
        targetId: booth.id
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
      chair.add({
        type: TraitType.ENTERABLE,
        preposition: 'on'
      });
      world.moveEntity(chair.id, room.id);
      
      const command = createCommand(IFActions.ENTERING, {
        entity: chair
      });
      const context = createRealTestContext(enteringAction, world, command);
      
      const events = executeWithValidation(enteringAction, context);
      
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

/**
 * World State Mutation Tests
 *
 * These tests verify that the entering action actually mutates world state,
 * not just emits events. This catches bugs like the "dropping bug" where
 * actions appeared to work (good messages) but didn't actually change state.
 */
describe('World State Mutations', () => {
  test('should actually move player into enterable container', () => {
    const { world, player, room } = setupBasicWorld();

    const car = world.createEntity('luxury car', EntityType.CONTAINER);
    car.add({
      type: TraitType.CONTAINER,
      enterable: true
    });
    car.add({
      type: TraitType.ENTERABLE,
      preposition: 'in'
    });
    world.moveEntity(car.id, room.id);

    // VERIFY PRECONDITION: player is in the room
    expect(world.getLocation(player.id)).toBe(room.id);

    const command = createCommand(IFActions.ENTERING, {
      entity: car
    });
    const context = createRealTestContext(enteringAction, world, command);

    const validation = enteringAction.validate(context);
    expect(validation.valid).toBe(true);
    enteringAction.execute(context);

    // VERIFY POSTCONDITION: player is now in the car
    expect(world.getLocation(player.id)).toBe(car.id);
  });

  test('should actually move player onto enterable supporter', () => {
    const { world, player, room } = setupBasicWorld();

    const bed = world.createEntity('comfortable bed', EntityType.SUPPORTER);
    bed.add({
      type: TraitType.SUPPORTER,
      enterable: true
    });
    bed.add({
      type: TraitType.ENTERABLE,
      preposition: 'on'
    });
    world.moveEntity(bed.id, room.id);

    // VERIFY PRECONDITION: player is in the room
    expect(world.getLocation(player.id)).toBe(room.id);

    const command = createCommand(IFActions.ENTERING, {
      entity: bed
    });
    const context = createRealTestContext(enteringAction, world, command);

    const validation = enteringAction.validate(context);
    expect(validation.valid).toBe(true);
    enteringAction.execute(context);

    // VERIFY POSTCONDITION: player is now on the bed
    expect(world.getLocation(player.id)).toBe(bed.id);
  });

  test('should NOT move player when target is not enterable', () => {
    const { world, player, room } = setupBasicWorld();

    const ball = world.createEntity('red ball', 'object');
    world.moveEntity(ball.id, room.id);

    // VERIFY PRECONDITION: player is in the room
    expect(world.getLocation(player.id)).toBe(room.id);

    const command = createCommand(IFActions.ENTERING, {
      entity: ball
    });
    const context = createRealTestContext(enteringAction, world, command);

    // Validation should fail
    const validation = enteringAction.validate(context);
    expect(validation.valid).toBe(false);
    expect(validation.error).toContain('not_enterable');

    // VERIFY POSTCONDITION: player still in the room (no change)
    expect(world.getLocation(player.id)).toBe(room.id);
  });

  test('should NOT move player when container is closed', () => {
    const { world, player, room } = setupBasicWorld();

    const crate = world.createEntity('wooden crate', EntityType.CONTAINER);
    crate.add({
      type: TraitType.CONTAINER,
      enterable: true
    });
    crate.add({
      type: TraitType.ENTERABLE,
      preposition: 'in'
    });
    crate.add({
      type: TraitType.OPENABLE,
      isOpen: false // Closed
    });
    world.moveEntity(crate.id, room.id);

    // VERIFY PRECONDITION: player is in the room
    expect(world.getLocation(player.id)).toBe(room.id);

    const command = createCommand(IFActions.ENTERING, {
      entity: crate
    });
    const context = createRealTestContext(enteringAction, world, command);

    // Validation should fail
    const validation = enteringAction.validate(context);
    expect(validation.valid).toBe(false);
    expect(validation.error).toContain('container_closed');

    // VERIFY POSTCONDITION: player still in the room (no change)
    expect(world.getLocation(player.id)).toBe(room.id);
  });

  test('should NOT move player when already inside target', () => {
    const { world, player, room } = setupBasicWorld();

    const car = world.createEntity('sports car', EntityType.CONTAINER);
    car.add({
      type: TraitType.CONTAINER,
      enterable: true
    });
    car.add({
      type: TraitType.ENTERABLE,
      preposition: 'in'
    });
    world.moveEntity(car.id, room.id);
    world.moveEntity(player.id, car.id); // Already in car

    // VERIFY PRECONDITION: player is in the car
    expect(world.getLocation(player.id)).toBe(car.id);

    const command = createCommand(IFActions.ENTERING, {
      entity: car
    });
    const context = createRealTestContext(enteringAction, world, command);

    // Validation should fail
    const validation = enteringAction.validate(context);
    expect(validation.valid).toBe(false);
    expect(validation.error).toContain('already_inside');

    // VERIFY POSTCONDITION: player still in the car (no change)
    expect(world.getLocation(player.id)).toBe(car.id);
  });

  test('should move player into open container', () => {
    const { world, player, room } = setupBasicWorld();

    const box = world.createEntity('large box', EntityType.CONTAINER);
    box.add({
      type: TraitType.CONTAINER,
      enterable: true
    });
    box.add({
      type: TraitType.ENTERABLE,
      preposition: 'in'
    });
    box.add({
      type: TraitType.OPENABLE,
      isOpen: true // Open
    });
    world.moveEntity(box.id, room.id);

    // VERIFY PRECONDITION: player is in the room
    expect(world.getLocation(player.id)).toBe(room.id);

    const command = createCommand(IFActions.ENTERING, {
      entity: box
    });
    const context = createRealTestContext(enteringAction, world, command);

    const validation = enteringAction.validate(context);
    expect(validation.valid).toBe(true);
    enteringAction.execute(context);

    // VERIFY POSTCONDITION: player is now in the box
    expect(world.getLocation(player.id)).toBe(box.id);
  });
});
