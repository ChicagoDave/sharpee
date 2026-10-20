/**
 * Golden test for pushing action — the press.
 *
 * `push <thing>` with no direction is the press (ADR-378 D6): a switchable
 * thing is toggled, anything else takes the push with the stock line. The
 * push between rooms (`push <thing> <direction>`) is covered in
 * adr-378-pushing-between-rooms.test.ts. Patterns shown here:
 * - Precondition refusals (nothing, worn, not pushable, scenery)
 * - The press toggling a switch, with the BUTTON trait choosing the line
 * - World state assertions on the toggled trait
 */

import { describe, test, expect } from 'vitest';
import { pushingAction } from '../../../src/actions/standard/pushing';
import { IFActions } from '../../../src/actions/constants';
import { TraitType } from '@sharpee/world-model';
import {
  createRealTestContext,
  setupBasicWorld,
  expectEvent,
  executeWithValidation,
  expectTraitValue,
  createCommand
} from '../../test-utils';

describe('pushingAction (Golden Pattern)', () => {
  describe('Action Metadata', () => {
    test('should have correct ID', () => {
      expect(pushingAction.id).toBe(IFActions.PUSHING);
    });

    test('should declare required messages', () => {
      for (const id of [
        'no_target', 'not_visible', 'not_reachable', 'wearing_it', 'carrying_it',
        'button_pushed', 'button_clicks', 'switch_toggled',
        'pushed_direction', 'cannot_push_that_way',
        'pushing_does_nothing', 'fixed_in_place',
      ]) {
        expect(pushingAction.requiredMessages).toContain(id);
      }
      // Retired with the trait's fields (ADR-378 D6a): nothing emits them.
      expect(pushingAction.requiredMessages).not.toContain('pushed_with_effort');
      expect(pushingAction.requiredMessages).not.toContain('reveals_passage');
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
      world.moveEntity(shirt.id, player.id);

      const command = createCommand(IFActions.PUSHING, { entity: shirt });
      const context = createRealTestContext(pushingAction, world, command);

      const validation = pushingAction.validate(context);

      expect(validation.valid).toBe(false);
      expect(validation.error).toBe('wearing_it');
    });

    test('should fail when object is not pushable', () => {
      const { world, room } = setupBasicWorld();
      const painting = world.createEntity('oil painting', 'object');
      world.moveEntity(painting.id, room.id);

      const command = createCommand(IFActions.PUSHING, { entity: painting });
      const context = createRealTestContext(pushingAction, world, command);

      const validation = pushingAction.validate(context);

      expect(validation.valid).toBe(false);
      expect(validation.error).toBe('pushing_does_nothing');
    });

    test('should fail when scenery is not pushable', () => {
      const { world, room } = setupBasicWorld();
      const fountain = world.createEntity('marble fountain', 'object');
      fountain.add({ type: TraitType.SCENERY });
      world.moveEntity(fountain.id, room.id);

      const command = createCommand(IFActions.PUSHING, { entity: fountain });
      const context = createRealTestContext(pushingAction, world, command);

      const validation = pushingAction.validate(context);

      expect(validation.valid).toBe(false);
      expect(validation.error).toBe('fixed_in_place');
    });
  });

  describe('Button and Switch Pushing', () => {
    test('should press a button with a click', () => {
      const { world, room } = setupBasicWorld();
      const button = world.createEntity('red button', 'object');
      button.add({ type: TraitType.PUSHABLE });
      button.add({ type: TraitType.BUTTON });
      button.add({ type: TraitType.SWITCHABLE, isOn: false });
      world.moveEntity(button.id, room.id);

      const command = createCommand(IFActions.PUSHING, { entity: button });
      const context = createRealTestContext(pushingAction, world, command);

      const events = executeWithValidation(pushingAction, context);

      expectEvent(events, 'if.event.pushed', {
        target: button.id,
        targetName: 'red button',
        willToggle: true,
        currentState: false,
        newState: true,
        messageId: 'if.action.pushing.button_clicks',
        params: { target: { name: 'red button' }, newState: 'on' }
      });
    });

    test('should toggle switch state', () => {
      const { world, room } = setupBasicWorld();
      const lightSwitch = world.createEntity('light switch', 'object');
      lightSwitch.add({ type: TraitType.PUSHABLE });
      lightSwitch.add({ type: TraitType.SWITCHABLE, isOn: true });
      world.moveEntity(lightSwitch.id, room.id);

      const command = createCommand(IFActions.PUSHING, { entity: lightSwitch });
      const context = createRealTestContext(pushingAction, world, command);

      const events = executeWithValidation(pushingAction, context);

      expectEvent(events, 'if.event.pushed', {
        target: lightSwitch.id,
        willToggle: true,
        currentState: true,
        newState: false,
        messageId: 'if.action.pushing.switch_toggled',
        params: { target: { name: 'light switch' }, newState: 'off' }
      });
    });

    test('should use button_pushed for non-switchable things', () => {
      const { world, room } = setupBasicWorld();
      const doorbell = world.createEntity('doorbell', 'object');
      doorbell.add({ type: TraitType.PUSHABLE });
      world.moveEntity(doorbell.id, room.id);

      const command = createCommand(IFActions.PUSHING, { entity: doorbell });
      const context = createRealTestContext(pushingAction, world, command);

      const events = executeWithValidation(pushingAction, context);

      expectEvent(events, 'if.event.pushed', {
        target: doorbell.id,
        messageId: 'if.action.pushing.button_pushed',
        params: { target: { name: 'doorbell' } }
      });
      expect(world.getLocation(doorbell.id)).toBe(room.id);
    });
  });

  describe('Event Structure Validation', () => {
    test('should include proper entities in all events', () => {
      const { world, player, room } = setupBasicWorld();
      const button = world.createEntity('reset button', 'object');
      button.add({ type: TraitType.PUSHABLE });
      button.add({ type: TraitType.SWITCHABLE, isOn: false });
      world.moveEntity(button.id, room.id);

      const command = createCommand(IFActions.PUSHING, { entity: button });
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
   * not just emits events. The press's mutation is SwitchableBehavior.toggle().
   */
  describe('World State Mutations', () => {
    test('should toggle SwitchableTrait.isOn from false to true after pushing button', () => {
      const { world, room } = setupBasicWorld();
      const button = world.createEntity('red button', 'object');
      button.add({ type: TraitType.PUSHABLE });
      button.add({ type: TraitType.SWITCHABLE, isOn: false });
      world.moveEntity(button.id, room.id);

      expectTraitValue(button, TraitType.SWITCHABLE, 'isOn', false);

      const command = createCommand(IFActions.PUSHING, { entity: button });
      const context = createRealTestContext(pushingAction, world, command);

      const validation = pushingAction.validate(context);
      expect(validation.valid).toBe(true);
      pushingAction.execute(context);

      expectTraitValue(button, TraitType.SWITCHABLE, 'isOn', true);
    });

    test('should toggle SwitchableTrait.isOn from true to false after pushing switch', () => {
      const { world, room } = setupBasicWorld();
      const lightSwitch = world.createEntity('light switch', 'object');
      lightSwitch.add({ type: TraitType.PUSHABLE });
      lightSwitch.add({ type: TraitType.SWITCHABLE, isOn: true });
      world.moveEntity(lightSwitch.id, room.id);

      expectTraitValue(lightSwitch, TraitType.SWITCHABLE, 'isOn', true);

      const command = createCommand(IFActions.PUSHING, { entity: lightSwitch });
      const context = createRealTestContext(pushingAction, world, command);

      const validation = pushingAction.validate(context);
      expect(validation.valid).toBe(true);
      pushingAction.execute(context);

      expectTraitValue(lightSwitch, TraitType.SWITCHABLE, 'isOn', false);
    });

    test('should NOT mutate state when pushing non-pushable object', () => {
      const { world, room } = setupBasicWorld();
      const painting = world.createEntity('oil painting', 'object');
      world.moveEntity(painting.id, room.id);

      const command = createCommand(IFActions.PUSHING, { entity: painting });
      const context = createRealTestContext(pushingAction, world, command);

      const validation = pushingAction.validate(context);
      expect(validation.valid).toBe(false);

      expect(painting.get(TraitType.SWITCHABLE)).toBeUndefined();
    });
  });
});
