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

      expectEvent(events, 'action.blocked', {
        messageId: 'no_target'
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

      expectEvent(events, 'action.blocked', {
        messageId: 'not_switchable',
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

      expectEvent(events, 'action.blocked', {
        messageId: 'already_on',
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

      expectEvent(events, 'action.blocked', {
        messageId: 'no_power',
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
      expectEvent(events, 'action.success', {
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
      expectEvent(events, 'action.success', {
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
      expectEvent(events, 'action.success', {
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
      expectEvent(events, 'action.success', {
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
      expectEvent(events, 'action.success', {
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
      expectEvent(events, 'action.success', {
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
      expectEvent(events, 'action.success', {
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
      expectEvent(events, 'action.success', {
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
      expectEvent(events, 'action.success', {
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

describe('Testing Pattern Examples for Switching On', () => {
  test('pattern: device categories', () => {
    // Test different categories of switchable devices
    const world = new WorldModel();
    const deviceCategories = [
      {
        category: 'lighting',
        devices: ['lamp', 'flashlight', 'lantern', 'torch'],
        trait: TraitType.LIGHT_SOURCE,
        message: 'light_on'
      },
      {
        category: 'appliances',
        devices: ['fan', 'heater', 'radio', 'television'],
        trait: undefined,
        message: 'device_humming'
      },
      {
        category: 'machinery',
        devices: ['generator', 'pump', 'motor'],
        trait: undefined,
        message: 'with_sound' // Usually have custom sounds
      },
      {
        category: 'electronics',
        devices: ['computer', 'phone', 'tablet'],
        trait: undefined,
        message: 'switched_on'
      }
    ];
    
    deviceCategories.forEach(({ devices, trait }) => {
      devices.forEach(device => {
        const entity = world.createEntity(device, 'object');
        entity.add({
          type: TraitType.SWITCHABLE,
          isOn: false
        });
        
        if (trait) {
          entity.add({ type: trait });
        }
        
        expect(entity.has(TraitType.SWITCHABLE)).toBe(true);
      });
    });
  });

  test('pattern: power system integration', () => {
    // Test power requirement variations
    const powerScenarios = [
      {
        device: 'battery_lamp',
        requiresPower: false,
        hasPower: undefined,
        result: 'works'
      },
      {
        device: 'wall_tv',
        requiresPower: true,
        hasPower: true,
        result: 'works'
      },
      {
        device: 'unplugged_radio',
        requiresPower: true,
        hasPower: false,
        result: 'fails'
      },
      {
        device: 'generator',
        requiresPower: false,
        providePower: true,
        result: 'works and provides power'
      }
    ];
    
    powerScenarios.forEach(({ requiresPower, hasPower, result }) => {
      if (requiresPower && !hasPower) {
        expect(result).toBe('fails');
      } else {
        expect(result).toContain('works');
      }
    });
  });

  test('pattern: light propagation', () => {
    // Test how light affects surroundings
    const lightEffects = [
      {
        location: 'in_hand',
        radius: 2,
        affects: 'current room'
      },
      {
        location: 'on_table',
        radius: 3,
        affects: 'current room'
      },
      {
        location: 'in_closed_container',
        radius: 2,
        affects: 'nothing' // Light blocked
      },
      {
        location: 'adjacent_room',
        radius: 1,
        affects: 'only that room'
      }
    ];
    
    lightEffects.forEach(({ location, affects }) => {
      expect(affects).toBeDefined();
    });
  });

  test('pattern: activation sounds', () => {
    // Test different activation sounds
    const sounds = [
      {
        device: 'fluorescent_light',
        onSound: 'a brief flicker and buzz',
        runningSound: undefined
      },
      {
        device: 'old_computer',
        onSound: 'a series of beeps',
        runningSound: 'fan whirring'
      },
      {
        device: 'diesel_generator',
        onSound: 'a loud coughing and rumble',
        runningSound: 'steady rumbling'
      },
      {
        device: 'electric_fence',
        onSound: 'a sharp crack',
        runningSound: 'low humming'
      }
    ];
    
    sounds.forEach(({ onSound }) => {
      expect(onSound).toBeDefined();
    });
  });

  test('pattern: temporary devices', () => {
    // Test devices with auto-off timers
    const timedDevices = [
      {
        device: 'motion_light',
        autoOffTime: 60, // 1 minute
        purpose: 'energy saving'
      },
      {
        device: 'hand_dryer',
        autoOffTime: 30, // 30 seconds
        purpose: 'hygiene device'
      },
      {
        device: 'toaster',
        autoOffTime: 120, // 2 minutes
        purpose: 'safety'
      },
      {
        device: 'demo_mode',
        autoOffTime: 300, // 5 minutes
        purpose: 'showcase'
      }
    ];
    
    timedDevices.forEach(({ autoOffTime }) => {
      expect(autoOffTime).toBeGreaterThan(0);
    });
  });
});
