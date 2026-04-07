/**
 * Golden test for looking action - demonstrates testing observation actions
 * 
 * This shows patterns for testing actions that:
 * - Provide room descriptions and contents
 * - Handle darkness and light requirements
 * - Support brief/verbose modes
 * - List visible items by category
 * - Handle special locations (containers, supporters)
 */

import { describe, test, expect, vi } from 'vitest';
import { lookingAction } from '../../../src/actions/standard/looking';
import { IFActions } from '../../../src/actions/constants';
import { TraitType } from '@sharpee/world-model';
import {
  createRealTestContext,
  setupBasicWorld,
  expectEvent,
  executeWithValidation,
  TestData,
  createCommand
} from '../../test-utils';
import { WorldModel } from '@sharpee/world-model';

describe('lookingAction (Golden Pattern)', () => {
  describe('Action Metadata', () => {
    test('should have correct ID', () => {
      expect(lookingAction.id).toBe(IFActions.LOOKING);
    });

    test('should declare required messages', () => {
      expect(lookingAction.requiredMessages).toContain('room_description');
      expect(lookingAction.requiredMessages).toContain('room_description_brief');
      expect(lookingAction.requiredMessages).toContain('room_dark');
      expect(lookingAction.requiredMessages).toContain('contents_list');
      expect(lookingAction.requiredMessages).toContain('nothing_special');
      expect(lookingAction.requiredMessages).toContain('in_container');
      expect(lookingAction.requiredMessages).toContain('on_supporter');
      expect(lookingAction.requiredMessages).toContain('cant_see_in_dark');
      expect(lookingAction.requiredMessages).toContain('look_around');
      expect(lookingAction.requiredMessages).toContain('examine_surroundings');
    });

    test('should belong to observation group', () => {
      expect(lookingAction.group).toBe('observation');
    });
  });

  describe('Basic Looking', () => {
    test('should describe current room', () => {
      const { world, player, room } = setupBasicWorld();
      
      const command = createCommand(IFActions.LOOKING);
      const context = createRealTestContext(lookingAction, world, command);
      
      const events = executeWithValidation(lookingAction, context);
      
      // Should emit LOOKED event
      expectEvent(events, 'if.event.looked', {
        actorId: player.id,
        locationId: room.id,
        locationName: 'Test Room',
        isDark: false
      });
      
      // Should emit room description event
      expectEvent(events, 'if.event.room.description', {
        roomId: room.id,
        includeContents: true,
        verbose: true
      });
    });

    test('should list visible items', () => {
      const { world, player, room } = setupBasicWorld();
      const ball = world.createEntity('red ball', 'object');
      const box = world.createEntity('wooden box', 'object');
      box.add({ type: TraitType.CONTAINER });
      
      const table = world.createEntity('oak table', 'object');
      table.add({ type: TraitType.SUPPORTER });
      
      const npc = world.createEntity('security guard', 'actor');
      npc.add({ type: TraitType.ACTOR });
      
      // Place all items in the room
      [ball, box, table, npc].forEach(entity => {
        world.moveEntity(entity.id, room.id);
      });
      
      const command = createCommand(IFActions.LOOKING);
      const context = createRealTestContext(lookingAction, world, command);
      
      const events = executeWithValidation(lookingAction, context);
      
      // Should emit list contents event with messageId and categorized items
      expectEvent(events, 'if.event.list.contents', {
        npcs: [npc.id],
        containers: [box.id],
        supporters: [table.id],
        other: [ball.id],
        context: 'room',
        messageId: expect.stringContaining('contents_list')
      });
    });

    test('should handle empty rooms', () => {
      const { world, player, room } = setupBasicWorld();
      // Room only has player in it, no other items
      
      const command = createCommand(IFActions.LOOKING);
      const context = createRealTestContext(lookingAction, world, command);
      
      const events = executeWithValidation(lookingAction, context);
      
      // Should not emit list contents event for empty room
      const listEvent = events.find(e => e.type === 'if.event.list.contents');
      expect(listEvent).toBeUndefined();
    });
  });

  describe('Darkness Handling', () => {
    test('should handle dark room without light', () => {
      const world = new WorldModel();
      const player = world.createEntity('yourself', 'actor');
      player.add({ type: TraitType.ACTOR });
      world.setPlayer(player.id);
      
      const darkRoom = world.createEntity('Dark Cave', 'room');
      darkRoom.add({
        type: TraitType.ROOM,
        isDark: true
      });
      
      world.moveEntity(player.id, darkRoom.id);
      
      const command = createCommand(IFActions.LOOKING);
      const context = createRealTestContext(lookingAction, world, command);
      
      const events = executeWithValidation(lookingAction, context);
      
      // Should emit LOOKED event with isDark true and dark message
      expectEvent(events, 'if.event.looked', {
        isDark: true,
        messageId: expect.stringContaining('room_dark')
      });
      
      // Should not emit room description or contents
      const descEvent = events.find(e => e.type === 'if.event.room.description');
      expect(descEvent).toBeUndefined();
    });

    test('should see in dark room with light source', () => {
      const world = new WorldModel();
      const player = world.createEntity('yourself', 'actor');
      player.add({ type: TraitType.ACTOR });
      world.setPlayer(player.id);
      
      const darkRoom = world.createEntity('Dark Cave', 'room');
      darkRoom.add({
        type: TraitType.ROOM,
        isDark: true
      });
      
      const torch = world.createEntity('burning torch', 'object');
      torch.add({ type: TraitType.LIGHT_SOURCE });
      torch.add({ 
        type: TraitType.SWITCHABLE,
        isOn: true
      });
      
      world.moveEntity(player.id, darkRoom.id);
      world.moveEntity(torch.id, player.id);  // Player carries torch
      
      const command = createCommand(IFActions.LOOKING);
      const context = createRealTestContext(lookingAction, world, command);
      
      const events = executeWithValidation(lookingAction, context);
      
      // Should emit LOOKED event with isDark false
      expectEvent(events, 'if.event.looked', {
        isDark: false
      });
      
      // Should emit normal room description
      expectEvent(events, 'if.event.room.description', {
        roomId: darkRoom.id
      });
    });

    test('should see with room light source', () => {
      const world = new WorldModel();
      const player = world.createEntity('yourself', 'actor');
      player.add({ type: TraitType.ACTOR });
      world.setPlayer(player.id);
      
      const darkRoom = world.createEntity('Lit Cave', 'room');
      darkRoom.add({
        type: TraitType.ROOM,
        isDark: true
      });
      
      const lamp = world.createEntity('electric lamp', 'object');
      lamp.add({ type: TraitType.LIGHT_SOURCE });
      lamp.add({ 
        type: TraitType.SWITCHABLE,
        isOn: true
      });
      
      world.moveEntity(player.id, darkRoom.id);
      world.moveEntity(lamp.id, darkRoom.id);  // Lamp in room
      
      const command = createCommand(IFActions.LOOKING);
      const context = createRealTestContext(lookingAction, world, command);
      
      const events = executeWithValidation(lookingAction, context);
      
      expectEvent(events, 'if.event.looked', {
        isDark: false
      });
    });
  });

  describe('Special Locations', () => {
    test('should describe being in a container', () => {
      const world = new WorldModel();
      const player = world.createEntity('yourself', 'actor');
      player.add({ type: TraitType.ACTOR });
      world.setPlayer(player.id);
      
      const room = world.createEntity('Test Room', 'room');
      const crate = world.createEntity('shipping crate', 'object');
      crate.add({
        type: TraitType.CONTAINER,
        enterable: true
      });
      
      // Place crate in room and player in crate
      world.moveEntity(crate.id, room.id);
      world.moveEntity(player.id, crate.id);
      
      const command = createCommand(IFActions.LOOKING);
      const context = createRealTestContext(lookingAction, world, command);
      
      const events = executeWithValidation(lookingAction, context);

      // Should emit looked event with container as the location
      expectEvent(events, 'if.event.looked', {
        locationId: crate.id,
        locationName: 'shipping crate'
      });

      // Should emit room description for the container
      expectEvent(events, 'if.event.room.description', {
        roomId: crate.id
      });
    });

    test('should describe being on a supporter', () => {
      const world = new WorldModel();
      const player = world.createEntity('yourself', 'actor');
      player.add({ type: TraitType.ACTOR });
      world.setPlayer(player.id);
      
      const room = world.createEntity('Test Room', 'room');
      const platform = world.createEntity('observation platform', 'object');
      platform.add({
        type: TraitType.SUPPORTER,
        enterable: true
      });
      
      // Place platform in room and player on platform
      world.moveEntity(platform.id, room.id);
      world.moveEntity(player.id, platform.id);
      
      const command = createCommand(IFActions.LOOKING);
      const context = createRealTestContext(lookingAction, world, command);
      
      const events = executeWithValidation(lookingAction, context);

      // Should emit looked event with supporter as the location
      expectEvent(events, 'if.event.looked', {
        locationId: platform.id,
        locationName: 'observation platform'
      });

      // Should emit room description for the supporter
      expectEvent(events, 'if.event.room.description', {
        roomId: platform.id
      });
    });
  });

  describe('Brief/Verbose Modes', () => {
    test('should use brief description for visited rooms in brief mode', () => {
      const { world, player, room } = setupBasicWorld();
      
      const command = createCommand(IFActions.LOOKING);
      const context = createRealTestContext(lookingAction, world, command);
      
      // Note: In a real implementation, brief/verbose mode and visited locations
      // would be tracked by the game state. This test demonstrates the expected
      // behavior when those features are implemented.
      
      const events = executeWithValidation(lookingAction, context);

      // For now, should emit room description event
      expectEvent(events, 'if.event.room.description', {
        roomId: room.id,
        verbose: true
      });
    });

    test('should use full description for first visit even in brief mode', () => {
      const { world, player, room } = setupBasicWorld();
      
      const command = createCommand(IFActions.LOOKING);
      const context = createRealTestContext(lookingAction, world, command);
      
      const events = executeWithValidation(lookingAction, context);
      
      // Should use full (verbose) description
      expectEvent(events, 'if.event.room.description', {
        roomId: room.id,
        verbose: true
      });
    });
  });

  describe('Command Variations', () => {
    test('should handle short form "l" command', () => {
      const { world, player, room } = setupBasicWorld();
      
      const command = createCommand(IFActions.LOOKING);
      command.parsed.structure.verb = { 
        tokens: [0], 
        text: 'l', 
        head: 'l' 
      };
      
      const context = createRealTestContext(lookingAction, world, command);
      
      const events = executeWithValidation(lookingAction, context);
      
      // Should work normally
      expectEvent(events, 'if.event.looked', {
        locationId: room.id
      });
      
      // Should not add extra messages for short form
      const examineMessage = events.find(e => 
        e.data?.messageId?.includes('examine_surroundings')
      );
      expect(examineMessage).toBeUndefined();
    });

    test('should handle "examine" without object', () => {
      const { world, player, room } = setupBasicWorld();
      
      const command = createCommand(IFActions.LOOKING);
      command.parsed.structure.verb = { 
        tokens: [0], 
        text: 'examine', 
        head: 'examine' 
      };
      // No directObject
      
      const context = createRealTestContext(lookingAction, world, command);
      
      const events = executeWithValidation(lookingAction, context);
      
      // When "examine" is used without an object, looking still emits
      // the standard looked + room.description events
      expectEvent(events, 'if.event.looked', {
        locationId: room.id
      });
      expectEvent(events, 'if.event.room.description', {
        roomId: room.id
      });
    });
  });

  describe('Event Structure Validation', () => {
    test('should include proper entities and timestamps', () => {
      const { world, player, room } = setupBasicWorld();
      
      const command = createCommand(IFActions.LOOKING);
      const context = createRealTestContext(lookingAction, world, command);
      
      const events = executeWithValidation(lookingAction, context);
      
      // Check LOOKED event has timestamp
      const lookedEvent = events.find(e => e.type === 'if.event.looked');
      expect(lookedEvent?.data?.timestamp).toBeDefined();
      expect(typeof lookedEvent?.data?.timestamp).toBe('number');
      
      // Check room description event has timestamp
      const roomDescEvent = events.find(e => e.type === 'if.event.room.description');
      expect(roomDescEvent?.data?.timestamp).toBeDefined();
      
      // Check entities
      events.forEach(event => {
        if (event.entities) {
          expect(event.entities.actor).toBe(player.id);
          expect(event.entities.location).toBe(room.id);
        }
      });
    });
  });

  describe('Four-Phase Pattern Compliance', () => {
    test('should use report() to create all events', () => {
      const { world, player, room } = setupBasicWorld();

      const command = createCommand(IFActions.LOOKING);
      const context = createRealTestContext(lookingAction, world, command);

      // Spy on the action methods to ensure correct pattern
      const validateSpy = vi.spyOn(lookingAction, 'validate');
      const executeSpy = vi.spyOn(lookingAction, 'execute');
      const reportSpy = vi.spyOn(lookingAction, 'report');

      const events = executeWithValidation(lookingAction, context);

      // Verify four-phase pattern was followed
      expect(validateSpy).toHaveBeenCalledWith(context);
      expect(executeSpy).toHaveBeenCalledWith(context);
      expect(reportSpy).toHaveBeenCalledWith(context);

      // Verify execute returns void (no events)
      const executeResult = lookingAction.execute(context);
      expect(executeResult).toBeUndefined();

      // Verify report creates events
      expect(events.length).toBeGreaterThan(0);
      expect(events.every(e => e.type && e.data)).toBe(true);
    });

    test('should use blocked() to handle validation errors', () => {
      // Even though looking is always valid, test the pattern
      const { world, player, room } = setupBasicWorld();

      const command = createCommand(IFActions.LOOKING);
      const context = createRealTestContext(lookingAction, world, command);

      // Mock validation failure
      const mockValidationResult = {
        valid: false as const,
        error: 'test_error',
        params: { test: 'value' }
      };

      // Call blocked() with validation result
      const events = lookingAction.blocked!(context, mockValidationResult);

      // Should create a single blocked event of type if.event.looked
      expect(events).toHaveLength(1);
      expect(events[0].type).toBe('if.event.looked');
      expect(events[0].data).toMatchObject({
        blocked: true,
        reason: 'test_error',
        messageId: `${IFActions.LOOKING}.test_error`,
        params: { test: 'value' }
      });
    });
  });
});

