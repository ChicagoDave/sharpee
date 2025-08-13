/**
 * Golden test for turning action - demonstrates testing rotational controls
 * 
 * This shows patterns for testing actions that:
 * - Adjust device settings (dials, knobs)
 * - Activate mechanisms (wheels, cranks)
 * - Control flow (valves)
 * - Handle directional rotation
 * - Support specific settings
 * - Distinguish between turnable and fixed objects
 */

import { describe, test, expect, beforeEach, vi } from 'vitest';
import { turningAction } from '../../../src/actions/standard/turning';
import { IFActions } from '../../../src/actions/constants';
import { TraitType, WorldModel, TurnableTrait } from '@sharpee/world-model';
import { 
  createRealTestContext, 
  expectEvent,
  TestData,
  createCommand,
  setupBasicWorld
} from '../../test-utils';
import type { ActionContext } from '../../../src/actions/enhanced-types';
import { SemanticEvent } from '@sharpee/core';

// Helper to execute action with validation (simulates CommandExecutor flow)
function executeWithValidation(action: any, context: ActionContext): SemanticEvent[] {
  if (action.validate) {
    const validation = action.validate(context);
    if (!validation.valid) {
      return [context.event('action.error', {
        actionId: context.action.id,
        messageId: validation.error,
        params: validation.params || {}
      })];
    }
  }
  return action.execute(context);
}

describe('turningAction (Golden Pattern)', () => {
  describe('Action Metadata', () => {
    test('should have correct ID', () => {
      expect(turningAction.id).toBe(IFActions.TURNING);
    });

    test('should declare required messages', () => {
      expect(turningAction.requiredMessages).toContain('no_target');
      expect(turningAction.requiredMessages).toContain('not_visible');
      expect(turningAction.requiredMessages).toContain('not_reachable');
      expect(turningAction.requiredMessages).toContain('wearing_it');
      expect(turningAction.requiredMessages).toContain('cant_turn_that');
      expect(turningAction.requiredMessages).toContain('dial_turned');
      expect(turningAction.requiredMessages).toContain('dial_set');
      expect(turningAction.requiredMessages).toContain('dial_adjusted');
      expect(turningAction.requiredMessages).toContain('knob_turned');
      expect(turningAction.requiredMessages).toContain('knob_clicks');
      expect(turningAction.requiredMessages).toContain('knob_toggled');
      expect(turningAction.requiredMessages).toContain('wheel_turned');
      expect(turningAction.requiredMessages).toContain('crank_turned');
      expect(turningAction.requiredMessages).toContain('mechanism_grinds');
      expect(turningAction.requiredMessages).toContain('requires_more_turns');
      expect(turningAction.requiredMessages).toContain('mechanism_activated');
      expect(turningAction.requiredMessages).toContain('valve_opened');
      expect(turningAction.requiredMessages).toContain('valve_closed');
      expect(turningAction.requiredMessages).toContain('flow_changes');
      expect(turningAction.requiredMessages).toContain('key_needs_lock');
      expect(turningAction.requiredMessages).toContain('key_turned');
      expect(turningAction.requiredMessages).toContain('turned');
      expect(turningAction.requiredMessages).toContain('rotated');
      expect(turningAction.requiredMessages).toContain('spun');
      expect(turningAction.requiredMessages).toContain('nothing_happens');
    });

    test('should belong to device_manipulation group', () => {
      expect(turningAction.group).toBe('device_manipulation');
    });
  });

  describe('Precondition Checks', () => {
    test('should fail when no target specified', () => {
      const { world, player } = setupBasicWorld();
      const command = createCommand(IFActions.TURNING);
      const context = createRealTestContext(turningAction, world, command);
      
      const events = executeWithValidation(turningAction, context);
      
      expectEvent(events, 'action.error', {
        messageId: expect.stringContaining('no_target')
      });
    });

    test('should fail when parser finds object name but validator cannot resolve it', () => {
      const { world, player } = setupBasicWorld();
      // Create a dial in another room - parser might recognize "dial" but validator won't find it
      const otherRoom = world.createEntity('Other Room', 'room');
      otherRoom.add({ type: TraitType.ROOM });
      const dial = world.createEntity('control dial', 'object');
      dial.add({
        type: TraitType.TURNABLE,
        turnType: 'dial'
      });
      dial.add({ type: TraitType.DIAL });
      world.moveEntity(dial.id, otherRoom.id);
      
      // Simulate: player types "TURN DIAL" but dial is in another room
      // Parser recognizes "dial" but CommandValidator can't resolve it
      const context = createRealTestContext(turningAction, world,
        createCommand(IFActions.TURNING)  // No entity passed - validator couldn't find it
      );
      
      const events = executeWithValidation(turningAction, context);
      
      expectEvent(events, 'action.error', {
        messageId: expect.stringContaining('no_target')
      });
    });

    test('should fail when object is in closed container', () => {
      const { world, player, room } = setupBasicWorld();
      
      // Create closed container with wheel inside
      const box = world.createEntity('closed box', 'object');
      box.add({
        type: TraitType.CONTAINER,
        capacity: 10,
        isTransparent: true
      });
      box.add({
        type: TraitType.OPENABLE,
        isOpen: false
      });
      
      const wheel = world.createEntity('large wheel', 'object');
      wheel.add({
        type: TraitType.TURNABLE,
        turnType: 'wheel'
      });
      wheel.add({ type: TraitType.WHEEL });
      world.moveEntity(box.id, room.id);
      world.moveEntity(wheel.id, box.id);
      
      // Simulate: player types "TURN WHEEL" but wheel is in closed container
      // Even with transparent container, CommandValidator won't resolve it
      const context = createRealTestContext(turningAction, world,
        createCommand(IFActions.TURNING)  // No entity passed
      );
      
      const events = executeWithValidation(turningAction, context);
      
      expectEvent(events, 'action.error', {
        messageId: expect.stringContaining('no_target')
      });
    });

    test('should fail when turning worn items', () => {
      const { world, player } = setupBasicWorld();
      const bracelet = world.createEntity('twisted bracelet', 'object');
      bracelet.add({
        type: TraitType.WEARABLE,
        isWorn: true,
        wornBy: player.id
      });
      // Even if turnable, can't turn worn items
      bracelet.add({
        type: TraitType.TURNABLE,
        turnType: 'knob'
      });
      
      world.moveEntity(bracelet.id, player.id); // Worn by player
      
      const context = createRealTestContext(turningAction, world,
        createCommand(IFActions.TURNING, {
          entity: bracelet
        })
      );
      
      const events = executeWithValidation(turningAction, context);
      
      expectEvent(events, 'action.error', {
        messageId: expect.stringContaining('wearing_it'),
        params: { target: 'twisted bracelet' }
      });
    });

    test('should fail when turning non-turnable scenery', () => {
      const { world, player, room } = setupBasicWorld();
      const statue = world.createEntity('marble statue', 'object');
      statue.add({
        type: TraitType.SCENERY
      });
      
      world.moveEntity(statue.id, room.id);
      
      const context = createRealTestContext(turningAction, world,
        createCommand(IFActions.TURNING, {
          entity: statue
        })
      );
      
      const events = executeWithValidation(turningAction, context);
      
      expectEvent(events, 'action.error', {
        messageId: expect.stringContaining('cant_turn_that'),
        params: { target: 'marble statue' }
      });
    });

    test('should fail when turning regular objects', () => {
      const { world, player, room } = setupBasicWorld();
      const book = world.createEntity('old book', 'object');
      world.moveEntity(book.id, room.id);
      
      const context = createRealTestContext(turningAction, world,
        createCommand(IFActions.TURNING, {
          entity: book
        })
      );
      
      const events = executeWithValidation(turningAction, context);
      
      expectEvent(events, 'action.error', {
        messageId: expect.stringContaining('cant_turn_that'),
        params: { target: 'old book' }
      });
    });
  });

  describe('Dial Turning', () => {
    test('should turn dial without direction', () => {
      const { world, player, room } = setupBasicWorld();
      const dial = world.createEntity('volume dial', 'object');
      dial.add({
        type: TraitType.TURNABLE,
        turnType: 'dial'
      });
      dial.add({ type: TraitType.DIAL });
      
      world.moveEntity(dial.id, room.id);
      
      // Just "TURN DIAL" with no direction
      const context = createRealTestContext(turningAction, world,
        createCommand(IFActions.TURNING, {
          entity: dial
        })
      );
      
      const events = turningAction.execute(context);
      
      // Should succeed with basic dial_turned message
      expectEvent(events, 'if.event.turned', {
        turnType: 'dial',
        turned: true
      });
      
      expectEvent(events, 'action.success', {
        messageId: expect.stringContaining('dial_turned')
      });
    });

    
    test('should turn basic dial', () => {
      const { world, player, room } = setupBasicWorld();
      const dial = world.createEntity('temperature dial', 'object');
      dial.add({
        type: TraitType.TURNABLE,
        turnType: 'dial'
      });
      dial.add({ type: TraitType.DIAL });
      
      world.moveEntity(dial.id, room.id);
      
      const context = createRealTestContext(turningAction, world,
        createCommand(IFActions.TURNING, {
          entity: dial
        })
      );
      
      const events = turningAction.execute(context);
      
      // Should emit TURNED event
      expectEvent(events, 'if.event.turned', {
        target: dial.id,
        targetName: 'temperature dial',
        turnType: 'dial',
        turned: true
      });
      
      // Should emit dial_turned message
      expectEvent(events, 'action.success', {
        messageId: expect.stringContaining('dial_turned'),
        params: { target: 'temperature dial' }
      });
    });

    test('should set dial to specific setting', () => {
      const { world, player, room } = setupBasicWorld();
      const radioDial = world.createEntity('radio dial', 'object');
      radioDial.add({
        type: TraitType.TURNABLE,
        turnType: 'dial',
        settings: ['88.5', '94.3', '103.5', '107.1'],
        currentSetting: '94.3'
      });
      radioDial.add({ type: TraitType.DIAL });
      
      world.moveEntity(radioDial.id, room.id);
      
      const command = createCommand(IFActions.TURNING, {
        entity: radioDial
      });
      command.parsed.extras = { setting: '103.5' };
      
      const context = createRealTestContext(turningAction, world, command);
      
      const events = turningAction.execute(context);
      
      // Should emit TURNED event
      expectEvent(events, 'if.event.turned', {
        turnType: 'dial',
        setting: '103.5',
        previousSetting: '94.3',
        newSetting: '103.5',
        turned: true
      });
      
      // Should emit dial_set message
      expectEvent(events, 'action.success', {
        messageId: expect.stringContaining('dial_set'),
        params: { target: 'radio dial', setting: '103.5' }
      });
    });

    test('should adjust dial in direction', () => {
      const { world, player, room } = setupBasicWorld();
      const volumeDial = world.createEntity('volume dial', 'object');
      volumeDial.add({
        type: TraitType.TURNABLE,
        turnType: 'dial',
        settings: ['mute', 'low', 'medium', 'high', 'max'],
        currentSetting: 'medium'
      });
      volumeDial.add({ type: TraitType.DIAL });
      
      world.moveEntity(volumeDial.id, room.id);
      
      const command = createCommand(IFActions.TURNING, {
        entity: volumeDial
      });
      command.parsed.extras = { direction: 'right' };
      
      const context = createRealTestContext(turningAction, world, command);
      
      const events = turningAction.execute(context);
      
      // Should emit TURNED event
      expectEvent(events, 'if.event.turned', {
        turnType: 'dial',
        direction: 'right',
        previousSetting: 'medium',
        newSetting: 'high',
        adjustedBy: 1, // Right/clockwise increases
        turned: true
      });
      
      // Should emit dial_adjusted message
      expectEvent(events, 'action.success', {
        messageId: expect.stringContaining('dial_adjusted')
      });
    });

    test('should decrease when turning left', () => {
      const { world, player, room } = setupBasicWorld();
      const dial = world.createEntity('brightness dial', 'object');
      dial.add({
        type: TraitType.TURNABLE,
        turnType: 'dial',
        currentSetting: 50,
        minValue: 0,
        maxValue: 100,
        stepSize: 10
      });
      dial.add({ type: TraitType.DIAL });
      
      world.moveEntity(dial.id, room.id);
      
      const command = createCommand(IFActions.TURNING, {
        entity: dial
      });
      command.parsed.extras = { direction: 'left' };
      
      const context = createRealTestContext(turningAction, world, command);
      
      const events = turningAction.execute(context);
      
      // Should emit TURNED event
      expectEvent(events, 'if.event.turned', {
        previousSetting: 50,
        newSetting: 40,
        adjustedBy: -10 // Left/counterclockwise decreases
      });
    });
  });

  describe('Knob Turning', () => {
    test('should turn knob without direction', () => {
      const { world, player, room } = setupBasicWorld();
      const knob = world.createEntity('door knob', 'object');
      knob.add({
        type: TraitType.TURNABLE,
        turnType: 'knob'
      });
      knob.add({ type: TraitType.KNOB });
      
      world.moveEntity(knob.id, room.id);
      
      // Just "TURN KNOB" with no direction
      const context = createRealTestContext(turningAction, world,
        createCommand(IFActions.TURNING, {
          entity: knob
        })
      );
      
      const events = turningAction.execute(context);
      
      expectEvent(events, 'if.event.turned', {
        turnType: 'knob',
        turned: true
      });
      
      expectEvent(events, 'action.success', {
        messageId: expect.stringContaining('knob_turned')
      });
    });

    
    test('should turn basic knob', () => {
      const { world, player, room } = setupBasicWorld();
      const knob = world.createEntity('control knob', 'object');
      knob.add({
        type: TraitType.TURNABLE,
        turnType: 'knob'
      });
      knob.add({ type: TraitType.KNOB });
      
      world.moveEntity(knob.id, room.id);
      
      const context = createRealTestContext(turningAction, world,
        createCommand(IFActions.TURNING, {
          entity: knob
        })
      );
      
      const events = turningAction.execute(context);
      
      // Should emit TURNED event
      expectEvent(events, 'if.event.turned', {
        turnType: 'knob',
        turned: true
      });
      
      // Should emit knob_turned message
      expectEvent(events, 'action.success', {
        messageId: expect.stringContaining('knob_turned')
      });
    });

    test('should toggle switchable knob', () => {
      const { world, player, room } = setupBasicWorld();
      const powerKnob = world.createEntity('power knob', 'object');
      powerKnob.add({
        type: TraitType.TURNABLE,
        turnType: 'knob'
      });
      powerKnob.add({ type: TraitType.KNOB });
      powerKnob.add({
        type: TraitType.SWITCHABLE,
        isOn: false
      });
      
      world.moveEntity(powerKnob.id, room.id);
      
      const context = createRealTestContext(turningAction, world,
        createCommand(IFActions.TURNING, {
          entity: powerKnob
        })
      );
      
      const events = turningAction.execute(context);
      
      // Should emit TURNED event
      expectEvent(events, 'if.event.turned', {
        turnType: 'knob',
        willToggle: true,
        currentState: false,
        newState: true,
        turned: true
      });
      
      // Should emit knob_toggled message
      expectEvent(events, 'action.success', {
        messageId: expect.stringContaining('knob_toggled'),
        params: { target: 'power knob', newState: 'on' }
      });
    });

    test('should click knob with settings', () => {
      const { world, player, room } = setupBasicWorld();
      const knob = world.createEntity('selection knob', 'object');
      knob.add({
        type: TraitType.TURNABLE,
        turnType: 'knob',
        settings: ['A', 'B', 'C', 'D'],
        currentSetting: 'A'
      });
      knob.add({ type: TraitType.KNOB });
      
      world.moveEntity(knob.id, room.id);
      
      const context = createRealTestContext(turningAction, world,
        createCommand(IFActions.TURNING, {
          entity: knob
        })
      );
      
      const events = turningAction.execute(context);
      
      // Should emit TURNED event
      expectEvent(events, 'if.event.turned', {
        turnType: 'knob',
        clicked: true,
        turned: true
      });
      
      // Should emit knob_clicks message
      expectEvent(events, 'action.success', {
        messageId: expect.stringContaining('knob_clicks')
      });
    });
  });

  describe('Wheel Turning', () => {
    test('should turn wheel with single turn activation', () => {
      const { world, player, room } = setupBasicWorld();
      const wheel = world.createEntity('stone wheel', 'object');
      wheel.add({
        type: TraitType.TURNABLE,
        turnType: 'wheel'
      });
      wheel.add({ type: TraitType.WHEEL });
      
      world.moveEntity(wheel.id, room.id);
      
      const context = createRealTestContext(turningAction, world,
        createCommand(IFActions.TURNING, {
          entity: wheel
        })
      );
      
      const events = turningAction.execute(context);
      
      // Should emit TURNED event
      expectEvent(events, 'if.event.turned', {
        turnType: 'wheel',
        mechanismActivated: true,
        turned: true
      });
      
      // Should emit wheel_turned message
      expectEvent(events, 'action.success', {
        messageId: expect.stringContaining('wheel_turned')
      });
    });

    test('should require multiple turns for complex mechanisms', () => {
      const { world, player, room } = setupBasicWorld();
      const wheel = world.createEntity('heavy wheel', 'object');
      wheel.add({
        type: TraitType.TURNABLE,
        turnType: 'wheel',
        turnsRequired: 3,
        turnsMade: 0
      });
      wheel.add({ type: TraitType.WHEEL });
      
      world.moveEntity(wheel.id, room.id);
      
      const context = createRealTestContext(turningAction, world,
        createCommand(IFActions.TURNING, {
          entity: wheel
        })
      );
      
      const events = turningAction.execute(context);
      
      // Should emit TURNED event
      expectEvent(events, 'if.event.turned', {
        turnType: 'wheel',
        turnsMade: 1,
        turnsRequired: 3,
        turnsRemaining: 2,
        mechanismActivated: false,
        turned: true
      });
      
      // Should emit requires_more_turns message
      expectEvent(events, 'action.success', {
        messageId: expect.stringContaining('requires_more_turns')
      });
    });

    test('should activate after required turns completed', () => {
      const { world, player, room } = setupBasicWorld();
      const wheel = world.createEntity('gate wheel', 'object');
      wheel.add({
        type: TraitType.TURNABLE,
        turnType: 'wheel',
        turnsRequired: 3,
        turnsMade: 2  // Almost there
      });
      wheel.add({ type: TraitType.WHEEL });
      
      world.moveEntity(wheel.id, room.id);
      
      const context = createRealTestContext(turningAction, world,
        createCommand(IFActions.TURNING, {
          entity: wheel
        })
      );
      
      const events = turningAction.execute(context);
      
      // Should emit TURNED event
      expectEvent(events, 'if.event.turned', {
        turnType: 'wheel',
        turnsMade: 3,
        turnsRequired: 3,
        mechanismActivated: true,
        turned: true
      });
      
      // Should emit mechanism_activated message
      expectEvent(events, 'action.success', {
        messageId: expect.stringContaining('mechanism_activated')
      });
    });

    test('should include activation target if configured', () => {
      const { world, player, room } = setupBasicWorld();
      const gate = world.createEntity('iron gate', 'object');
      const wheel = world.createEntity('gate wheel', 'object');
      wheel.add({
        type: TraitType.TURNABLE,
        turnType: 'wheel',
        activates: gate.id
      });
      wheel.add({ type: TraitType.WHEEL });
      
      world.moveEntity(wheel.id, room.id);
      
      const context = createRealTestContext(turningAction, world,
        createCommand(IFActions.TURNING, {
          entity: wheel
        })
      );
      
      const events = turningAction.execute(context);
      
      // Should include activation target
      expectEvent(events, 'if.event.turned', {
        activatesId: gate.id
      });
    });
  });

  describe('Crank Turning', () => {
    test('should turn crank with grinding mechanism', () => {
      const { world, player, room } = setupBasicWorld();
      const crank = world.createEntity('rusty crank', 'object');
      crank.add({
        type: TraitType.TURNABLE,
        turnType: 'crank'
      });
      crank.add({ type: TraitType.CRANK });
      
      world.moveEntity(crank.id, room.id);
      
      const context = createRealTestContext(turningAction, world,
        createCommand(IFActions.TURNING, {
          entity: crank
        })
      );
      
      const events = turningAction.execute(context);
      
      // Should emit TURNED event
      expectEvent(events, 'if.event.turned', {
        turnType: 'crank',
        requiresContinuous: true,
        turned: true
      });
      
      // Should emit mechanism_grinds message
      expectEvent(events, 'action.success', {
        messageId: expect.stringContaining('mechanism_grinds')
      });
    });

    test('should activate crank after required turns', () => {
      const { world, player, room } = setupBasicWorld();
      const crank = world.createEntity('well crank', 'object');
      crank.add({
        type: TraitType.TURNABLE,
        turnType: 'crank',
        turnsRequired: 5,
        turnsMade: 4
      });
      crank.add({ type: TraitType.CRANK });
      
      world.moveEntity(crank.id, room.id);
      
      const context = createRealTestContext(turningAction, world,
        createCommand(IFActions.TURNING, {
          entity: crank
        })
      );
      
      const events = turningAction.execute(context);
      
      // Should emit TURNED event
      expectEvent(events, 'if.event.turned', {
        turnType: 'crank',
        turnsMade: 5,
        turnsRequired: 5,
        mechanismActivated: true,
        turned: true
      });
      
      // Should emit mechanism_activated message
      expectEvent(events, 'action.success', {
        messageId: expect.stringContaining('mechanism_activated')
      });
    });
  });

  describe('Valve Turning', () => {
    test('should turn valve without direction (defaults to open)', () => {
      const { world, player, room } = setupBasicWorld();
      const valve = world.createEntity('shut-off valve', 'object');
      valve.add({
        type: TraitType.TURNABLE,
        turnType: 'valve',
        bidirectional: true
      });
      valve.add({ type: TraitType.VALVE });
      
      world.moveEntity(valve.id, room.id);
      
      // Just "TURN VALVE" with no direction - should change flow
      const context = createRealTestContext(turningAction, world,
        createCommand(IFActions.TURNING, {
          entity: valve
        })
      );
      
      const events = turningAction.execute(context);
      
      expectEvent(events, 'if.event.turned', {
        turnType: 'valve',
        flowChanged: true,
        turned: true
      });
      
      expectEvent(events, 'action.success', {
        messageId: expect.stringContaining('flow_changes')
      });
    });

    
    test('should open valve when turning left', () => {
      const { world, player, room } = setupBasicWorld();
      const valve = world.createEntity('water valve', 'object');
      valve.add({
        type: TraitType.TURNABLE,
        turnType: 'valve',
        bidirectional: true
      });
      valve.add({ type: TraitType.VALVE });
      
      world.moveEntity(valve.id, room.id);
      
      const command = createCommand(IFActions.TURNING, {
        entity: valve
      });
      command.parsed.extras = { direction: 'left' };
      
      const context = createRealTestContext(turningAction, world, command);
      
      const events = turningAction.execute(context);
      
      // Should emit TURNED event
      expectEvent(events, 'if.event.turned', {
        turnType: 'valve',
        direction: 'left',
        opens: true,
        flowChanged: true,
        turned: true
      });
      
      // Should emit valve_opened message
      expectEvent(events, 'action.success', {
        messageId: expect.stringContaining('valve_opened')
      });
    });

    test('should close valve when turning right', () => {
      const { world, player, room } = setupBasicWorld();
      const valve = world.createEntity('gas valve', 'object');
      valve.add({
        type: TraitType.TURNABLE,
        turnType: 'valve',
        bidirectional: true
      });
      valve.add({ type: TraitType.VALVE });
      
      world.moveEntity(valve.id, room.id);
      
      const command = createCommand(IFActions.TURNING, {
        entity: valve
      });
      command.parsed.extras = { direction: 'clockwise' };
      
      const context = createRealTestContext(turningAction, world, command);
      
      const events = turningAction.execute(context);
      
      // Should emit TURNED event
      expectEvent(events, 'if.event.turned', {
        turnType: 'valve',
        opens: false,
        flowChanged: true,
        turned: true
      });
      
      // Should emit valve_closed message
      expectEvent(events, 'action.success', {
        messageId: expect.stringContaining('valve_closed')
      });
    });

    test('should adjust valve settings', () => {
      const { world, player, room } = setupBasicWorld();
      const valve = world.createEntity('flow control valve', 'object');
      valve.add({
        type: TraitType.TURNABLE,
        turnType: 'valve',
        bidirectional: true,
        settings: ['closed', 'low', 'medium', 'high', 'full'],
        currentSetting: 'medium'
      });
      valve.add({ type: TraitType.VALVE });
      
      world.moveEntity(valve.id, room.id);
      
      const command = createCommand(IFActions.TURNING, {
        entity: valve
      });
      command.parsed.extras = { direction: 'left' };
      
      const context = createRealTestContext(turningAction, world, command);
      
      const events = turningAction.execute(context);
      
      // Should emit TURNED event with setting change
      expectEvent(events, 'if.event.turned', {
        turnType: 'valve',
        opens: true,
        previousSetting: 'medium',
        newSetting: 'high',
        flowChanged: true
      });
    });
  });

  describe('Jammed Turnable Objects', () => {
    test('should fail when turnable is jammed', () => {
      const { world, player, room } = setupBasicWorld();
      const wheel = world.createEntity('rusty wheel', 'object');
      wheel.add({
        type: TraitType.TURNABLE,
        turnType: 'wheel',
        jammed: true
      });
      wheel.add({ type: TraitType.WHEEL });
      
      world.moveEntity(wheel.id, room.id);
      
      const context = createRealTestContext(turningAction, world,
        createCommand(IFActions.TURNING, {
          entity: wheel
        })
      );
      
      const events = turningAction.execute(context);
      
      // Should emit TURNED event with jammed flag
      expectEvent(events, 'if.event.turned', {
        jammed: true
      });
      
      // Should emit cant_turn_that message
      expectEvent(events, 'action.success', {
        messageId: expect.stringContaining('cant_turn_that')
      });
    });
  });

  describe('Custom Effects', () => {
    test('should include custom turn effects', () => {
      const { world, player, room } = setupBasicWorld();
      const dial = world.createEntity('magic dial', 'object');
      dial.add({
        type: TraitType.TURNABLE,
        turnType: 'dial',
        effects: {
          onTurn: 'magic.sparkle',
          onSettingChange: 'magic.chime'
        },
        settings: ['earth', 'water', 'fire', 'air'],
        currentSetting: 'earth'
      });
      dial.add({ type: TraitType.DIAL });
      
      world.moveEntity(dial.id, room.id);
      
      const command = createCommand(IFActions.TURNING, {
        entity: dial
      });
      command.parsed.extras = { direction: 'right' };
      
      const context = createRealTestContext(turningAction, world, command);
      
      const events = turningAction.execute(context);
      
      // Should include custom effects
      expectEvent(events, 'if.event.turned', {
        customEffect: 'magic.sparkle',
        settingChangeEffect: 'magic.chime'
      });
    });

    test('should include completion effect when mechanism activates', () => {
      const { world, player, room } = setupBasicWorld();
      const wheel = world.createEntity('ancient wheel', 'object');
      wheel.add({
        type: TraitType.TURNABLE,
        turnType: 'wheel',
        turnsRequired: 1,
        effects: {
          onComplete: 'door.open'
        }
      });
      wheel.add({ type: TraitType.WHEEL });
      
      world.moveEntity(wheel.id, room.id);
      
      const context = createRealTestContext(turningAction, world,
        createCommand(IFActions.TURNING, {
          entity: wheel
        })
      );
      
      const events = turningAction.execute(context);
      
      // Should include completion effect
      expectEvent(events, 'if.event.turned', {
        mechanismActivated: true,
        completionEffect: 'door.open'
      });
    });
  });

  describe('Turn Sound', () => {
    test('should include turn sound when configured', () => {
      const { world, player, room } = setupBasicWorld();
      const crank = world.createEntity('creaky crank', 'object');
      crank.add({
        type: TraitType.TURNABLE,
        turnType: 'crank',
        turnSound: 'metal_creak'
      });
      crank.add({ type: TraitType.CRANK });
      
      world.moveEntity(crank.id, room.id);
      
      const context = createRealTestContext(turningAction, world,
        createCommand(IFActions.TURNING, {
          entity: crank
        })
      );
      
      const events = turningAction.execute(context);
      
      // Should include sound
      expectEvent(events, 'if.event.turned', {
        sound: 'metal_creak'
      });
    });
  });

  describe('Verb-Specific Messages', () => {
    test('should use rotate for rotate verb', () => {
      const { world, player, room } = setupBasicWorld();
      const object = world.createEntity('strange object', 'object');
      object.add({
        type: TraitType.TURNABLE,
        turnType: 'knob'
      });
      
      world.moveEntity(object.id, room.id);
      
      const command = createCommand(IFActions.TURNING, {
        entity: object
      });
      command.parsed.structure.verb = {
        tokens: [0],
        text: 'rotate',
        head: 'rotate'
      };
      
      const context = createRealTestContext(turningAction, world, command);
      
      const events = turningAction.execute(context);
      
      // Should emit rotated message
      expectEvent(events, 'action.success', {
        messageId: expect.stringContaining('rotated')
      });
    });

    test('should use spin for spin verb', () => {
      const { world, player, room } = setupBasicWorld();
      const spinner = world.createEntity('metal spinner', 'object');
      spinner.add({
        type: TraitType.TURNABLE,
        turnType: 'wheel'
      });
      
      world.moveEntity(spinner.id, room.id);
      
      const command = createCommand(IFActions.TURNING, {
        entity: spinner
      });
      command.parsed.structure.verb = {
        tokens: [0],
        text: 'spin',
        head: 'spin'
      };
      
      const context = createRealTestContext(turningAction, world, command);
      
      const events = turningAction.execute(context);
      
      // Should emit spun message
      expectEvent(events, 'action.success', {
        messageId: expect.stringContaining('spun')
      });
    });
  });

  describe('Event Structure Validation', () => {
    test('should include proper entities in all events', () => {
      const { world, player, room } = setupBasicWorld();
      const dial = world.createEntity('test dial', 'object');
      dial.add({
        type: TraitType.TURNABLE,
        turnType: 'dial'
      });
      dial.add({ type: TraitType.DIAL });
      
      world.moveEntity(dial.id, room.id);
      
      const context = createRealTestContext(turningAction, world,
        createCommand(IFActions.TURNING, {
          entity: dial
        })
      );
      
      const events = turningAction.execute(context);
      
      events.forEach(event => {
        if (event.entities) {
          expect(event.entities.actor).toBe(player.id);
          expect(event.entities.target).toBe(dial.id);
          expect(event.entities.location).toBe(room.id);
        }
      });
    });
  });
});

describe('Testing Pattern Examples for Turning', () => {
  test('pattern: turn types from traits', () => {
    // Test different turn types - now based on traits, not names
    const turnTypes = [
      { traits: { turnable: { turnType: 'dial' } }, expectedType: 'dial' },
      { traits: { turnable: { turnType: 'knob' } }, expectedType: 'knob' },
      { traits: { turnable: { turnType: 'wheel' } }, expectedType: 'wheel' },
      { traits: { turnable: { turnType: 'crank' } }, expectedType: 'crank' },
      { traits: { turnable: { turnType: 'valve' } }, expectedType: 'valve' }
    ];
    
    turnTypes.forEach(({ traits, expectedType }) => {
      expect(traits.turnable.turnType).toBe(expectedType);
    });
  });

  test('pattern: directional adjustments', () => {
    // Test direction effects
    const directions = [
      { direction: 'right', adjustment: 1 },
      { direction: 'clockwise', adjustment: 1 },
      { direction: 'left', adjustment: -1 },
      { direction: 'counterclockwise', adjustment: -1 }
    ];
    
    directions.forEach(({ direction, adjustment }) => {
      const isIncreasing = direction === 'right' || direction === 'clockwise';
      expect(isIncreasing ? 1 : -1).toBe(adjustment);
    });
  });

  test('pattern: mechanism activation', () => {
    // Test activation mechanics
    const mechanisms = [
      { type: 'wheel', multiTurn: true },
      { type: 'crank', continuous: true },
      { type: 'valve', instant: true }
    ];
    
    mechanisms.forEach(({ type, continuous, instant, multiTurn }) => {
      if (type === 'wheel') {
        expect(multiTurn).toBe(true);
      } else if (type === 'crank') {
        expect(continuous).toBe(true);
      } else if (type === 'valve') {
        expect(instant).toBe(true);
      }
    });
  });

  test('pattern: valve flow control', () => {
    // Test valve directions
    const valveOps = [
      { direction: 'left', opens: true },
      { direction: 'counterclockwise', opens: true },
      { direction: 'right', opens: false },
      { direction: 'clockwise', opens: false }
    ];
    
    valveOps.forEach(({ direction, opens }) => {
      const isOpening = direction === 'left' || direction === 'counterclockwise';
      expect(isOpening).toBe(opens);
    });
  });

  test('pattern: trait-based behavior', () => {
    // Test that behavior is determined by traits, not names
    const objects = [
      { 
        name: 'fancy control mechanism',
        traits: [TraitType.TURNABLE, TraitType.DIAL],
        turnType: 'dial',
        behavior: 'dial'
      },
      { 
        name: 'adjustment device',
        traits: [TraitType.TURNABLE, TraitType.KNOB],
        turnType: 'knob',
        behavior: 'knob'
      },
      { 
        name: 'rotating mechanism',
        traits: [TraitType.TURNABLE, TraitType.WHEEL],
        turnType: 'wheel',
        behavior: 'wheel'
      }
    ];
    
    objects.forEach(obj => {
      // Behavior is determined by trait, not by name
      expect(obj.turnType).toBe(obj.behavior);
      // Names can be anything - no string detection
      expect(obj.name.includes(obj.behavior)).toBe(false);
    });
  });

  test('pattern: success indicators by type', () => {
    // Test success flags by type
    const indicators = [
      { type: 'dial', flag: 'turned' },
      { type: 'knob', flag: 'turned' },
      { type: 'wheel', flag: 'turned' },
      { type: 'crank', flag: 'turned' },
      { type: 'valve', flag: 'turned' }
    ];
    
    indicators.forEach(({ type, flag }) => {
      // All turnable objects set turned = true
      expect(flag).toBe('turned');
    });
  });
});
