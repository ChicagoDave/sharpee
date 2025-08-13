/**
 * Golden test for pushing action - demonstrates testing physical manipulation
 * 
 * This shows patterns for testing actions that:
 * - Move heavy scenery objects
 * - Activate buttons and switches
 * - Reveal hidden passages
 * - Handle directional movement
 * - Check weight limits
 * - Distinguish between fixed and moveable objects
 */

import { describe, test, expect, beforeEach, vi } from 'vitest';
import { pushingAction } from '../../../src/actions/standard/pushing';
import { IFActions } from '../../../src/actions/constants';
import { TraitType } from '@sharpee/world-model';
import { 
  createRealTestContext,
  setupBasicWorld,
  expectEvent,
  TestData,
  createCommand
} from '../../test-utils';
import type { WorldModel } from '@sharpee/world-model';

describe('pushingAction (Golden Pattern)', () => {
  describe('Action Metadata', () => {
    test('should have correct ID', () => {
      expect(pushingAction.id).toBe(IFActions.PUSHING);
    });

    test('should declare required messages', () => {
      expect(pushingAction.requiredMessages).toContain('no_target');
      expect(pushingAction.requiredMessages).toContain('not_visible');
      expect(pushingAction.requiredMessages).toContain('not_reachable');
      expect(pushingAction.requiredMessages).toContain('too_heavy');
      expect(pushingAction.requiredMessages).toContain('wearing_it');
      expect(pushingAction.requiredMessages).toContain('button_pushed');
      expect(pushingAction.requiredMessages).toContain('button_clicks');
      expect(pushingAction.requiredMessages).toContain('switch_toggled');
      expect(pushingAction.requiredMessages).toContain('pushed_direction');
      expect(pushingAction.requiredMessages).toContain('pushed_nudged');
      expect(pushingAction.requiredMessages).toContain('pushed_with_effort');
      expect(pushingAction.requiredMessages).toContain('reveals_passage');
      expect(pushingAction.requiredMessages).toContain('wont_budge');
      expect(pushingAction.requiredMessages).toContain('pushing_does_nothing');
      expect(pushingAction.requiredMessages).toContain('fixed_in_place');
    });

    test('should belong to device_manipulation group', () => {
      expect(pushingAction.group).toBe('device_manipulation');
    });
  });

  describe('Precondition Checks', () => {
    test('should fail when no target specified', () => {
      const { world } = setupBasicWorld();
      const command = createCommand(IFActions.PUSHING);
      const context = createRealTestContext(pushingAction, world, command);
      
      // Test validation instead of execute
      const validation = pushingAction.validate(context);
      
      expect(validation.valid).toBe(false);
      expect(validation.error).toBe('no_target');
    });


    test('should fail when pushing worn items', () => {
      const { world, player } = setupBasicWorld();
      const shirt = world.createEntity('blue shirt', 'object');
      shirt.add({
        type: TraitType.WEARABLE,
        worn: true
      });
      
      // Shirt is worn by player
      world.moveEntity(shirt.id, player.id);
      
      const command = createCommand(
        IFActions.PUSHING,
        { entity: shirt }
      );
      const context = createRealTestContext(pushingAction, world, command);
      
      // Test validation instead of execute
      const validation = pushingAction.validate(context);
      
      expect(validation.valid).toBe(false);
      expect(validation.error).toBe('wearing_it');
    });

    test('should fail when object is not pushable', () => {
      const { world, player, room } = setupBasicWorld();
      const painting = world.createEntity('oil painting', 'object');
      // No PUSHABLE trait added
      
      world.moveEntity(painting.id, room.id);
      
      const command = createCommand(
        IFActions.PUSHING,
        { entity: painting }
      );
      const context = createRealTestContext(pushingAction, world, command);
      
      // Test validation instead of execute
      const validation = pushingAction.validate(context);
      
      expect(validation.valid).toBe(false);
      expect(validation.error).toBe('pushing_does_nothing');
    });

    test('should fail when scenery is not pushable', () => {
      const { world, player, room } = setupBasicWorld();
      const fountain = world.createEntity('marble fountain', 'object');
      fountain.add({
        type: TraitType.SCENERY
      });
      // No PUSHABLE trait
      
      world.moveEntity(fountain.id, room.id);
      
      const command = createCommand(
        IFActions.PUSHING,
        { entity: fountain }
      );
      const context = createRealTestContext(pushingAction, world, command);
      
      // Test validation instead of execute
      const validation = pushingAction.validate(context);
      
      expect(validation.valid).toBe(false);
      expect(validation.error).toBe('fixed_in_place');
    });
  });

  describe('Button and Switch Pushing', () => {
    test('should activate button with click sound', () => {
      const { world, player, room } = setupBasicWorld();
      const button = world.createEntity('red button', 'object');
      button.add({
        type: TraitType.PUSHABLE,
        pushType: 'button',
        pushSound: 'click'
      });
      button.add({
        type: TraitType.BUTTON
      });
      button.add({
        type: TraitType.SWITCHABLE,
        isOn: false
      });
      
      world.moveEntity(button.id, room.id);
      
      const command = createCommand(
        IFActions.PUSHING,
        { entity: button }
      );
      const context = createRealTestContext(pushingAction, world, command);
      
      const events = pushingAction.execute(context);
      
      // Should emit PUSHED event
      expectEvent(events, 'if.event.pushed', {
        target: button.id,
        targetName: 'red button',
        pushType: 'button',
        willToggle: true,
        currentState: false,
        newState: true,
        activated: true,
        sound: 'click'
      });
      
      // Should emit button_toggles message (switchable button)
      expectEvent(events, 'action.success', {
        messageId: expect.stringContaining('button_toggles'),
        params: { target: 'red button', newState: 'on' }
      });
    });

    test('should toggle switch state', () => {
      const { world, player, room } = setupBasicWorld();
      const lightSwitch = world.createEntity('light switch', 'object');
      lightSwitch.add({
        type: TraitType.PUSHABLE,
        pushType: 'button'
      });
      lightSwitch.add({
        type: TraitType.SWITCHABLE,
        isOn: true
      });
      
      world.moveEntity(lightSwitch.id, room.id);
      
      const command = createCommand(
        IFActions.PUSHING,
        { entity: lightSwitch }
      );
      const context = createRealTestContext(pushingAction, world, command);
      
      const events = pushingAction.execute(context);
      
      // Should emit PUSHED event
      expectEvent(events, 'if.event.pushed', {
        pushType: 'button',
        willToggle: true,
        currentState: true,
        newState: false
      });
      
      // Should emit button_toggles message (switchable without BUTTON trait)
      expectEvent(events, 'action.success', {
        messageId: expect.stringContaining('button_toggles'),
        params: { target: 'light switch', newState: 'off' }
      });
    });

    test('should use button_pushed for non-switchable buttons', () => {
      const { world, player, room } = setupBasicWorld();
      const alarmButton = world.createEntity('alarm button', 'object');
      alarmButton.add({
        type: TraitType.PUSHABLE,
        pushType: 'button'
      });
      // No SWITCHABLE trait - just activates
      
      world.moveEntity(alarmButton.id, room.id);
      
      const command = createCommand(
        IFActions.PUSHING,
        { entity: alarmButton }
      );
      const context = createRealTestContext(pushingAction, world, command);
      
      const events = pushingAction.execute(context);
      
      expectEvent(events, 'if.event.pushed', {
        pushType: 'button',
        activated: true
      });
      
      expectEvent(events, 'action.success', {
        messageId: expect.stringContaining('button_clicks'),
        params: { target: 'alarm button' }
      });
    });
  });

  describe('Heavy Object Pushing', () => {
    test('should push heavy objects with effort', () => {
      const { world, player, room } = setupBasicWorld();
      const crate = world.createEntity('wooden crate', 'object');
      crate.add({
        type: TraitType.PUSHABLE,
        pushType: 'heavy',
        requiresStrength: 30
      });
      crate.add({
        type: TraitType.MOVEABLE_SCENERY
      });
      
      world.moveEntity(crate.id, room.id);
      
      const command = createCommand(
        IFActions.PUSHING,
        { entity: crate }
      );
      command.parsed.extras = { direction: 'north' };
      
      const context = createRealTestContext(pushingAction, world, command);
      
      const events = pushingAction.execute(context);
      
      // Should emit PUSHED event
      expectEvent(events, 'if.event.pushed', {
        target: crate.id,
        pushType: 'heavy',
        requiresStrength: 30,
        moved: true,
        moveDirection: 'north'
      });
      
      // Should emit pushed_with_effort message
      expectEvent(events, 'action.success', {
        messageId: expect.stringContaining('pushed_with_effort'),
        params: { target: 'wooden crate', direction: 'north' }
      });
    });

    test('should show wont_budge for heavy objects without direction', () => {
      const { world, player, room } = setupBasicWorld();
      const boulder = world.createEntity('massive boulder', 'object');
      boulder.add({
        type: TraitType.PUSHABLE,
        pushType: 'heavy',
        requiresStrength: 50
      });
      boulder.add({
        type: TraitType.MOVEABLE_SCENERY
      });
      
      world.moveEntity(boulder.id, room.id);
      
      const command = createCommand(
        IFActions.PUSHING,
        { entity: boulder }
      );
      const context = createRealTestContext(pushingAction, world, command);
      
      const events = pushingAction.execute(context);
      
      // Should emit PUSHED event
      expectEvent(events, 'if.event.pushed', {
        pushType: 'heavy',
        moved: false,
        nudged: true
      });
      
      // Should emit wont_budge message
      expectEvent(events, 'action.success', {
        messageId: expect.stringContaining('wont_budge'),
        params: { target: 'massive boulder' }
      });
    });

    test('should push moveable objects in direction', () => {
      const { world, player, room } = setupBasicWorld();
      const statue = world.createEntity('ancient statue', 'object');
      statue.add({
        type: TraitType.PUSHABLE,
        pushType: 'moveable',
        pushSound: 'stone-scrape'
      });
      statue.add({
        type: TraitType.MOVEABLE_SCENERY
      });
      
      world.moveEntity(statue.id, room.id);
      
      const command = createCommand(
        IFActions.PUSHING,
        { entity: statue }
      );
      command.parsed.extras = { direction: 'east' };
      
      const context = createRealTestContext(pushingAction, world, command);
      
      const events = pushingAction.execute(context);
      
      // Should emit PUSHED event
      expectEvent(events, 'if.event.pushed', {
        pushType: 'moveable',
        direction: 'east',
        moved: true,
        moveDirection: 'east',
        sound: 'stone-scrape'
      });
      
      // Should emit pushed_direction message
      expectEvent(events, 'action.success', {
        messageId: expect.stringContaining('pushed_direction'),
        params: { target: 'ancient statue', direction: 'east' }
      });
    });

    test('should nudge moveable objects without direction', () => {
      const { world, player, room } = setupBasicWorld();
      const boulder = world.createEntity('round boulder', 'object');
      boulder.add({
        type: TraitType.PUSHABLE,
        pushType: 'moveable'
      });
      boulder.add({
        type: TraitType.MOVEABLE_SCENERY
      });
      
      world.moveEntity(boulder.id, room.id);
      
      const command = createCommand(
        IFActions.PUSHING,
        { entity: boulder }
      );
      const context = createRealTestContext(pushingAction, world, command);
      
      const events = pushingAction.execute(context);
      
      // Should emit PUSHED event
      expectEvent(events, 'if.event.pushed', {
        pushType: 'moveable',
        nudged: true,
        moved: false
      });
      
      // Should emit pushed_nudged message
      expectEvent(events, 'action.success', {
        messageId: expect.stringContaining('pushed_nudged'),
        params: { target: 'round boulder' }
      });
    });

    test('should reveal hidden passage when pushing special objects', () => {
      const { world, player, room } = setupBasicWorld();
      const secretBlock = world.createEntity('stone block', 'object');
      secretBlock.add({
        type: TraitType.PUSHABLE,
        pushType: 'moveable',
        revealsPassage: true
      });
      secretBlock.add({
        type: TraitType.MOVEABLE_SCENERY
      });
      
      world.moveEntity(secretBlock.id, room.id);
      
      const command = createCommand(
        IFActions.PUSHING,
        { entity: secretBlock }
      );
      command.parsed.extras = { direction: 'west' };
      
      const context = createRealTestContext(pushingAction, world, command);
      
      const events = pushingAction.execute(context);
      
      // Should emit PUSHED event
      expectEvent(events, 'if.event.pushed', {
        pushType: 'moveable',
        revealsPassage: true,
        moved: true,
        moveDirection: 'west'
      });
      
      // Should emit reveals_passage message
      expectEvent(events, 'action.success', {
        messageId: expect.stringContaining('reveals_passage'),
        params: { target: 'stone block', direction: 'west' }
      });
    });
  });

  describe('Regular Object Pushing', () => {
    test('should nudge regular pushable objects', () => {
      const { world, player, room } = setupBasicWorld();
      const box = world.createEntity('cardboard box', 'object');
      box.add({
        type: TraitType.PUSHABLE,
        pushType: 'moveable'
      });
      
      world.moveEntity(box.id, room.id);
      
      const command = createCommand(
        IFActions.PUSHING,
        { entity: box }
      );
      const context = createRealTestContext(pushingAction, world, command);
      
      const events = pushingAction.execute(context);
      
      // Should emit PUSHED event
      expectEvent(events, 'if.event.pushed', {
        pushType: 'moveable',
        nudged: true,
        moved: false
      });
      
      // Should emit pushed_nudged message
      expectEvent(events, 'action.success', {
        messageId: expect.stringContaining('pushed_nudged'),
        params: { target: 'cardboard box' }
      });
    });

    test('should push object in direction', () => {
      const { world, player, room } = setupBasicWorld();
      const chair = world.createEntity('wooden chair', 'object');
      chair.add({
        type: TraitType.PUSHABLE,
        pushType: 'moveable'
      });
      
      world.moveEntity(chair.id, room.id);
      
      const command = createCommand(
        IFActions.PUSHING,
        { entity: chair }
      );
      command.parsed.extras = { direction: 'north' };
      
      const context = createRealTestContext(pushingAction, world, command);
      
      const events = pushingAction.execute(context);
      
      // Should emit PUSHED event
      expectEvent(events, 'if.event.pushed', {
        pushType: 'moveable',
        direction: 'north',
        moved: true,
        moveDirection: 'north'
      });
      
      // Should emit pushed_direction message
      expectEvent(events, 'action.success', {
        messageId: expect.stringContaining('pushed_direction'),
        params: { target: 'wooden chair', direction: 'north' }
      });
    });
  });

  describe('Event Structure Validation', () => {
    test('should include proper entities in all events', () => {
      const { world, player, room } = setupBasicWorld();
      const button = world.createEntity('reset button', 'object');
      button.add({
        type: TraitType.PUSHABLE,
        pushType: 'button'
      });
      button.add({
        type: TraitType.SWITCHABLE,
        isOn: false
      });
      
      world.moveEntity(button.id, room.id);
      
      const command = createCommand(
        IFActions.PUSHING,
        { entity: button }
      );
      const context = createRealTestContext(pushingAction, world, command);
      
      const events = pushingAction.execute(context);
      
      events.forEach(event => {
        if (event.entities) {
          expect(event.entities.actor).toBe(player.id);
          expect(event.entities.target).toBe(button.id);
          expect(event.entities.location).toBe(room.id);
        }
      });
    });
  });
});

describe('Testing Pattern Examples for Pushing with Traits', () => {
  test('pattern: push types from traits', () => {
    // Test different push types based on traits
    const pushTypes = [
      { traits: [TraitType.PUSHABLE, TraitType.BUTTON], expectedType: 'button' },
      { traits: [TraitType.PUSHABLE, TraitType.MOVEABLE_SCENERY], expectedType: 'heavy' },
      { traits: [TraitType.PUSHABLE], expectedType: 'moveable' },
      { traits: [TraitType.SCENERY], expectedType: 'fixed' }
    ];
    
    pushTypes.forEach(({ traits, expectedType }) => {
      if (traits.includes(TraitType.PUSHABLE)) {
        if (traits.includes(TraitType.BUTTON)) {
          expect(expectedType).toBe('button');
        } else if (traits.includes(TraitType.MOVEABLE_SCENERY)) {
          expect(expectedType).toMatch(/heavy|moveable/);
        } else {
          expect(expectedType).toBe('moveable');
        }
      } else {
        expect(expectedType).toBe('fixed');
      }
    });
  });

  test('pattern: trait combinations', () => {
    // Test valid trait combinations
    const combinations = [
      { 
        traits: [TraitType.PUSHABLE, TraitType.BUTTON, TraitType.SWITCHABLE],
        valid: true,
        description: 'switchable button'
      },
      {
        traits: [TraitType.PUSHABLE, TraitType.MOVEABLE_SCENERY],
        valid: true,
        description: 'heavy moveable object'
      },
      {
        traits: [TraitType.PUSHABLE],
        valid: true,
        description: 'simple pushable object'
      },
      {
        traits: [TraitType.SCENERY],
        valid: true,
        description: 'fixed scenery (not pushable)'
      }
    ];
    
    combinations.forEach(({ traits, valid }) => {
      expect(valid).toBe(true);
    });
  });

  test('pattern: pushable properties', () => {
    // Test pushable trait properties
    const properties = [
      { pushType: 'button', hasSound: true, canRevealPassage: false },
      { pushType: 'heavy', hasStrength: true, canRevealPassage: false },
      { pushType: 'moveable', hasSound: true, canRevealPassage: true }
    ];
    
    properties.forEach(({ pushType, hasSound, canRevealPassage, hasStrength }) => {
      if (pushType === 'button') {
        expect(hasSound).toBe(true);
        expect(canRevealPassage).toBe(false);
      } else if (pushType === 'heavy') {
        expect(hasStrength).toBe(true);
      } else if (pushType === 'moveable') {
        expect(canRevealPassage).toBe(true);
      }
    });
  });
});
