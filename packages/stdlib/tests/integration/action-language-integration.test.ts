/**
 * Integration test template - demonstrates testing actions with language provider
 * 
 * This shows how to test the full flow from command parsing through
 * action execution with proper language provider integration.
 */

import { describe, test, expect, beforeEach } from '@jest/globals';
import { StandardActionRegistry } from '../../src/actions';
import { waitingAction } from '../../src/actions/standard/waiting';
import { CommandValidator } from '../../src/validation/command-validator';
import { WorldModel, IFEntity } from '@sharpee/world-model';
import { createRealTestContext } from '../test-utils';
import type { 
  LanguageProvider, 
  ParsedCommand
} from '@sharpee/world-model';

// Mock Language Provider that demonstrates the new pattern
class MockLanguageProvider implements Partial<LanguageProvider> {
  private actionPatterns = new Map<string, string[]>([
    ['if.action.waiting', ['wait', 'z']],
    ['if.action.looking', ['look', 'l', 'examine']],
    ['if.action.taking', ['take', 'get', 'grab']]
  ]);

  private messages = new Map<string, string>([
    ['if.action.waiting.waited', 'Time passes.'],
    ['if.action.waiting.waited_patiently', 'You wait patiently.'],
    ['if.action.waiting.waited_briefly', 'You wait for a moment.'],
    ['if.action.waiting.time_passes', 'You wait for a while.'],
    ['if.action.waiting.nothing_happens', 'You wait, but nothing happens.'],
    ['if.action.waiting.grows_restless', 'You grow restless from waiting.'],
    ['if.action.taking.taken', 'You take the {item}.'],
    ['if.action.taking.already_have', 'You already have the {item}.'],
    ['if.action.looking.looked', 'You look around.']
  ]);

  getActionPatterns(actionId: string): string[] {
    return this.actionPatterns.get(actionId) || [];
  }

  getMessage(messageId: string, params?: Record<string, any>): string {
    let message = this.messages.get(messageId) || `[Missing: ${messageId}]`;
    
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        message = message.replace(`{${key}}`, String(value));
      });
    }
    
    return message;
  }

  parseCommand(input: string): ParsedCommand {
    // Simplified parsing for testing
    const words = input.toLowerCase().trim().split(/\s+/);
    const verb = words[0];
    
    // Find action for verb
    let actionId: string | undefined;
    for (const [id, patterns] of this.actionPatterns) {
      if (patterns.includes(verb)) {
        actionId = id;
        break;
      }
    }
    
    return {
      rawInput: input,
      tokens: words.map((word, i) => ({ text: word, start: i, end: i + 1 })),
      action: actionId || 'unknown',
      structure: {
        verb: { tokens: [0], text: verb, head: verb }
      },
      pattern: 'VERB_ONLY',
      confidence: actionId ? 1.0 : 0.5
    } as any as ParsedCommand;
  }
}

describe('Action Integration Test Pattern', () => {
  let registry: StandardActionRegistry;
  let languageProvider: MockLanguageProvider;
  let validator: CommandValidator;
  let world: WorldModel;
  let player: IFEntity;

  beforeEach(() => {
    // Setup language provider
    languageProvider = new MockLanguageProvider();
    
    // Setup action registry with language provider
    registry = new StandardActionRegistry();
    registry.setLanguageProvider(languageProvider as any);
    registry.register(waitingAction);
    
    // Setup world model
    world = new WorldModel();
    player = world.createEntity('Player', 'actor');
    world.setPlayer(player.id); // Set player in world model
    const room = world.createEntity('Test Room', 'location');
    world.moveEntity(player.id, room.id);
    
    // Setup validator
    validator = new CommandValidator(world, registry);
  });

  describe('Command to Action Flow', () => {
    test('should resolve action from verb using language provider', () => {
      const parsed = languageProvider.parseCommand('wait');
      
      expect(parsed.action).toBe('if.action.waiting');
      expect(registry.has(parsed.action)).toBe(true);
    });

    test('should resolve action from alias', () => {
      const parsed = languageProvider.parseCommand('z');
      
      expect(parsed.action).toBe('if.action.waiting');
    });

    test('should validate and execute action', () => {
      const parsed = languageProvider.parseCommand('wait');
      const validated = validator.validate(parsed);
      
      expect(validated.success).toBe(true);
      if (validated.success) {
        const action = registry.get(validated.value.actionId);
        expect(action).toBe(waitingAction);
        
        // Execute action
        const context = createRealTestContext(action!, world, validated.value);
        const events = action!.execute(context);
        
        expect(events.length).toBeGreaterThan(0);
        expect(events.some(e => e.type === 'if.event.waited')).toBe(true);
      }
    });
  });

  describe('Message Resolution Flow', () => {
    test('should resolve messages through language provider', () => {
      const command = {
        parsed: {
          action: 'wait',
          extras: {}
        },
        directObject: null,
        indirectObject: null
      };
      const context = createRealTestContext(waitingAction, world, command);
      const events = waitingAction.execute(context);
      
      // Find success message event
      const successEvent = events.find(e => e.type === 'message.success');
      expect(successEvent).toBeDefined();
      
      if (successEvent) {
        // Resolve message through language provider
        const message = languageProvider.getMessage(
          successEvent.data.messageId,
          successEvent.data.params
        );
        
        expect(message).not.toContain('[Missing:');
        expect(message).toMatch(/Time passes|You wait|nothing happens/);
      }
    });
  });

  describe('Pattern-based Action Discovery', () => {
    test('should find actions by pattern through language provider', () => {
      // This demonstrates how the registry uses the language provider
      // to maintain pattern mappings
      
      const waitPatterns = languageProvider.getActionPatterns('if.action.waiting');
      expect(waitPatterns).toContain('wait');
      expect(waitPatterns).toContain('z');
      
      // The registry would use these patterns for lookup
      // In a real implementation, registry.findByPattern would consult
      // the language provider's pattern mappings
    });
  });
});

describe('Testing Complex Actions with Dependencies', () => {
  test('example: action that checks preconditions', () => {
    // Example of testing an action with more complex validation
    const world = new WorldModel();
    const player = world.createEntity('Player', 'actor');
    world.setPlayer(player.id); // Set player in world model
    const room = world.createEntity('Test Room', 'location');
    const ball = world.createEntity('red ball', 'object');
    
    world.moveEntity(player.id, room.id);
    world.moveEntity(ball.id, room.id);
    
    const mockTakeAction = {
      id: 'if.action.taking',
      execute: (context: any) => {
        const item = context.command.directObject?.entity;
        
        if (!item) {
          return context.emitError('no_target');
        }
        
        if (!context.canTake(item)) {
          return context.emitError('cant_take', { item: item.name });
        }
        
        if (world.getLocation(item.id) === context.player.id) {
          return context.emitError('already_have', { item: item.name });
        }
        
        return [
          context.emit('if.event.taken', { item: item.name }),
          ...context.emitSuccess('taken', { item: item.name })
        ];
      }
    };
    
    // Test various precondition failures
    const command = {
      parsed: {
        action: 'take',
        extras: {}
      },
      directObject: { entity: ball },
      indirectObject: null
    };
    
    const context = createRealTestContext(mockTakeAction as any, world, command);
    
    // Override canTake for testing
    context.canTake = () => true;
    
    const events = mockTakeAction.execute(context);
    expect(events.length).toBeGreaterThan(0);
    
    // Should successfully take the item
    const takenEvent = events.find(e => e.type === 'if.event.taken');
    expect(takenEvent).toBeDefined();
    expect(takenEvent?.data.item).toBe('red ball');
  });
});
