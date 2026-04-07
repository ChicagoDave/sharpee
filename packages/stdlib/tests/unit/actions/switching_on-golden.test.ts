/**
 * Golden test for switching_on action - demonstrates testing device activation
 * 
 * This shows patterns for testing actions that:
 * - Turn on switchable devices
 * - Check power requirements
 * - Handle light sources specially
 * - Detect already-on state
 * - Support temporary activation
 * - Create appropriate sound effects
 * - Illuminate dark rooms
 */

import { describe, test, expect, beforeEach, vi } from 'vitest';
import { switchingOnAction } from '../../../src/actions/standard/switching_on';
import { IFActions } from '../../../src/actions/constants';
import { TraitType, SwitchableTrait, LightSourceTrait } from '@sharpee/world-model';
import {
  createRealTestContext,
  setupBasicWorld,
  expectEvent,
  executeWithValidation,
  TestData,
  createCommand
} from '../../test-utils';

describe('switchingOnAction (Golden Pattern)', () => {
  describe('Action Metadata', () => {
    test('should have correct ID', () => {
      expect(switchingOnAction.id).toBe(IFActions.SWITCHING_ON);
    });

    test('should declare required messages', () => {
      expect(switchingOnAction.requiredMessages).toContain('no_target');
      expect(switchingOnAction.requiredMessages).toContain('not_visible');
      expect(switchingOnAction.requiredMessages).toContain('not_reachable');
      expect(switchingOnAction.requiredMessages).toContain('not_switchable');
      expect(switchingOnAction.requiredMessages).toContain('already_on');
      expect(switchingOnAction.requiredMessages).toContain('no_power');
      expect(switchingOnAction.requiredMessages).toContain('switched_on');
      expect(switchingOnAction.requiredMessages).toContain('light_on');
      expect(switchingOnAction.requiredMessages).toContain('device_humming');
      expect(switchingOnAction.requiredMessages).toContain('temporary_activation');
      expect(switchingOnAction.requiredMessages).toContain('with_sound');
      expect(switchingOnAction.requiredMessages).toContain('door_opens');
      expect(switchingOnAction.requiredMessages).toContain('illuminates_darkness');
    });

    test('should belong to device_manipulation group', () => {
      expect(switchingOnAction.group).toBe('device_manipulation');
    });
  });

  describe('Precondition Checks', () => {
    test('should fail when no target specified', () => {
      const { world } = setupBasicWorld();
      const context = createRealTestContext(switchingOnAction, world, createCommand(IFActions.SWITCHING_ON));

      const events = executeWithValidation(switchingOnAction, context);

      expectEvent(events, 'if.event.switch_on_blocked', {
        messageId: 'if.action.switching_on.no_target'
      });
    });

    // Scope validation tests removed - now handled by CommandValidator

    test('should fail when target is not switchable', () => {
      const { world, player, room } = setupBasicWorld();
      const rock = world.createEntity('ordinary rock', 'object');
      world.moveEntity(rock.id, room.id);

      const context = createRealTestContext(switchingOnAction, world, createCommand(IFActions.SWITCHING_ON, {
        entity: rock
      }));

      const events = executeWithValidation(switchingOnAction, context);

      expectEvent(events, 'if.event.switch_on_blocked', {
        messageId: 'if.action.switching_on.not_switchable',
        params: { target: 'ordinary rock' }
      });
    });

    test('should fail when already on', () => {
      const { world, player, room } = setupBasicWorld();
      const radio = world.createEntity('portable radio', 'object');
      radio.add({
        type: TraitType.SWITCHABLE,
        isOn: true // Already on
      });
      world.moveEntity(radio.id, room.id);

      const context = createRealTestContext(switchingOnAction, world, createCommand(IFActions.SWITCHING_ON, {
        entity: radio
      }));

      const events = executeWithValidation(switchingOnAction, context);

      expectEvent(events, 'if.event.switch_on_blocked', {
        messageId: 'if.action.switching_on.already_on',
        params: { target: 'portable radio' }
      });
    });

    test('should fail when no power available', () => {
      const { world, player, room } = setupBasicWorld();
      const tv = world.createEntity('television', 'object');
      tv.add({
        type: TraitType.SWITCHABLE,
        isOn: false,
        requiresPower: true,
        hasPower: false
      });
      world.moveEntity(tv.id, room.id);

      const context = createRealTestContext(switchingOnAction, world, createCommand(IFActions.SWITCHING_ON, {
        entity: tv
      }));

      const events = executeWithValidation(switchingOnAction, context);

      expectEvent(events, 'if.event.switch_on_blocked', {
        messageId: 'if.action.switching_on.no_power',
        params: { target: 'television' }
      });
    });
  });

  describe('Basic Device Switching', () => {
    test('should switch on simple device', () => {
      const { world, player, room } = setupBasicWorld();
      const fan = world.createEntity('ceiling fan', 'object');
      fan.add({
        type: TraitType.SWITCHABLE,
        isOn: false
      });
      world.moveEntity(fan.id, room.id);
      
      const context = createRealTestContext(switchingOnAction, world, createCommand(IFActions.SWITCHING_ON, {
        entity: fan
      }));
      
      const events = executeWithValidation(switchingOnAction, context);
      
      // Should emit SWITCHED_ON event
      expectEvent(events, 'if.event.switched_on', {
        target: fan.id,
        targetName: 'ceiling fan'
      });
      
      // Should emit device_humming message for non-light devices
      expectEvent(events, 'if.event.switched_on', {
        messageId: expect.stringContaining('device_humming'),
        params: { target: 'ceiling fan' }
      });
    });

    test('should handle device with custom sound', () => {
      const { world, player, room } = setupBasicWorld();
      const generator = world.createEntity('diesel generator', 'object');
      generator.add({
        type: TraitType.SWITCHABLE,
        isOn: false,
        onSound: 'a loud rumbling'
      });
      world.moveEntity(generator.id, room.id);
      
      const context = createRealTestContext(switchingOnAction, world, createCommand(IFActions.SWITCHING_ON, {
        entity: generator
      }));
      
      const events = executeWithValidation(switchingOnAction, context);
      
      // Should include sound in event data
      expectEvent(events, 'if.event.switched_on', {
        sound: 'a loud rumbling'
      });
      
      // Should emit with_sound message
      expectEvent(events, 'if.event.switched_on', {
        messageId: expect.stringContaining('with_sound'),
        params: { 
          target: 'diesel generator',
          sound: 'a loud rumbling'
        }
      });
    });

    test('should handle temporary activation', () => {
      const { world, player, room } = setupBasicWorld();
      const timer = world.createEntity('egg timer', 'object');
      timer.add({
        type: TraitType.SWITCHABLE,
        isOn: false,
        autoOffTime: 300 // 5 minutes
      });
      world.moveEntity(timer.id, room.id);
      
      const context = createRealTestContext(switchingOnAction, world, createCommand(IFActions.SWITCHING_ON, {
        entity: timer
      }));
      
      const events = executeWithValidation(switchingOnAction, context);
      
      // Should include auto-off time
      expectEvent(events, 'if.event.switched_on', {
        autoOffTime: 300,
        temporary: true
      });
      
      // Should emit temporary_activation message
      expectEvent(events, 'if.event.switched_on', {
        messageId: expect.stringContaining('temporary_activation'),
        params: { target: 'egg timer' }
      });
    });
  });

  describe('Light Source Handling', () => {
    test('should handle basic light source', () => {
      const { world, player, room } = setupBasicWorld();
      const lamp = world.createEntity('desk lamp', 'object');
      lamp.add({
        type: TraitType.SWITCHABLE,
        isOn: false
      });
      lamp.add({
        type: TraitType.LIGHT_SOURCE,
        radius: 2,
        intensity: 'bright'
      });
      world.moveEntity(lamp.id, room.id);
      
      const context = createRealTestContext(switchingOnAction, world, createCommand(IFActions.SWITCHING_ON, {
        entity: lamp
      }));
      
      const events = executeWithValidation(switchingOnAction, context);
      
      // Should include light source data
      expectEvent(events, 'if.event.switched_on', {
        isLightSource: true,
        lightRadius: 2,
        lightIntensity: 'bright',
        willIlluminateLocation: true
      });
      
      // Should emit illuminates_darkness message
      expectEvent(events, 'if.event.switched_on', {
        messageId: expect.stringContaining('illuminates_darkness'),
        params: { target: 'desk lamp' }
      });
    });

    test('should illuminate dark room', () => {
      const { world, player, room } = setupBasicWorld();
      
      const flashlight = world.createEntity('LED flashlight', 'object');
      flashlight.add({
        type: TraitType.SWITCHABLE,
        isOn: false
      });
      flashlight.add({
        type: TraitType.LIGHT_SOURCE,
        radius: 3
      });
      
      world.moveEntity(flashlight.id, player.id); // Held by player
      
      const context = createRealTestContext(switchingOnAction, world, createCommand(IFActions.SWITCHING_ON, {
        entity: flashlight
      }));
      
      const events = executeWithValidation(switchingOnAction, context);
      
      // Should detect this will illuminate darkness
      expectEvent(events, 'if.event.switched_on', {
        willIlluminateLocation: true
      });
      
      // Should emit illuminates_darkness message
      expectEvent(events, 'if.event.switched_on', {
        messageId: expect.stringContaining('illuminates_darkness'),
        params: { target: 'LED flashlight' }
      });
    });

    test('should not illuminate if other lights exist', () => {
      const { world, player, room } = setupBasicWorld();
      
      const lamp1 = world.createEntity('table lamp', 'object');
      lamp1.add({
        type: TraitType.SWITCHABLE,
        isOn: false
      });
      lamp1.add({
        type: TraitType.LIGHT_SOURCE
      });
      
      const lamp2 = world.createEntity('floor lamp', 'object');
      lamp2.add({
        type: TraitType.SWITCHABLE,
        isOn: true // Already on
      });
      lamp2.add({
        type: TraitType.LIGHT_SOURCE
      });
      
      world.moveEntity(lamp1.id, room.id);
      world.moveEntity(lamp2.id, room.id);
      
      const context = createRealTestContext(switchingOnAction, world, createCommand(IFActions.SWITCHING_ON, {
        entity: lamp1
      }));
      
      const events = executeWithValidation(switchingOnAction, context);
      
      // Should emit light_on, not illuminates_darkness
      expectEvent(events, 'if.event.switched_on', {
        messageId: expect.stringContaining('light_on')
      });
    });
  });

  describe('Power Requirements', () => {
    test('should work with available power', () => {
      const { world, player, room } = setupBasicWorld();
      const computer = world.createEntity('desktop computer', 'object');
      computer.add({
        type: TraitType.SWITCHABLE,
        isOn: false,
        requiresPower: true,
        hasPower: true,
        powerConsumption: 250
      });
      world.moveEntity(computer.id, room.id);
      
      const context = createRealTestContext(switchingOnAction, world, createCommand(IFActions.SWITCHING_ON, {
        entity: computer
      }));
      
      const events = executeWithValidation(switchingOnAction, context);
      
      // Should include power consumption
      expectEvent(events, 'if.event.switched_on', {
        powerConsumption: 250
      });
      
      // Should succeed
      expectEvent(events, 'if.event.switched_on', {
        params: { target: 'desktop computer' }
      });
    });
  });

  describe('Side Effects', () => {
    test('should open automatic door when turned on', () => {
      const { world, player, room } = setupBasicWorld();
      const door = world.createEntity('automatic door', 'object');
      door.add({
        type: TraitType.SWITCHABLE,
        isOn: false
      });
      door.add({
        type: TraitType.CONTAINER,
        capacity: 0 // Passage
      });
      door.add({
        type: TraitType.OPENABLE,
        isOpen: false
      });
      world.moveEntity(door.id, room.id);
      
      const context = createRealTestContext(switchingOnAction, world, createCommand(IFActions.SWITCHING_ON, {
        entity: door
      }));
      
      const events = executeWithValidation(switchingOnAction, context);
      
      // Should detect it will open
      expectEvent(events, 'if.event.switched_on', {
        willOpen: true
      });
      
      // Should emit door_opens message
      expectEvent(events, 'if.event.switched_on', {
        messageId: expect.stringContaining('door_opens'),
        params: { target: 'automatic door' }
      });
    });

    test('should not affect already open door', () => {
      const { world, player, room } = setupBasicWorld();
      const gate = world.createEntity('security gate', 'object');
      gate.add({
        type: TraitType.SWITCHABLE,
        isOn: false
      });
      gate.add({
        type: TraitType.CONTAINER,
        capacity: 0
      });
      gate.add({
        type: TraitType.OPENABLE,
        isOpen: true // Already open
      });
      world.moveEntity(gate.id, room.id);
      
      const context = createRealTestContext(switchingOnAction, world, createCommand(IFActions.SWITCHING_ON, {
        entity: gate
      }));
      
      const events = executeWithValidation(switchingOnAction, context);
      
      // Should not have willOpen flag
      const switchedEvent = events.find(e => e.type === 'if.event.switched_on');
      expect(switchedEvent?.data.willOpen).toBeUndefined();
      
      // Should emit device_humming message
      expectEvent(events, 'if.event.switched_on', {
        messageId: expect.stringContaining('device_humming')
      });
    });
  });

  describe('Device Properties', () => {
    test('should include continuous sound', () => {
      const { world, player, room } = setupBasicWorld();
      const airconditioner = world.createEntity('air conditioner', 'object');
      airconditioner.add({
        type: TraitType.SWITCHABLE,
        isOn: false,
        runningSound: 'a quiet hum'
      });
      world.moveEntity(airconditioner.id, room.id);
      
      const context = createRealTestContext(switchingOnAction, world, createCommand(IFActions.SWITCHING_ON, {
        entity: airconditioner
      }));
      
      const events = executeWithValidation(switchingOnAction, context);
      
      // Should include continuous sound
      expectEvent(events, 'if.event.switched_on', {
        continuousSound: 'a quiet hum'
      });
    });
  });

  describe('Event Structure Validation', () => {
    test('should include proper entities in all events', () => {
      const { world, player, room } = setupBasicWorld();
      const device = world.createEntity('electronic device', 'object');
      device.add({
        type: TraitType.SWITCHABLE,
        isOn: false
      });
      world.moveEntity(device.id, room.id);
      
      const context = createRealTestContext(switchingOnAction, world, createCommand(IFActions.SWITCHING_ON, {
        entity: device
      }));
      
      const events = executeWithValidation(switchingOnAction, context);
      
      events.forEach(event => {
        if (event.entities) {
          expect(event.entities.actor).toBe(player.id);
          expect(event.entities.target).toBe(device.id);
          expect(event.entities.location).toBe(room.id);
        }
      });
    });
  });
});

/**
 * World State Mutation Tests
 *
 * These tests verify that the switching_on action actually mutates world state,
 * not just emits events. This catches bugs like the "dropping bug" where
 * actions appeared to work (good messages) but didn't actually change state.
 */
describe('World State Mutations', () => {
  test('should actually set isOn to true after switching on', () => {
    const { world, player, room } = setupBasicWorld();
    const lamp = world.createEntity('desk lamp', 'object');
    lamp.add({
      type: TraitType.SWITCHABLE,
      isOn: false
    });
    world.moveEntity(lamp.id, room.id);

    // VERIFY PRECONDITION: lamp is off
    const switchableBefore = lamp.get(SwitchableTrait)!;
    expect(switchableBefore.isOn).toBe(false);

    const command = createCommand(IFActions.SWITCHING_ON, {
      entity: lamp
    });
    const context = createRealTestContext(switchingOnAction, world, command);

    const validation = switchingOnAction.validate(context);
    expect(validation.valid).toBe(true);
    switchingOnAction.execute(context);

    // VERIFY POSTCONDITION: lamp is now on
    const switchableAfter = lamp.get(SwitchableTrait)!;
    expect(switchableAfter.isOn).toBe(true);
  });

  test('should actually set isOn to true for device with power available', () => {
    const { world, player, room } = setupBasicWorld();
    const computer = world.createEntity('desktop computer', 'object');
    computer.add({
      type: TraitType.SWITCHABLE,
      isOn: false,
      requiresPower: true,
      hasPower: true
    });
    world.moveEntity(computer.id, room.id);

    // VERIFY PRECONDITION: computer is off
    const switchableBefore = computer.get(SwitchableTrait)!;
    expect(switchableBefore.isOn).toBe(false);
    expect(switchableBefore.requiresPower).toBe(true);
    expect(switchableBefore.hasPower).toBe(true);

    const command = createCommand(IFActions.SWITCHING_ON, {
      entity: computer
    });
    const context = createRealTestContext(switchingOnAction, world, command);

    const validation = switchingOnAction.validate(context);
    expect(validation.valid).toBe(true);
    switchingOnAction.execute(context);

    // VERIFY POSTCONDITION: computer is now on
    const switchableAfter = computer.get(SwitchableTrait)!;
    expect(switchableAfter.isOn).toBe(true);
  });

  test('should NOT change isOn when already on', () => {
    const { world, player, room } = setupBasicWorld();
    const radio = world.createEntity('portable radio', 'object');
    radio.add({
      type: TraitType.SWITCHABLE,
      isOn: true // Already on
    });
    world.moveEntity(radio.id, room.id);

    // VERIFY PRECONDITION: radio is on
    const switchableBefore = radio.get(SwitchableTrait)!;
    expect(switchableBefore.isOn).toBe(true);

    const command = createCommand(IFActions.SWITCHING_ON, {
      entity: radio
    });
    const context = createRealTestContext(switchingOnAction, world, command);

    // Validation should fail
    const validation = switchingOnAction.validate(context);
    expect(validation.valid).toBe(false);
    expect(validation.error).toContain('already_on');

    // VERIFY POSTCONDITION: radio is still on (no change)
    const switchableAfter = radio.get(SwitchableTrait)!;
    expect(switchableAfter.isOn).toBe(true);
  });

  test('should NOT change isOn when no power available', () => {
    const { world, player, room } = setupBasicWorld();
    const tv = world.createEntity('television', 'object');
    tv.add({
      type: TraitType.SWITCHABLE,
      isOn: false,
      requiresPower: true,
      hasPower: false // No power
    });
    world.moveEntity(tv.id, room.id);

    // VERIFY PRECONDITION: tv is off
    const switchableBefore = tv.get(SwitchableTrait)!;
    expect(switchableBefore.isOn).toBe(false);

    const command = createCommand(IFActions.SWITCHING_ON, {
      entity: tv
    });
    const context = createRealTestContext(switchingOnAction, world, command);

    // Validation should fail
    const validation = switchingOnAction.validate(context);
    expect(validation.valid).toBe(false);
    expect(validation.error).toContain('no_power');

    // VERIFY POSTCONDITION: tv is still off (no change)
    const switchableAfter = tv.get(SwitchableTrait)!;
    expect(switchableAfter.isOn).toBe(false);
  });

  test('should NOT change state when target is not switchable', () => {
    const { world, player, room } = setupBasicWorld();
    const rock = world.createEntity('solid rock', 'object');
    // No switchable trait
    world.moveEntity(rock.id, room.id);

    const command = createCommand(IFActions.SWITCHING_ON, {
      entity: rock
    });
    const context = createRealTestContext(switchingOnAction, world, command);

    // Validation should fail
    const validation = switchingOnAction.validate(context);
    expect(validation.valid).toBe(false);
    expect(validation.error).toContain('not_switchable');

    // Object should not have switchable trait at all
    expect(rock.has(TraitType.SWITCHABLE)).toBe(false);
  });

  test('should actually turn on a light source and coordinate with LightSourceBehavior', () => {
    const { world, player, room } = setupBasicWorld();
    const flashlight = world.createEntity('LED flashlight', 'object');
    flashlight.add({
      type: TraitType.SWITCHABLE,
      isOn: false
    });
    flashlight.add({
      type: TraitType.LIGHT_SOURCE,
      isLit: false,
      radius: 3
    });
    world.moveEntity(flashlight.id, player.id);

    // VERIFY PRECONDITION: flashlight is off and not lit
    const switchableBefore = flashlight.get(SwitchableTrait)!;
    const lightSourceBefore = flashlight.get(LightSourceTrait)!;
    expect(switchableBefore.isOn).toBe(false);
    expect(lightSourceBefore.isLit).toBe(false);

    const command = createCommand(IFActions.SWITCHING_ON, {
      entity: flashlight
    });
    const context = createRealTestContext(switchingOnAction, world, command);

    const validation = switchingOnAction.validate(context);
    expect(validation.valid).toBe(true);
    switchingOnAction.execute(context);

    // VERIFY POSTCONDITION: flashlight is now on AND lit
    const switchableAfter = flashlight.get(SwitchableTrait)!;
    const lightSourceAfter = flashlight.get(LightSourceTrait)!;
    expect(switchableAfter.isOn).toBe(true);
    expect(lightSourceAfter.isLit).toBe(true);
  });
});
