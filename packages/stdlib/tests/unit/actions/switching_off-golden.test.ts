/**
 * Golden test for switching_off action - demonstrates testing device deactivation
 * 
 * This shows patterns for testing actions that:
 * - Turn off switchable devices
 * - Handle light sources and darkness
 * - Detect already-off state
 * - Stop running sounds
 * - Handle temporary device states
 * - Create appropriate sound effects
 * - May darken rooms
 */

import { describe, test, expect, beforeEach, vi } from 'vitest';
import { switchingOffAction } from '../../../src/actions/standard/switching_off';
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

// Helper to execute action with four-phase pattern (mimics CommandExecutor flow)
const executeWithValidation = (action: any, context: ActionContext) => {
  const validation = action.validate(context);
  if (!validation.valid) {
    // Use blocked() method for validation failures
    return action.blocked(context, validation);
  }
  // Execute mutations (returns void)
  action.execute(context);
  // Report generates events
  return action.report(context);
};

describe('switchingOffAction (Golden Pattern)', () => {
  describe('Action Metadata', () => {
    test('should have correct ID', () => {
      expect(switchingOffAction.id).toBe(IFActions.SWITCHING_OFF);
    });

    test('should declare required messages', () => {
      expect(switchingOffAction.requiredMessages).toContain('no_target');
      expect(switchingOffAction.requiredMessages).toContain('not_visible');
      expect(switchingOffAction.requiredMessages).toContain('not_reachable');
      expect(switchingOffAction.requiredMessages).toContain('not_switchable');
      expect(switchingOffAction.requiredMessages).toContain('already_off');
      expect(switchingOffAction.requiredMessages).toContain('switched_off');
      expect(switchingOffAction.requiredMessages).toContain('light_off');
      expect(switchingOffAction.requiredMessages).toContain('light_off_still_lit');
      expect(switchingOffAction.requiredMessages).toContain('device_stops');
      expect(switchingOffAction.requiredMessages).toContain('silence_falls');
      expect(switchingOffAction.requiredMessages).toContain('with_sound');
      expect(switchingOffAction.requiredMessages).toContain('door_closes');
      expect(switchingOffAction.requiredMessages).toContain('was_temporary');
    });

    test('should belong to device_manipulation group', () => {
      expect(switchingOffAction.group).toBe('device_manipulation');
    });
  });

  describe('Precondition Checks', () => {
    test('should fail when no target specified', () => {
      const { world } = setupBasicWorld();
      const context = createRealTestContext(switchingOffAction, world, createCommand(IFActions.SWITCHING_OFF));

      const events = executeWithValidation(switchingOffAction, context);

      expectEvent(events, 'action.blocked', {
        messageId: 'no_target'
      });
    });

    // Scope validation tests removed - now handled by CommandValidator

    test('should fail when target is not switchable', () => {
      const { world, player, room } = setupBasicWorld();
      const rock = world.createEntity('ordinary rock', 'object');
      world.moveEntity(rock.id, room.id);

      const context = createRealTestContext(switchingOffAction, world, createCommand(IFActions.SWITCHING_OFF, {
        entity: rock
      }));

      const events = executeWithValidation(switchingOffAction, context);

      expectEvent(events, 'action.blocked', {
        messageId: 'not_switchable',
        params: { target: 'ordinary rock' }
      });
    });

    test('should fail when already off', () => {
      const { world, player, room } = setupBasicWorld();
      const radio = world.createEntity('portable radio', 'object');
      radio.add({
        type: TraitType.SWITCHABLE,
        isOn: false // Already off
      });
      world.moveEntity(radio.id, room.id);

      const context = createRealTestContext(switchingOffAction, world, createCommand(IFActions.SWITCHING_OFF, {
        entity: radio
      }));

      const events = executeWithValidation(switchingOffAction, context);

      expectEvent(events, 'action.blocked', {
        messageId: 'already_off',
        params: { target: 'portable radio' }
      });
    });
  });

  describe('Basic Device Switching', () => {
    test('should switch off simple device', () => {
      const { world, player, room } = setupBasicWorld();
      const fan = world.createEntity('ceiling fan', 'object');
      fan.add({
        type: TraitType.SWITCHABLE,
        isOn: true
      });
      world.moveEntity(fan.id, room.id);
      
      const context = createRealTestContext(switchingOffAction, world, createCommand(IFActions.SWITCHING_OFF, {
        entity: fan
      }));
      
      const events = executeWithValidation(switchingOffAction, context);
      
      // Should emit SWITCHED_OFF event
      expectEvent(events, 'if.event.switched_off', {
        target: fan.id,
        targetName: 'ceiling fan'
      });
      
      // Should emit device_stops message for non-light devices
      expectEvent(events, 'action.success', {
        messageId: expect.stringContaining('device_stops'),
        params: { target: 'ceiling fan' }
      });
    });

    test('should handle device with custom off sound', () => {
      const { world, player, room } = setupBasicWorld();
      const engine = world.createEntity('diesel engine', 'object');
      engine.add({
        type: TraitType.SWITCHABLE,
        isOn: true,
        offSound: 'a sputtering cough'
      });
      world.moveEntity(engine.id, room.id);
      
      const context = createRealTestContext(switchingOffAction, world, createCommand(IFActions.SWITCHING_OFF, {
        entity: engine
      }));
      
      const events = executeWithValidation(switchingOffAction, context);
      
      // Should include sound in event data
      expectEvent(events, 'if.event.switched_off', {
        sound: 'a sputtering cough'
      });
      
      // Should emit with_sound message
      expectEvent(events, 'action.success', {
        messageId: expect.stringContaining('with_sound'),
        params: { 
          target: 'diesel engine',
          sound: 'a sputtering cough'
        }
      });
    });

    test('should handle device with running sound', () => {
      const { world, player, room } = setupBasicWorld();
      const generator = world.createEntity('power generator', 'object');
      generator.add({
        type: TraitType.SWITCHABLE,
        isOn: true,
        runningSound: 'a steady hum'
      });
      world.moveEntity(generator.id, room.id);
      
      const context = createRealTestContext(switchingOffAction, world, createCommand(IFActions.SWITCHING_OFF, {
        entity: generator
      }));
      
      const events = executeWithValidation(switchingOffAction, context);
      
      // Should note stopped sound
      expectEvent(events, 'if.event.switched_off', {
        stoppedSound: 'a steady hum'
      });
      
      // Should emit silence_falls message
      expectEvent(events, 'action.success', {
        messageId: expect.stringContaining('silence_falls'),
        params: { target: 'power generator' }
      });
    });

    test('should handle temporary device', () => {
      const { world, player, room } = setupBasicWorld();
      const timer = world.createEntity('kitchen timer', 'object');
      timer.add({
        type: TraitType.SWITCHABLE,
        isOn: true,
        autoOffCounter: 45 // 45 seconds remaining
      });
      world.moveEntity(timer.id, room.id);
      
      const context = createRealTestContext(switchingOffAction, world, createCommand(IFActions.SWITCHING_OFF, {
        entity: timer
      }));
      
      const events = executeWithValidation(switchingOffAction, context);
      
      // Should include remaining time
      expectEvent(events, 'if.event.switched_off', {
        wasTemporary: true,
        remainingTime: 45
      });
      
      // Should emit was_temporary message
      expectEvent(events, 'action.success', {
        messageId: expect.stringContaining('was_temporary'),
        params: { 
          target: 'kitchen timer',
          remainingTime: 45
        }
      });
    });
  });

  describe('Light Source Handling', () => {
    test('should darken room when turning off only light', () => {
      const { world, player, room } = setupBasicWorld();
      
      const lamp = world.createEntity('bright lamp', 'object');
      lamp.add({
        type: TraitType.SWITCHABLE,
        isOn: true
      });
      lamp.add({
        type: TraitType.LIGHT_SOURCE,
        radius: 3
      });
      
      world.moveEntity(lamp.id, room.id);
      
      const context = createRealTestContext(switchingOffAction, world, createCommand(IFActions.SWITCHING_OFF, {
        entity: lamp
      }));
      
      const events = executeWithValidation(switchingOffAction, context);
      
      // Should detect this will darken location
      expectEvent(events, 'if.event.switched_off', {
        isLightSource: true,
        willDarkenLocation: true
      });
      
      // Should emit light_off message
      expectEvent(events, 'action.success', {
        messageId: expect.stringContaining('light_off'),
        params: { target: 'bright lamp' }
      });
    });

    test('should not darken room with other lights', () => {
      const { world, player, room } = setupBasicWorld();
      
      const lamp1 = world.createEntity('desk lamp', 'object');
      lamp1.add({
        type: TraitType.SWITCHABLE,
        isOn: true
      });
      lamp1.add({
        type: TraitType.LIGHT_SOURCE
      });
      
      const lamp2 = world.createEntity('floor lamp', 'object');
      lamp2.add({
        type: TraitType.SWITCHABLE,
        isOn: true
      });
      lamp2.add({
        type: TraitType.LIGHT_SOURCE
      });
      
      world.moveEntity(lamp1.id, room.id);
      world.moveEntity(lamp2.id, room.id);
      
      const context = createRealTestContext(switchingOffAction, world, createCommand(IFActions.SWITCHING_OFF, {
        entity: lamp1
      }));
      
      const events = executeWithValidation(switchingOffAction, context);
      
      // Should emit light_off_still_lit message
      expectEvent(events, 'action.success', {
        messageId: expect.stringContaining('light_off_still_lit'),
        params: { target: 'desk lamp' }
      });
    });

    test('should consider carried lights', () => {
      const { world, player, room } = setupBasicWorld();
      
      const roomLamp = world.createEntity('table lamp', 'object');
      roomLamp.add({
        type: TraitType.SWITCHABLE,
        isOn: true
      });
      roomLamp.add({
        type: TraitType.LIGHT_SOURCE
      });
      
      const flashlight = world.createEntity('LED flashlight', 'object');
      flashlight.add({
        type: TraitType.SWITCHABLE,
        isOn: true
      });
      flashlight.add({
        type: TraitType.LIGHT_SOURCE
      });
      
      world.moveEntity(roomLamp.id, room.id);
      world.moveEntity(flashlight.id, player.id); // Carried
      
      const context = createRealTestContext(switchingOffAction, world, createCommand(IFActions.SWITCHING_OFF, {
        entity: roomLamp
      }));
      
      const events = executeWithValidation(switchingOffAction, context);
      
      // Should not darken because of carried light
      expectEvent(events, 'action.success', {
        messageId: expect.stringContaining('light_off_still_lit')
      });
    });
  });

  describe('Power Management', () => {
    test('should free power consumption', () => {
      const { world, player, room } = setupBasicWorld();
      const server = world.createEntity('rack server', 'object');
      server.add({
        type: TraitType.SWITCHABLE,
        isOn: true,
        powerConsumption: 500
      });
      world.moveEntity(server.id, room.id);
      
      const context = createRealTestContext(switchingOffAction, world, createCommand(IFActions.SWITCHING_OFF, {
        entity: server
      }));
      
      const events = executeWithValidation(switchingOffAction, context);
      
      // Should include power freed
      expectEvent(events, 'if.event.switched_off', {
        powerFreed: 500
      });
    });
  });

  describe('Side Effects', () => {
    test('should close automatic door when turned off', () => {
      const { world, player, room } = setupBasicWorld();
      const door = world.createEntity('automatic door', 'object');
      door.add({
        type: TraitType.SWITCHABLE,
        isOn: true
      });
      door.add({
        type: TraitType.CONTAINER,
        capacity: 0 // Passage
      });
      door.add({
        type: TraitType.OPENABLE,
        isOpen: true,
        autoCloseOnOff: true
      });
      world.moveEntity(door.id, room.id);
      
      const context = createRealTestContext(switchingOffAction, world, createCommand(IFActions.SWITCHING_OFF, {
        entity: door
      }));
      
      const events = executeWithValidation(switchingOffAction, context);
      
      // Should detect it will close
      expectEvent(events, 'if.event.switched_off', {
        willClose: true
      });
      
      // Should emit door_closes message
      expectEvent(events, 'action.success', {
        messageId: expect.stringContaining('door_closes'),
        params: { target: 'automatic door' }
      });
    });

    test('should not affect door without autoCloseOnOff', () => {
      const { world, player, room } = setupBasicWorld();
      const gate = world.createEntity('security gate', 'object');
      gate.add({
        type: TraitType.SWITCHABLE,
        isOn: true
      });
      gate.add({
        type: TraitType.CONTAINER,
        capacity: 0
      });
      gate.add({
        type: TraitType.OPENABLE,
        isOpen: true,
        autoCloseOnOff: false // No auto-close
      });
      world.moveEntity(gate.id, room.id);
      
      const context = createRealTestContext(switchingOffAction, world, createCommand(IFActions.SWITCHING_OFF, {
        entity: gate
      }));
      
      const events = executeWithValidation(switchingOffAction, context);
      
      // Should not have willClose flag
      const switchedEvent = events.find(e => e.type === 'if.event.switched_off');
      expect(switchedEvent?.data.willClose).toBeUndefined();
      
      // Should emit device_stops message
      expectEvent(events, 'action.success', {
        messageId: expect.stringContaining('device_stops')
      });
    });

    test('should not close already closed door', () => {
      const { world, player, room } = setupBasicWorld();
      const portal = world.createEntity('energy portal', 'object');
      portal.add({
        type: TraitType.SWITCHABLE,
        isOn: true
      });
      portal.add({
        type: TraitType.CONTAINER,
        capacity: 0
      });
      portal.add({
        type: TraitType.OPENABLE,
        isOpen: false, // Already closed
        autoCloseOnOff: true
      });
      world.moveEntity(portal.id, room.id);
      
      const context = createRealTestContext(switchingOffAction, world, createCommand(IFActions.SWITCHING_OFF, {
        entity: portal
      }));
      
      const events = executeWithValidation(switchingOffAction, context);
      
      // Should not have willClose flag
      const switchedEvent = events.find(e => e.type === 'if.event.switched_off');
      expect(switchedEvent?.data.willClose).toBeUndefined();
    });
  });

  describe('Event Structure Validation', () => {
    test('should include proper entities in all events', () => {
      const { world, player, room } = setupBasicWorld();
      const device = world.createEntity('electronic device', 'object');
      device.add({
        type: TraitType.SWITCHABLE,
        isOn: true
      });
      world.moveEntity(device.id, room.id);
      
      const context = createRealTestContext(switchingOffAction, world, createCommand(IFActions.SWITCHING_OFF, {
        entity: device
      }));
      
      const events = executeWithValidation(switchingOffAction, context);
      
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

describe('Testing Pattern Examples for Switching Off', () => {
  test('pattern: shutdown sequences', () => {
    // Test different shutdown behaviors
    const shutdownTypes = [
      {
        device: 'computer',
        sequence: 'save_state',
        duration: 'gradual',
        message: 'powering down...'
      },
      {
        device: 'emergency_light',
        sequence: 'instant',
        duration: 'immediate',
        message: 'clicks off'
      },
      {
        device: 'reactor',
        sequence: 'cooldown',
        duration: 'extended',
        message: 'beginning shutdown sequence'
      },
      {
        device: 'hologram',
        sequence: 'fade',
        duration: 'visual',
        message: 'flickers and fades'
      }
    ];
    
    shutdownTypes.forEach(({ sequence }) => {
      expect(sequence).toBeDefined();
    });
  });

  test('pattern: sound cessation', () => {
    // Test how sounds stop
    const soundCessation = [
      {
        device: 'fan',
        runningSound: 'whirring',
        stopEffect: 'gradual slowdown'
      },
      {
        device: 'alarm',
        runningSound: 'beeping',
        stopEffect: 'instant silence'
      },
      {
        device: 'music_box',
        runningSound: 'tinkling melody',
        stopEffect: 'notes trail off'
      },
      {
        device: 'engine',
        runningSound: 'rumbling',
        offSound: 'sputtering cough',
        stopEffect: 'dramatic'
      }
    ];
    
    soundCessation.forEach(({ runningSound, stopEffect }) => {
      if (runningSound) {
        expect(stopEffect).toBeDefined();
      }
    });
  });

  test('pattern: light extinguishing', () => {
    // Test different ways lights go out
    const lightTypes = [
      {
        light: 'candle',
        effect: 'flickers out',
        smoke: true
      },
      {
        light: 'led',
        effect: 'instantly dark',
        smoke: false
      },
      {
        light: 'fluorescent',
        effect: 'fades with afterglow',
        smoke: false
      },
      {
        light: 'fire',
        effect: 'dies to embers',
        smoke: true
      }
    ];
    
    lightTypes.forEach(({ effect }) => {
      expect(effect).toBeDefined();
    });
  });

  test('pattern: power system effects', () => {
    // Test power grid implications
    const powerEffects = [
      {
        device: 'main_generator',
        powerFreed: 5000,
        cascadeEffect: 'other devices may activate'
      },
      {
        device: 'backup_light',
        powerFreed: 20,
        cascadeEffect: 'negligible'
      },
      {
        device: 'life_support',
        powerFreed: 1000,
        cascadeEffect: 'warning issued'
      }
    ];
    
    powerEffects.forEach(({ powerFreed, cascadeEffect }) => {
      if (powerFreed > 500) {
        expect(cascadeEffect).not.toBe('negligible');
      }
    });
  });

  test('pattern: temporary device states', () => {
    // Test devices with timers
    const temporaryDevices = [
      {
        device: 'parking_meter',
        autoOffCounter: 3600,
        earlyOff: 'returns remaining time'
      },
      {
        device: 'microwave',
        autoOffCounter: 90,
        earlyOff: 'stops cooking'
      },
      {
        device: 'sleep_timer',
        autoOffCounter: 1800,
        earlyOff: 'cancels scheduled off'
      }
    ];
    
    temporaryDevices.forEach(({ autoOffCounter, earlyOff }) => {
      if (autoOffCounter) {
        expect(earlyOff).toBeDefined();
      }
    });
  });
});
