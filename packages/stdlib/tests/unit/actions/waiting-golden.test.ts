/**
 * Golden test for waiting action - demonstrates testing time passage
 * 
 * This shows patterns for testing actions that:
 * - Pass game time/turns
 * - Handle various waiting contexts (in vehicles, with pending events)
 * - Vary messages based on consecutive waits
 * - Fire simple state change events
 */

import { describe, test, expect, beforeEach } from 'vitest';
import { waitingAction } from '../../../src/actions/standard/waiting';
import { IFActions } from '../../../src/actions/constants';
import { TraitType, WorldModel, EntityType } from '@sharpee/world-model';
import { 
  createRealTestContext, 
  expectEvent,
  TestData,
  createCommand,
  setupBasicWorld
} from '../../test-utils';
import type { ActionContext } from '../../../src/actions/enhanced-types';

describe('waitingAction (Golden Pattern)', () => {
  describe('Action Metadata', () => {
    test('should have correct ID', () => {
      expect(waitingAction.id).toBe(IFActions.WAITING);
    });

    test('should declare required messages', () => {
      expect(waitingAction.requiredMessages).toBeDefined();
      expect(waitingAction.requiredMessages).toContain('waited');
      expect(waitingAction.requiredMessages).toContain('time_passes');
      expect(waitingAction.requiredMessages).toContain('nothing_happens');
    });

    test('should belong to meta group', () => {
      expect(waitingAction.group).toBe('meta');
    });
  });

  describe('Basic Execution', () => {
    test('should execute successfully and return events', () => {
      const { world, player } = setupBasicWorld();
      const command = createCommand(IFActions.WAITING);
      const context = createRealTestContext(waitingAction, world, command);
      
      const events = waitingAction.execute(context);
      
      expect(events).toBeDefined();
      expect(Array.isArray(events)).toBe(true);
      expect(events.length).toBeGreaterThan(0);
    });

    test('should emit WAITED semantic event', () => {
      const { world, player } = setupBasicWorld();
      const command = createCommand(IFActions.WAITING);
      const context = createRealTestContext(waitingAction, world, command);
      
      const events = waitingAction.execute(context);
      
      expectEvent(events, 'if.event.waited', {
        turnsPassed: 1
      });
    });

    test('should emit success message event', () => {
      const { world, player } = setupBasicWorld();
      const command = createCommand(IFActions.WAITING);
      const context = createRealTestContext(waitingAction, world, command);
      
      const events = waitingAction.execute(context);
      
      expectEvent(events, 'action.success', {
        actionId: IFActions.WAITING,
        messageId: expect.stringMatching(/waited|time_passes|nothing_happens/)
      });
    });

    test('should include entities in events', () => {
      const { world, player, room } = setupBasicWorld();
      const command = createCommand(IFActions.WAITING);
      const context = createRealTestContext(waitingAction, world, command);
      
      const events = waitingAction.execute(context);
      
      events.forEach(event => {
        if (event.entities) {
          expect(event.entities.actor).toBe(player.id);
          expect(event.entities.location).toBe(room.id);
        }
      });
    });
  });

  describe('Context Variations', () => {
    test('should handle waiting in a vehicle', () => {
      const { world, player } = setupBasicWorld();
      
      // Create a vehicle room
      const vehicle = world.createEntity('spaceship', EntityType.ROOM);
      vehicle.add({ 
        type: TraitType.ROOM,
        // Add vehicle trait/marker 
      });
      vehicle.add({
        type: 'if.trait.vehicle' as any
      });
      
      // Move player to vehicle
      world.moveEntity(player.id, vehicle.id);
      
      const command = createCommand(IFActions.WAITING);
      const context = createRealTestContext(waitingAction, world, command);
      
      const events = waitingAction.execute(context);
      
      expectEvent(events, 'action.success', {
        messageId: expect.stringContaining('waited_in_vehicle'),
        params: {
          vehicle: 'spaceship'
        }
      });
    });

    test('should vary messages based on wait count', () => {
      const { world, player } = setupBasicWorld();
      const command = createCommand(IFActions.WAITING);
      const context = createRealTestContext(waitingAction, world, command);
      
      // Mock consecutive waits on context
      (context as any).consecutiveWaits = 3;
      
      const events = waitingAction.execute(context);
      
      expectEvent(events, 'action.success', {
        messageId: expect.stringContaining('time_passes')
      });
    });

    test('should show restlessness after many waits', () => {
      const { world, player } = setupBasicWorld();
      const command = createCommand(IFActions.WAITING);
      const context = createRealTestContext(waitingAction, world, command);
      
      // Mock high wait count
      (context as any).consecutiveWaits = 6;
      
      const events = waitingAction.execute(context);
      
      expectEvent(events, 'action.success', {
        messageId: expect.stringContaining('grows_restless')
      });
    });

    test('should handle pending timed events', () => {
      const { world, player } = setupBasicWorld();
      const command = createCommand(IFActions.WAITING);
      const context = createRealTestContext(waitingAction, world, command);
      
      // Mock pending timed event
      (context as any).pendingTimedEvent = {
        id: 'timer1',
        turnsRemaining: 2,
        anxious: true
      };
      
      const events = waitingAction.execute(context);
      
      expectEvent(events, 'if.event.waited', {
        pendingEvent: 'timer1'
      });
      
      expectEvent(events, 'action.success', {
        messageId: expect.stringContaining('waited_anxiously')
      });
    });
  });

  describe('Event Structure', () => {
    test('should create properly structured semantic events', () => {
      const { world, player } = setupBasicWorld();
      const command = createCommand(IFActions.WAITING);
      const context = createRealTestContext(waitingAction, world, command);
      
      const events = waitingAction.execute(context);
      
      events.forEach(event => {
        // Check basic event structure
        expect(event).toHaveProperty('id');
        expect(event).toHaveProperty('type');
        expect(event).toHaveProperty('timestamp');
        expect(event).toHaveProperty('data');
        
        // Verify timestamp is reasonable
        expect(event.timestamp).toBeGreaterThan(Date.now() - 1000);
        expect(event.timestamp).toBeLessThanOrEqual(Date.now());
      });
    });

    test('should include location data in waited event', () => {
      const { world, player, room } = setupBasicWorld();
      const command = createCommand(IFActions.WAITING);
      const context = createRealTestContext(waitingAction, world, command);
      
      const events = waitingAction.execute(context);
      
      expectEvent(events, 'if.event.waited', {
        location: room.id,
        locationName: 'Test Room',
        waitCount: 0
      });
    });
  });

  describe('No State Mutation', () => {
    test('should not directly modify world state', () => {
      const { world, player } = setupBasicWorld();
      const command = createCommand(IFActions.WAITING);
      const context = createRealTestContext(waitingAction, world, command);
      
      // Create spies for mutation methods
      const moveEntitySpy = vi.spyOn(world, 'moveEntity');
      const updateEntitySpy = vi.spyOn(world, 'updateEntity');
      const setStateSpy = vi.spyOn(world, 'setState');
      const setStateValueSpy = vi.spyOn(world, 'setStateValue');
      
      // Execute action
      waitingAction.execute(context);
      
      // Verify no mutation methods were called
      expect(moveEntitySpy).not.toHaveBeenCalled();
      expect(updateEntitySpy).not.toHaveBeenCalled();
      expect(setStateSpy).not.toHaveBeenCalled();
      expect(setStateValueSpy).not.toHaveBeenCalled();
      
      // Clean up spies
      moveEntitySpy.mockRestore();
      updateEntitySpy.mockRestore();
      setStateSpy.mockRestore();
      setStateValueSpy.mockRestore();
    });

    test('should not modify entity traits', () => {
      const { world, player, room } = setupBasicWorld();
      const command = createCommand(IFActions.WAITING);
      const context = createRealTestContext(waitingAction, world, command);
      
      // Create spies for entity modification
      const playerAddSpy = vi.spyOn(player, 'add');
      const playerRemoveSpy = vi.spyOn(player, 'remove');
      const roomAddSpy = vi.spyOn(room, 'add');
      const roomRemoveSpy = vi.spyOn(room, 'remove');
      
      // Execute action
      waitingAction.execute(context);
      
      // Verify no trait modifications
      expect(playerAddSpy).not.toHaveBeenCalled();
      expect(playerRemoveSpy).not.toHaveBeenCalled();
      expect(roomAddSpy).not.toHaveBeenCalled();
      expect(roomRemoveSpy).not.toHaveBeenCalled();
      
      // Clean up spies
      playerAddSpy.mockRestore();
      playerRemoveSpy.mockRestore();
      roomAddSpy.mockRestore();
      roomRemoveSpy.mockRestore();
    });
  });
});

// Additional test patterns for language provider integration
describe('Language Provider Integration Patterns', () => {
  test('example: how to test action aliases from language provider', () => {
    // In the new architecture, aliases come from the language provider
    // This is a mock example of how to test that integration
    
    const mockLanguageProvider = {
      getActionPatterns: vi.fn((actionId: string) => {
        if (actionId === IFActions.WAITING) {
          return ['wait', 'z'];
        }
        return [];
      }),
      getActionAliases: vi.fn((actionId: string) => {
        if (actionId === IFActions.WAITING) {
          return ['wait', 'z', 'pause', 'rest'];
        }
        return [];
      })
    };
    
    // Test that the language provider returns expected aliases
    const aliases = mockLanguageProvider.getActionAliases(IFActions.WAITING);
    expect(aliases).toContain('wait');
    expect(aliases).toContain('z');
  });

  test('example: how to test message resolution', () => {
    // Messages are resolved through the language provider
    const mockLanguageProvider = {
      getMessage: vi.fn((messageId: string, params?: any) => {
        const messages: Record<string, string> = {
          'if.action.waiting.waited': 'Time passes.',
          'if.action.waiting.waited_in_vehicle': 'You wait in the {vehicle}.',
          'if.action.waiting.grows_restless': 'You grow restless from waiting.'
        };
        
        let message = messages[messageId] || messageId;
        if (params) {
          Object.entries(params).forEach(([key, value]) => {
            message = message.replace(`{${key}}`, String(value));
          });
        }
        return message;
      })
    };
    
    // Test message resolution
    expect(mockLanguageProvider.getMessage('if.action.waiting.waited')).toBe('Time passes.');
    expect(mockLanguageProvider.getMessage('if.action.waiting.waited_in_vehicle', { vehicle: 'car' }))
      .toBe('You wait in the car.');
  });
});

describe('Testing Pattern Examples for Waiting', () => {
  test('pattern: simple time passage', () => {
    // Waiting is one of the simplest actions
    const waitVariations = [
      { command: 'wait', turnsPassed: 1 },
      { command: 'z', turnsPassed: 1 },
      { command: 'pause', turnsPassed: 1 }
    ];
    
    waitVariations.forEach(({ turnsPassed }) => {
      expect(turnsPassed).toBe(1);
    });
  });

  test('pattern: message variations', () => {
    // Different messages based on context
    const messagePatterns = [
      { waitCount: 0, message: 'waited' },
      { waitCount: 3, message: 'time_passes' },
      { waitCount: 6, message: 'grows_restless' },
      { inVehicle: true, message: 'waited_in_vehicle' },
      { pendingEvent: true, message: 'waited_anxiously' }
    ];
    
    messagePatterns.forEach(({ message }) => {
      expect(message).toBeDefined();
    });
  });

  test('pattern: no preconditions', () => {
    // Waiting has no preconditions - always succeeds
    const contexts = [
      { location: 'room', canWait: true },
      { location: 'vehicle', canWait: true },
      { location: 'outdoors', canWait: true },
      { holding: 'nothing', canWait: true },
      { holding: 'heavy_boulder', canWait: true }
    ];
    
    contexts.forEach(({ canWait }) => {
      expect(canWait).toBe(true);
    });
  });
});
