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
  executeWithValidation,
  expectTraitValue,
  TestData,
  createCommand
} from '../../test-utils';
import type { ActionContext } from '../../../src/actions/enhanced-types';

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
      
      const events = executeWithValidation(pushingAction, context);

      // Should emit PUSHED event with messageId and params for text rendering
      expectEvent(events, 'if.event.pushed', {
        target: button.id,
        targetName: 'red button',
        pushType: 'button',
        willToggle: true,
        currentState: false,
        newState: true,
        activated: true,
        sound: 'click',
        messageId: 'if.action.pushing.button_clicks',
        params: { target: { name: 'red button' }, newState: 'on' }
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
      
      const events = executeWithValidation(pushingAction, context);

      // Should emit PUSHED event with messageId and params for text rendering
      expectEvent(events, 'if.event.pushed', {
        pushType: 'button',
        willToggle: true,
        currentState: true,
        newState: false,
        messageId: 'if.action.pushing.switch_toggled',
        params: { target: { name: 'light switch' }, newState: 'off' }
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
      
      const events = executeWithValidation(pushingAction, context);

      expectEvent(events, 'if.event.pushed', {
        pushType: 'button',
        activated: true,
        messageId: 'if.action.pushing.button_pushed',
        params: { target: { name: 'alarm button' } }
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
      
      const events = executeWithValidation(pushingAction, context);

      // Should emit PUSHED event with messageId and params for text rendering
      expectEvent(events, 'if.event.pushed', {
        target: crate.id,
        pushType: 'heavy',
        requiresStrength: 30,
        moved: true,
        moveDirection: 'north',
        messageId: 'if.action.pushing.pushed_with_effort',
        params: { target: { name: 'wooden crate' }, direction: 'north' }
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
      
      const events = executeWithValidation(pushingAction, context);

      // Should emit PUSHED event with messageId and params for text rendering
      expectEvent(events, 'if.event.pushed', {
        pushType: 'heavy',
        moved: false,
        nudged: true,
        messageId: 'if.action.pushing.wont_budge',
        params: { target: { name: 'massive boulder' } }
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
      
      const events = executeWithValidation(pushingAction, context);

      // Should emit PUSHED event with messageId and params for text rendering
      expectEvent(events, 'if.event.pushed', {
        pushType: 'moveable',
        direction: 'east',
        moved: true,
        moveDirection: 'east',
        sound: 'stone-scrape',
        messageId: 'if.action.pushing.pushed_direction',
        params: { target: { name: 'ancient statue' }, direction: 'east' }
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
      
      const events = executeWithValidation(pushingAction, context);

      // Should emit PUSHED event with messageId and params for text rendering
      expectEvent(events, 'if.event.pushed', {
        pushType: 'moveable',
        nudged: true,
        moved: false,
        messageId: 'if.action.pushing.pushed_nudged',
        params: { target: { name: 'round boulder' } }
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
      
      const events = executeWithValidation(pushingAction, context);

      // Should emit PUSHED event with messageId and params for text rendering
      expectEvent(events, 'if.event.pushed', {
        pushType: 'moveable',
        revealsPassage: true,
        moved: true,
        moveDirection: 'west',
        messageId: 'if.action.pushing.reveals_passage',
        params: { target: { name: 'stone block' }, direction: 'west' }
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
      
      const events = executeWithValidation(pushingAction, context);

      // Should emit PUSHED event with messageId and params for text rendering
      expectEvent(events, 'if.event.pushed', {
        pushType: 'moveable',
        nudged: true,
        moved: false,
        messageId: 'if.action.pushing.pushed_nudged',
        params: { target: { name: 'cardboard box' } }
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
      
      const events = executeWithValidation(pushingAction, context);

      // Should emit PUSHED event with messageId and params for text rendering
      expectEvent(events, 'if.event.pushed', {
        pushType: 'moveable',
        direction: 'north',
        moved: true,
        moveDirection: 'north',
        messageId: 'if.action.pushing.pushed_direction',
        params: { target: { name: 'wooden chair' }, direction: 'north' }
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

      const events = executeWithValidation(pushingAction, context);

      events.forEach(event => {
        if (event.entities) {
          expect(event.entities.actor).toBe(player.id);
          expect(event.entities.target).toBe(button.id);
          expect(event.entities.location).toBe(room.id);
        }
      });
    });
  });

  /**
   * World State Mutations
   *
   * These tests verify that the pushing action actually mutates world state,
   * not just emits events. The key mutation is SwitchableBehavior.toggle().
   */
  describe('World State Mutations', () => {
    test('should toggle SwitchableTrait.isOn from false to true after pushing button', () => {
      const { world, player, room } = setupBasicWorld();
      const button = world.createEntity('red button', 'object');
      button.add({
        type: TraitType.PUSHABLE,
        pushType: 'button'
      });
      button.add({
        type: TraitType.SWITCHABLE,
        isOn: false
      });
      world.moveEntity(button.id, room.id);

      // VERIFY PRECONDITION: switch is off
      expectTraitValue(button, TraitType.SWITCHABLE, 'isOn', false);

      const command = createCommand(IFActions.PUSHING, { entity: button });
      const context = createRealTestContext(pushingAction, world, command);

      const validation = pushingAction.validate(context);
      expect(validation.valid).toBe(true);
      pushingAction.execute(context);

      // VERIFY POSTCONDITION: switch is now on
      expectTraitValue(button, TraitType.SWITCHABLE, 'isOn', true);
    });

    test('should toggle SwitchableTrait.isOn from true to false after pushing switch', () => {
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

      // VERIFY PRECONDITION: switch is on
      expectTraitValue(lightSwitch, TraitType.SWITCHABLE, 'isOn', true);

      const command = createCommand(IFActions.PUSHING, { entity: lightSwitch });
      const context = createRealTestContext(pushingAction, world, command);

      const validation = pushingAction.validate(context);
      expect(validation.valid).toBe(true);
      pushingAction.execute(context);

      // VERIFY POSTCONDITION: switch is now off
      expectTraitValue(lightSwitch, TraitType.SWITCHABLE, 'isOn', false);
    });

    test('should NOT mutate state when pushing non-pushable object', () => {
      const { world, player, room } = setupBasicWorld();
      const painting = world.createEntity('oil painting', 'object');
      world.moveEntity(painting.id, room.id);

      const command = createCommand(IFActions.PUSHING, { entity: painting });
      const context = createRealTestContext(pushingAction, world, command);

      const validation = pushingAction.validate(context);
      expect(validation.valid).toBe(false);

      // No traits to mutate — validation blocked it
      expect(painting.get(TraitType.SWITCHABLE)).toBeUndefined();
    });
  });
});

