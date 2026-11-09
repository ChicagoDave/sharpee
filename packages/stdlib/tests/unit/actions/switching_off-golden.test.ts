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
import { TraitType, SwitchableTrait, LightSourceTrait, ContainerTrait, OpenableTrait, RoomTrait } from '@sharpee/world-model';
import {
  createRealTestContext,
  setupBasicWorld,
  expectEvent,
  executeWithValidation,
  TestData,
  createCommand,
  dataOf
} from '../../test-utils';
import type { SwitchedOffEventData } from '../../../src/actions/standard/switching_off/switching_off-events';

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

      expectEvent(events, 'if.event.switch_off_blocked', {
        messageId: expect.stringContaining('no_target')
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

      expectEvent(events, 'if.event.switch_off_blocked', {
        messageId: expect.stringContaining('not_switchable'),
        params: { target: { name: 'ordinary rock' } }
      });
    });

    test('should fail when already off', () => {
      const { world, player, room } = setupBasicWorld();
      const radio = world.createEntity('portable radio', 'object');
      radio.add(new SwitchableTrait({ isOn: false })); // Already off
      world.moveEntity(radio.id, room.id);

      const context = createRealTestContext(switchingOffAction, world, createCommand(IFActions.SWITCHING_OFF, {
        entity: radio
      }));

      const events = executeWithValidation(switchingOffAction, context);

      expectEvent(events, 'if.event.switch_off_blocked', {
        messageId: expect.stringContaining('already_off'),
        params: { target: { name: 'portable radio' } }
      });
    });
  });

  describe('Basic Device Switching', () => {
    test('should switch off simple device', () => {
      const { world, player, room } = setupBasicWorld();
      const fan = world.createEntity('ceiling fan', 'object');
      fan.add(new SwitchableTrait({ isOn: true }));
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
      expectEvent(events, 'if.event.switched_off', {
        messageId: expect.stringContaining('device_stops'),
        params: { target: { name: 'ceiling fan' } }
      });
    });

    test('should handle device with custom off sound', () => {
      const { world, player, room } = setupBasicWorld();
      const engine = world.createEntity('diesel engine', 'object');
      engine.add(new SwitchableTrait({ isOn: true, offSound: 'a sputtering cough' }));
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
      expectEvent(events, 'if.event.switched_off', {
        messageId: expect.stringContaining('with_sound'),
        params: { 
          target: { name: 'diesel engine' },
          sound: 'a sputtering cough'
        }
      });
    });

    test('should handle device with running sound', () => {
      const { world, player, room } = setupBasicWorld();
      const generator = world.createEntity('power generator', 'object');
      generator.add(new SwitchableTrait({ isOn: true, runningSound: 'a steady hum' }));
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
      expectEvent(events, 'if.event.switched_off', {
        messageId: expect.stringContaining('silence_falls'),
        params: { target: { name: 'power generator' } }
      });
    });

    test('should handle temporary device', () => {
      const { world, player, room } = setupBasicWorld();
      const timer = world.createEntity('kitchen timer', 'object');
      timer.add(new SwitchableTrait({ isOn: true, autoOffCounter: 45 })); // 45 seconds remaining
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
      expectEvent(events, 'if.event.switched_off', {
        messageId: expect.stringContaining('was_temporary'),
        params: { 
          target: { name: 'kitchen timer' },
          remainingTime: 45
        }
      });
    });
  });

  describe('Light Source Handling', () => {
    test('should darken room when turning off only light', () => {
      const { world, player, room } = setupBasicWorld();
      room.add(new RoomTrait({ requiresLight: true })); // lit only by the lamp

      const lamp = world.createEntity('bright lamp', 'object');
      lamp.add(new SwitchableTrait({ isOn: true }));
      lamp.add(new LightSourceTrait({ brightness: 3 }));
      
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
      expectEvent(events, 'if.event.switched_off', {
        messageId: expect.stringContaining('light_off'),
        params: { target: { name: 'bright lamp' } }
      });

      // The lamp is off and dark: the room's only light is gone
      expect(lamp.getTrait(SwitchableTrait)?.isOn).toBe(false);
      expect(lamp.getTrait(LightSourceTrait)?.isLit).toBe(false);
    });

    test('should not claim darkness in a lit room', () => {
      const { world, player, room } = setupBasicWorld(); // the room does not require light
      const lamp = world.createEntity('oil lamp', 'object');
      lamp.add(new SwitchableTrait({ isOn: true }));
      lamp.add(new LightSourceTrait({ brightness: 2 }));
      world.moveEntity(lamp.id, room.id);

      const context = createRealTestContext(switchingOffAction, world, createCommand(IFActions.SWITCHING_OFF, {
        entity: lamp
      }));

      const events = executeWithValidation(switchingOffAction, context);

      // The room was lit before and after: still_lit, and no darkening claim
      expectEvent(events, 'if.event.switched_off', {
        isLightSource: true,
        messageId: expect.stringContaining('light_off_still_lit')
      });
      const switched = events.find(e => e.type === 'if.event.switched_off');
      expect((switched?.data as SwitchedOffEventData).willDarkenLocation).toBeFalsy();
      // The lamp itself still switched off and no longer gives light
      expect(lamp.getTrait(SwitchableTrait)?.isOn).toBe(false);
      expect(lamp.getTrait(LightSourceTrait)?.isLit).toBe(false);
    });

    test('should not darken room with other lights', () => {
      const { world, player, room } = setupBasicWorld();
      room.add(new RoomTrait({ requiresLight: true })); // dark, but the floor lamp stays on

      const lamp1 = world.createEntity('desk lamp', 'object');
      lamp1.add(new SwitchableTrait({ isOn: true }));
      lamp1.add(new LightSourceTrait());
      
      const lamp2 = world.createEntity('floor lamp', 'object');
      lamp2.add(new SwitchableTrait({ isOn: true }));
      lamp2.add(new LightSourceTrait());
      
      world.moveEntity(lamp1.id, room.id);
      world.moveEntity(lamp2.id, room.id);
      
      const context = createRealTestContext(switchingOffAction, world, createCommand(IFActions.SWITCHING_OFF, {
        entity: lamp1
      }));
      
      const events = executeWithValidation(switchingOffAction, context);
      
      // Should emit light_off_still_lit message
      expectEvent(events, 'if.event.switched_off', {
        messageId: expect.stringContaining('light_off_still_lit'),
        params: { target: { name: 'desk lamp' } }
      });
    });

    test('should consider carried lights', () => {
      const { world, player, room } = setupBasicWorld();
      room.add(new RoomTrait({ requiresLight: true })); // dark, but the flashlight in hand stays on

      const roomLamp = world.createEntity('table lamp', 'object');
      roomLamp.add(new SwitchableTrait({ isOn: true }));
      roomLamp.add(new LightSourceTrait());
      
      const flashlight = world.createEntity('LED flashlight', 'object');
      flashlight.add(new SwitchableTrait({ isOn: true }));
      flashlight.add(new LightSourceTrait());
      
      world.moveEntity(roomLamp.id, room.id);
      world.moveEntity(flashlight.id, player.id); // Carried
      
      const context = createRealTestContext(switchingOffAction, world, createCommand(IFActions.SWITCHING_OFF, {
        entity: roomLamp
      }));
      
      const events = executeWithValidation(switchingOffAction, context);
      
      // Should not darken because of carried light
      expectEvent(events, 'if.event.switched_off', {
        messageId: expect.stringContaining('light_off_still_lit')
      });
    });
  });

  describe('Power Management', () => {
    test('should free power consumption', () => {
      const { world, player, room } = setupBasicWorld();
      const server = world.createEntity('rack server', 'object');
      server.add(new SwitchableTrait({ isOn: true, powerConsumption: 500 }));
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

  describe('Side Effects (ADR-392 D3: auto-close)', () => {
    test('switching off a thing that closes when switched off closes it and says so', () => {
      const { world, player, room } = setupBasicWorld();
      const door = world.createEntity('automatic door', 'object');
      door.add(new SwitchableTrait({ isOn: true }));
      door.add(new ContainerTrait()); // Passage
      door.add(new OpenableTrait({ isOpen: true, autoCloseOnOff: true }));
      world.moveEntity(door.id, room.id);

      // PRECONDITION
      expect(door.get(OpenableTrait)!.isOpen).toBe(true);

      const context = createRealTestContext(switchingOffAction, world, createCommand(IFActions.SWITCHING_OFF, {
        entity: door
      }));

      const events = executeWithValidation(switchingOffAction, context);

      // THE state assertion: the switch-off closed it
      expect(door.get(OpenableTrait)!.isOpen).toBe(false);
      expect(door.get(SwitchableTrait)!.isOn).toBe(false);

      // Should detect it will close
      expectEvent(events, 'if.event.switched_off', {
        willClose: true
      });

      // Should emit door_closes message
      expectEvent(events, 'if.event.switched_off', {
        messageId: expect.stringContaining('door_closes'),
        params: { target: { name: 'automatic door' } }
      });

      // The close is its own fact
      expectEvent(events, 'if.event.closed', {
        targetId: door.id,
        actorId: player.id
      });
    });

    test('should not affect door without autoCloseOnOff', () => {
      const { world, player, room } = setupBasicWorld();
      const gate = world.createEntity('security gate', 'object');
      gate.add(new SwitchableTrait({ isOn: true }));
      gate.add(new ContainerTrait());
      gate.add(new OpenableTrait({ isOpen: true, autoCloseOnOff: false }));
      world.moveEntity(gate.id, room.id);
      
      const context = createRealTestContext(switchingOffAction, world, createCommand(IFActions.SWITCHING_OFF, {
        entity: gate
      }));
      
      const events = executeWithValidation(switchingOffAction, context);
      
      // Should not have willClose flag, and the gate stays open
      const switchedEvent = events.find(e => e.type === 'if.event.switched_off');
      expect(dataOf<SwitchedOffEventData>(switchedEvent)?.willClose).toBeUndefined();
      expect(gate.get(OpenableTrait)!.isOpen).toBe(true);
      expect(events.find(e => e.type === 'if.event.closed')).toBeUndefined();

      // Should emit device_stops message
      expectEvent(events, 'if.event.switched_off', {
        messageId: expect.stringContaining('device_stops')
      });
    });

    test('should not close already closed door', () => {
      const { world, player, room } = setupBasicWorld();
      const portal = world.createEntity('energy portal', 'object');
      portal.add(new SwitchableTrait({ isOn: true }));
      portal.add(new ContainerTrait());
      portal.add(new OpenableTrait({ isOpen: false, autoCloseOnOff: true })); // already closed
      world.moveEntity(portal.id, room.id);

      const context = createRealTestContext(switchingOffAction, world, createCommand(IFActions.SWITCHING_OFF, {
        entity: portal
      }));

      const events = executeWithValidation(switchingOffAction, context);

      // Should not have willClose flag, no closed event, still closed, and no door_closes line
      const switchedEvent = events.find(e => e.type === 'if.event.switched_off');
      expect(dataOf<SwitchedOffEventData>(switchedEvent)?.willClose).toBeUndefined();
      expect(dataOf<{ messageId?: string }>(switchedEvent)?.messageId).not.toContain('door_closes');
      expect(events.find(e => e.type === 'if.event.closed')).toBeUndefined();
      expect(portal.get(OpenableTrait)!.isOpen).toBe(false);
    });
  });

  describe('Event Structure Validation', () => {
    test('should include proper entities in all events', () => {
      const { world, player, room } = setupBasicWorld();
      const device = world.createEntity('electronic device', 'object');
      device.add(new SwitchableTrait({ isOn: true }));
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

/**
 * World State Mutation Tests
 *
 * These tests verify that the switching_off action actually mutates world state,
 * not just emits events. This catches bugs like the "dropping bug" where
 * actions appeared to work (good messages) but didn't actually change state.
 */
describe('World State Mutations', () => {
  test('should actually set isOn to false after switching off', () => {
    const { world, player, room } = setupBasicWorld();
    const lamp = world.createEntity('desk lamp', 'object');
    lamp.add(new SwitchableTrait({ isOn: true }));
    world.moveEntity(lamp.id, room.id);

    // VERIFY PRECONDITION: lamp is on
    const switchableBefore = lamp.get(SwitchableTrait)!;
    expect(switchableBefore.isOn).toBe(true);

    const command = createCommand(IFActions.SWITCHING_OFF, {
      entity: lamp
    });
    const context = createRealTestContext(switchingOffAction, world, command);

    const validation = switchingOffAction.validate(context);
    expect(validation.valid).toBe(true);
    switchingOffAction.execute(context);

    // VERIFY POSTCONDITION: lamp is now off
    const switchableAfter = lamp.get(SwitchableTrait)!;
    expect(switchableAfter.isOn).toBe(false);
  });

  test('should actually set isOn to false and clear autoOffCounter', () => {
    const { world, player, room } = setupBasicWorld();
    const timer = world.createEntity('kitchen timer', 'object');
    timer.add(new SwitchableTrait({ isOn: true, autoOffCounter: 60 })); // 60 seconds remaining
    world.moveEntity(timer.id, room.id);

    // VERIFY PRECONDITION: timer is on with counter
    const switchableBefore = timer.get(SwitchableTrait)!;
    expect(switchableBefore.isOn).toBe(true);
    expect(switchableBefore.autoOffCounter).toBe(60);

    const command = createCommand(IFActions.SWITCHING_OFF, {
      entity: timer
    });
    const context = createRealTestContext(switchingOffAction, world, command);

    const validation = switchingOffAction.validate(context);
    expect(validation.valid).toBe(true);
    switchingOffAction.execute(context);

    // VERIFY POSTCONDITION: timer is now off and counter is cleared
    const switchableAfter = timer.get(SwitchableTrait)!;
    expect(switchableAfter.isOn).toBe(false);
    expect(switchableAfter.autoOffCounter).toBe(0);
  });

  test('should NOT change isOn when already off', () => {
    const { world, player, room } = setupBasicWorld();
    const radio = world.createEntity('portable radio', 'object');
    radio.add(new SwitchableTrait({ isOn: false })); // Already off
    world.moveEntity(radio.id, room.id);

    // VERIFY PRECONDITION: radio is off
    const switchableBefore = radio.get(SwitchableTrait)!;
    expect(switchableBefore.isOn).toBe(false);

    const command = createCommand(IFActions.SWITCHING_OFF, {
      entity: radio
    });
    const context = createRealTestContext(switchingOffAction, world, command);

    // Validation should fail
    const validation = switchingOffAction.validate(context);
    expect(validation.valid).toBe(false);
    expect(validation.error).toContain('already_off');

    // VERIFY POSTCONDITION: radio is still off (no change)
    const switchableAfter = radio.get(SwitchableTrait)!;
    expect(switchableAfter.isOn).toBe(false);
  });

  test('should NOT change state when target is not switchable', () => {
    const { world, player, room } = setupBasicWorld();
    const rock = world.createEntity('solid rock', 'object');
    // No switchable trait
    world.moveEntity(rock.id, room.id);

    const command = createCommand(IFActions.SWITCHING_OFF, {
      entity: rock
    });
    const context = createRealTestContext(switchingOffAction, world, command);

    // Validation should fail
    const validation = switchingOffAction.validate(context);
    expect(validation.valid).toBe(false);
    expect(validation.error).toContain('not_switchable');

    // Object should not have switchable trait at all
    expect(rock.has(TraitType.SWITCHABLE)).toBe(false);
  });

  test('should actually turn off a light source and coordinate with LightSourceBehavior', () => {
    const { world, player, room } = setupBasicWorld();
    const flashlight = world.createEntity('LED flashlight', 'object');
    flashlight.add(new SwitchableTrait({ isOn: true }));
    flashlight.add(new LightSourceTrait({ isLit: true, brightness: 3 }));
    world.moveEntity(flashlight.id, player.id);

    // VERIFY PRECONDITION: flashlight is on and lit
    const switchableBefore = flashlight.get(SwitchableTrait)!;
    const lightSourceBefore = flashlight.get(LightSourceTrait)!;
    expect(switchableBefore.isOn).toBe(true);
    expect(lightSourceBefore.isLit).toBe(true);

    const command = createCommand(IFActions.SWITCHING_OFF, {
      entity: flashlight
    });
    const context = createRealTestContext(switchingOffAction, world, command);

    const validation = switchingOffAction.validate(context);
    expect(validation.valid).toBe(true);
    switchingOffAction.execute(context);

    // VERIFY POSTCONDITION: flashlight is now off AND not lit
    const switchableAfter = flashlight.get(SwitchableTrait)!;
    const lightSourceAfter = flashlight.get(LightSourceTrait)!;
    expect(switchableAfter.isOn).toBe(false);
    expect(lightSourceAfter.isLit).toBe(false);
  });

  test('should turn off device with power requirements', () => {
    const { world, player, room } = setupBasicWorld();
    const computer = world.createEntity('desktop computer', 'object');
    computer.add(new SwitchableTrait({ isOn: true, requiresPower: true, hasPower: true, powerConsumption: 250 }));
    world.moveEntity(computer.id, room.id);

    // VERIFY PRECONDITION: computer is on
    const switchableBefore = computer.get(SwitchableTrait)!;
    expect(switchableBefore.isOn).toBe(true);

    const command = createCommand(IFActions.SWITCHING_OFF, {
      entity: computer
    });
    const context = createRealTestContext(switchingOffAction, world, command);

    const validation = switchingOffAction.validate(context);
    expect(validation.valid).toBe(true);
    switchingOffAction.execute(context);

    // VERIFY POSTCONDITION: computer is now off
    const switchableAfter = computer.get(SwitchableTrait)!;
    expect(switchableAfter.isOn).toBe(false);
  });
});
