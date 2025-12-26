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

import { describe, test, expect, beforeEach, vi } from 'vitest';
import { lookingAction } from '../../../src/actions/standard/looking';
import { IFActions } from '../../../src/actions/constants';
import { TraitType } from '@sharpee/world-model';
import { 
  createRealTestContext, 
  setupBasicWorld,
  expectEvent,
  TestData,
  createCommand
} from '../../test-utils';
import { WorldModel } from '@sharpee/world-model';
import type { ActionContext } from '../../../src/actions/enhanced-types';
import type { ISemanticEvent } from '@sharpee/core';

// Helper to execute action using the new three-phase pattern
function executeAction(action: any, context: ActionContext): ISemanticEvent[] {
  // New three-phase pattern: validate -> execute -> report
  const validationResult = action.validate(context);
  
  if (!validationResult.valid) {
    // Action creates its own error events in report()
    return action.report(context, validationResult);
  }
  
  // Execute mutations (returns void in new pattern)
  action.execute(context);
  
  // Report generates all events
  return action.report(context, validationResult);
}

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
      
      const events = executeAction(lookingAction, context);
      
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
      
      // Should emit success message
      expectEvent(events, 'action.success', {
        messageId: expect.stringContaining('room_description'),
        params: { location: 'Test Room' }
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
      
      const events = executeAction(lookingAction, context);
      
      // Should emit list contents event
      expectEvent(events, 'if.event.list.contents', {
        items: [ball.id, box.id, table.id, npc.id],
        npcs: [npc.id],
        containers: [box.id],
        supporters: [table.id],
        other: [ball.id],
        context: 'room'
      });
      
      // Should emit contents list message
      expectEvent(events, 'action.success', {
        messageId: expect.stringContaining('contents_list'),
        params: { 
          items: 'red ball, wooden box, oak table, security guard',
          count: 4
        }
      });
    });

    test('should handle empty rooms', () => {
      const { world, player, room } = setupBasicWorld();
      // Room only has player in it, no other items
      
      const command = createCommand(IFActions.LOOKING);
      const context = createRealTestContext(lookingAction, world, command);
      
      const events = executeAction(lookingAction, context);
      
      // Should not emit list contents event for empty room
      const listEvent = events.find(e => e.type === 'if.event.list.contents');
      expect(listEvent).toBeUndefined();
      
      // Should not emit contents list message
      const contentsMessage = events.find(e => 
        e.type === 'action.success' && 
        e.data?.messageId?.includes('contents_list')
      );
      expect(contentsMessage).toBeUndefined();
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
        requiresLight: true
      });
      
      world.moveEntity(player.id, darkRoom.id);
      
      const command = createCommand(IFActions.LOOKING);
      const context = createRealTestContext(lookingAction, world, command);
      
      const events = executeAction(lookingAction, context);
      
      // Should emit LOOKED event with isDark true
      expectEvent(events, 'if.event.looked', {
        isDark: true
      });
      
      // Should emit room_dark message
      expectEvent(events, 'action.success', {
        messageId: expect.stringContaining('room_dark'),
        params: { location: 'Dark Cave' }
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
        requiresLight: true
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
      
      const events = executeAction(lookingAction, context);
      
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
        requiresLight: true
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
      
      const events = executeAction(lookingAction, context);
      
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
      
      const events = executeAction(lookingAction, context);
      
      // Should use in_container message
      expectEvent(events, 'action.success', {
        messageId: expect.stringContaining('in_container'),
        params: { 
          location: 'shipping crate',
          container: 'shipping crate'
        }
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
      
      const events = executeAction(lookingAction, context);
      
      // Should use on_supporter message
      expectEvent(events, 'action.success', {
        messageId: expect.stringContaining('on_supporter'),
        params: { 
          location: 'observation platform',
          supporter: 'observation platform'
        }
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
      
      const events = executeAction(lookingAction, context);
      
      // For now, should use regular description
      expectEvent(events, 'action.success', {
        messageId: expect.stringContaining('room_description')
      });
    });

    test('should use full description for first visit even in brief mode', () => {
      const { world, player, room } = setupBasicWorld();
      
      const command = createCommand(IFActions.LOOKING);
      const context = createRealTestContext(lookingAction, world, command);
      
      const events = executeAction(lookingAction, context);
      
      // Should use full description
      expectEvent(events, 'action.success', {
        messageId: expect.stringContaining('room_description')
      });
      
      // Ensure it's not the brief version
      const briefMessage = events.find(e => 
        e.data?.messageId?.includes('room_description_brief')
      );
      expect(briefMessage).toBeUndefined();
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
      
      const events = executeAction(lookingAction, context);
      
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
      
      const events = executeAction(lookingAction, context);
      
      // Should add examine_surroundings message
      expectEvent(events, 'action.success', {
        messageId: expect.stringContaining('examine_surroundings'),
        params: { location: 'Test Room' }
      });
    });
  });

  describe('Event Structure Validation', () => {
    test('should include proper entities and timestamps', () => {
      const { world, player, room } = setupBasicWorld();
      
      const command = createCommand(IFActions.LOOKING);
      const context = createRealTestContext(lookingAction, world, command);
      
      const events = executeAction(lookingAction, context);
      
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

  describe('Three-Phase Pattern Compliance', () => {
    test('should use report() to create all events', () => {
      const { world, player, room } = setupBasicWorld();
      
      const command = createCommand(IFActions.LOOKING);
      const context = createRealTestContext(lookingAction, world, command);
      
      // Spy on the action methods to ensure correct pattern
      const validateSpy = vi.spyOn(lookingAction, 'validate');
      const executeSpy = vi.spyOn(lookingAction, 'execute');
      const reportSpy = vi.spyOn(lookingAction, 'report');
      
      const events = executeAction(lookingAction, context);
      
      // Verify three-phase pattern was followed
      expect(validateSpy).toHaveBeenCalledWith(context);
      expect(executeSpy).toHaveBeenCalledWith(context);
      expect(reportSpy).toHaveBeenCalledWith(context, { valid: true });
      
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
        valid: false,
        error: 'test_error',
        params: { test: 'value' }
      };

      // Call blocked() with validation result
      const events = lookingAction.blocked!(context, mockValidationResult);

      // Should create blocked event
      expect(events).toHaveLength(1);
      expect(events[0].type).toBe('action.blocked');
      expect(events[0].data).toMatchObject({
        actionId: IFActions.LOOKING,
        messageId: 'test_error',
        params: { test: 'value' }
      });
    });
  });
});

describe('Testing Pattern Examples for Looking', () => {
  test('pattern: complex room contents', () => {
    // Test categorization of different item types
    const world = new WorldModel();
    
    const items = [
      { id: 'cat', name: 'tabby cat', traits: { [TraitType.ACTOR]: { type: TraitType.ACTOR } } },
      { id: 'dog', name: 'golden retriever', traits: { [TraitType.ACTOR]: { type: TraitType.ACTOR } } },
      { id: 'chest', name: 'treasure chest', traits: { [TraitType.CONTAINER]: { type: TraitType.CONTAINER } } },
      { id: 'bag', name: 'leather bag', traits: { [TraitType.CONTAINER]: { type: TraitType.CONTAINER } } },
      { id: 'table', name: 'dining table', traits: { [TraitType.SUPPORTER]: { type: TraitType.SUPPORTER } } },
      { id: 'shelf', name: 'bookshelf', traits: { [TraitType.SUPPORTER]: { type: TraitType.SUPPORTER } } },
      { id: 'book', name: 'old book', traits: {} },
      { id: 'key', name: 'brass key', traits: {} }
    ];
    
    const entities = items.map(({ id, name, traits }) => {
      const entity = world.createEntity(name, 'object');
      Object.entries(traits).forEach(([traitType, traitData]) => {
        entity.add(traitData);
      });
      return entity;
    });
    
    // Categorize items
    const npcs = entities.filter(e => e.has(TraitType.ACTOR));
    const containers = entities.filter(e => e.has(TraitType.CONTAINER) && !e.has(TraitType.ACTOR));
    const supporters = entities.filter(e => e.has(TraitType.SUPPORTER) && !e.has(TraitType.CONTAINER));
    const other = entities.filter(e => 
      !e.has(TraitType.ACTOR) && 
      !e.has(TraitType.CONTAINER) && 
      !e.has(TraitType.SUPPORTER)
    );
    
    expect(npcs).toHaveLength(2);
    expect(containers).toHaveLength(2);
    expect(supporters).toHaveLength(2);
    expect(other).toHaveLength(2);
  });

  test('pattern: light source combinations', () => {
    // Test various light source scenarios
    const world = new WorldModel();
    
    const lightScenarios = [
      { 
        desc: 'off light',
        traits: {
          [TraitType.LIGHT_SOURCE]: { type: TraitType.LIGHT_SOURCE },
          [TraitType.SWITCHABLE]: { type: TraitType.SWITCHABLE, isOn: false }
        },
        providesLight: false
      },
      {
        desc: 'on light',
        traits: {
          [TraitType.LIGHT_SOURCE]: { type: TraitType.LIGHT_SOURCE },
          [TraitType.SWITCHABLE]: { type: TraitType.SWITCHABLE, isOn: true }
        },
        providesLight: true
      },
      {
        desc: 'non-switchable light',
        traits: {
          [TraitType.LIGHT_SOURCE]: { type: TraitType.LIGHT_SOURCE }
        },
        providesLight: false // Requires SWITCHABLE trait
      }
    ];
    
    lightScenarios.forEach(({ desc, traits, providesLight }) => {
      const light = world.createEntity(desc, 'object');
      Object.entries(traits).forEach(([traitType, traitData]) => {
        light.add(traitData);
      });
      
      const hasLightSource = light.has(TraitType.LIGHT_SOURCE);
      const hasSwitchable = light.has(TraitType.SWITCHABLE);
      const isOn = hasSwitchable && light.get(TraitType.SWITCHABLE).isOn;
      
      expect(hasLightSource).toBe(true);
      expect(hasLightSource && hasSwitchable && isOn).toBe(providesLight);
    });
  });
});
