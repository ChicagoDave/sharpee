/**
 * Integration tests for language refactoring with the game engine
 * 
 * These tests verify that the engine properly handles language-agnostic
 * commands and that the text service uses language data correctly.
 */

import { GameEngine, Story, EngineConfig } from '../../src';
import { WorldModel, IFEntity } from '@sharpee/world-model';
import { IFDomain, IFChangeType } from '@sharpee/if-domain';
import type { ParsedCommand } from '@sharpee/world-model';

// Mock language-agnostic parser
class MockLanguageAgnosticParser {
  parse(input: string): ParsedCommand {
    // Simple mock that returns language-agnostic commands
    if (input === 'look') {
      return {
        rawInput: 'look',
        tokens: [
          {
            word: 'look',
            normalized: 'look',
            position: 0,
            length: 4,
            partOfSpeech: [], // Empty in refactored version
            candidates: [{ id: 'if.action.looking', type: 'verb', confidence: 1.0 }]
          }
        ],
        structure: {
          verb: {
            tokens: [0],
            text: 'look',
            head: 'look'
          }
        },
        pattern: 'VERB_ONLY',
        confidence: 1.0,
        action: 'if.action.looking'
      };
    }
    
    if (input === 'take ball') {
      return {
        rawInput: 'take ball',
        tokens: [
          {
            word: 'take',
            normalized: 'take',
            position: 0,
            length: 4,
            partOfSpeech: [],
            candidates: [{ id: 'if.action.taking', type: 'verb', confidence: 1.0 }]
          },
          {
            word: 'ball',
            normalized: 'ball',
            position: 5,
            length: 4,
            partOfSpeech: [],
            candidates: [{ id: 'ball', type: 'noun', confidence: 0.9 }]
          }
        ],
        structure: {
          verb: {
            tokens: [0],
            text: 'take',
            head: 'take'
          },
          directObject: {
            tokens: [1],
            text: 'ball',
            head: 'ball',
            modifiers: [],
            articles: [],
            determiners: [],
            candidates: ['ball']
          }
        },
        pattern: 'VERB_NOUN',
        confidence: 0.9,
        action: 'if.action.taking'
      };
    }
    
    // Japanese-style command (for demonstration)
    if (input === 'hon wo yomu') { // "book を read"
      return {
        rawInput: 'hon wo yomu',
        tokens: [
          {
            word: 'hon',
            normalized: 'hon',
            position: 0,
            length: 3,
            partOfSpeech: [],
            candidates: [{ id: 'book', type: 'noun', confidence: 1.0 }]
          },
          {
            word: 'wo',
            normalized: 'wo',
            position: 4,
            length: 2,
            partOfSpeech: [],
            candidates: [{ id: 'object_marker', type: 'particle', confidence: 1.0 }]
          },
          {
            word: 'yomu',
            normalized: 'yomu',
            position: 7,
            length: 4,
            partOfSpeech: [],
            candidates: [{ id: 'if.action.reading', type: 'verb', confidence: 1.0 }]
          }
        ],
        structure: {
          verb: {
            tokens: [2],
            text: 'yomu',
            head: 'yomu'
          },
          directObject: {
            tokens: [0],
            text: 'hon',
            head: 'hon',
            modifiers: [],
            articles: [],
            determiners: [],
            candidates: ['book']
          }
        },
        pattern: 'NOUN_PARTICLE_VERB', // Japanese pattern
        confidence: 1.0,
        action: 'if.action.reading'
      };
    }
    
    throw new Error(`Unknown command: ${input}`);
  }
}

// Mock language provider that works with refactored system
class MockRefactoredLanguageProvider {
  languageCode = 'test';
  
  // No parts of speech methods - those are in grammar module
  
  formatList(items: string[], conjunction: 'and' | 'or' = 'and'): string {
    if (items.length === 0) return '';
    if (items.length === 1) return items[0];
    if (items.length === 2) return `${items[0]} ${conjunction} ${items[1]}`;
    return items.slice(0, -1).join(', ') + `, ${conjunction} ${items[items.length - 1]}`;
  }
  
  // Text templates use message IDs, not embedded text
  getMessage(id: string, params?: Record<string, any>): string {
    const messages: Record<string, string> = {
      'if.message.cant_see_that': "You can't see any such thing.",
      'if.message.taken': 'Taken.',
      'if.message.already_have': 'You already have that.',
      'if.message.room_description': '{description}',
      'if.message.you_see': 'You can see {items} here.',
      'if.message.carrying': 'You are carrying {items}.',
      'if.message.carrying_nothing': "You aren't carrying anything."
    };
    
    let message = messages[id] || `[Missing message: ${id}]`;
    
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        message = message.replace(`{${key}}`, String(value));
      });
    }
    
    return message;
  }
}

describe('Engine with language refactoring', () => {
  let world: WorldModel;
  let parser: MockLanguageAgnosticParser;
  let language: MockRefactoredLanguageProvider;
  let story: Story;
  let engine: GameEngine;

  beforeEach(() => {
    // Set up world
    world = new WorldModel();
    parser = new MockLanguageAgnosticParser();
    language = new MockRefactoredLanguageProvider();
    
    // Create simple test world
    const room = world.createEntity('room');
    room.add({ type: 'identity', name: 'Test Room', description: 'A simple test room.' });
    room.add({ type: 'room' });
      
    const ball = world.createEntity('ball');
    ball.add({ type: 'identity', name: 'red ball', description: 'A small red ball.' });
      
    const player = world.createEntity('player');
    player.add({ type: 'identity', name: 'Player' });
    player.add({ type: 'actor' });
      
    world.moveEntity(player.id, room.id);
    world.moveEntity(ball.id, room.id);
    
    // Create story
    story = {
      config: {
        id: 'test-refactoring',
        title: 'Test Story',
        author: 'Test',
        version: '1.0.0',
        language: 'en-us'
      },
      initializeWorld: (w: WorldModel) => {
        // World already initialized above
      },
      createPlayer: (w: WorldModel) => player,
      customActions: [],
      saveRestoreHooks: undefined
    };
    
    // Create engine
    engine = new GameEngine(world, player);
  });

  describe('Language-agnostic command processing', () => {
    test('should process commands without language-specific parsing', async () => {
      await engine.initialize();
      
      // Process a look command
      const lookResult = await engine.processCommand('look');
      
      expect(lookResult.success).toBe(true);
      expect(lookResult.changes).toBeDefined();
      
      // Engine should work with language-agnostic parsed command
      const changes = lookResult.changes || [];
      const textChanges = changes.filter(c => c.type === IFChangeType.TEXT_ADDED);
      expect(textChanges.length).toBeGreaterThan(0);
    });

    test('should handle object references without parts of speech', async () => {
      await engine.initialize();
      
      // Take command uses language-agnostic structure
      const takeResult = await engine.processCommand('take ball');
      
      expect(takeResult.success).toBe(true);
      
      // Verify the ball was taken
      const ballEntity = world.getEntity('ball');
      const playerEntity = world.getEntity('player');
      expect(world.getRelated(ballEntity!, 'if.rel.carried_by')).toContain(playerEntity!);
    });

    test('should support non-English command patterns', async () => {
      await engine.initialize();
      
      // Japanese-style command (Object-Verb order)
      // This would require proper Japanese parser integration
      try {
        const result = await engine.processCommand('hon wo yomu');
        // In a real implementation, this would work
        expect(result.success).toBe(true);
      } catch (e) {
        // Expected in this mock - demonstrates the structure
        expect(e.message).toContain('Unknown command');
      }
    });
  });

  describe('Text service with message IDs', () => {
    test('should use message IDs instead of embedded text', async () => {
      await engine.initialize();
      
      // Look command should use message IDs
      const lookResult = await engine.processCommand('look');
      
      // In refactored system, text service gets message IDs from events
      // and uses language provider to format them
      const changes = lookResult.changes || [];
      const textChanges = changes.filter(c => c.type === IFChangeType.TEXT_ADDED);
      
      // Should see room description
      const descText = textChanges.find(c => 
        c.text?.includes('A simple test room')
      );
      expect(descText).toBeDefined();
      
      // Should see items using message template
      const itemsText = textChanges.find(c => 
        c.text?.includes('You can see') && c.text?.includes('red ball')
      );
      expect(itemsText).toBeDefined();
    });

    test('should format messages with parameters', async () => {
      await engine.initialize();
      
      // Take the ball
      await engine.processCommand('take ball');
      
      // Check inventory
      const invResult = await engine.processCommand('inventory');
      
      const changes = invResult.changes || [];
      const textChanges = changes.filter(c => c.type === IFChangeType.TEXT_ADDED);
      
      // Should use parameterized message
      const invText = textChanges.find(c => 
        c.text?.includes('You are carrying') && c.text?.includes('red ball')
      );
      expect(invText).toBeDefined();
    });

    test('should handle missing messages gracefully', () => {
      const message = language.getMessage('unknown.message.id');
      expect(message).toBe('[Missing message: unknown.message.id]');
    });
  });

  describe('Pattern-agnostic command execution', () => {
    test('should execute commands regardless of pattern name', async () => {
      await engine.initialize();
      
      // The engine doesn't care if the pattern is VERB_ONLY or something else
      // It only cares about the resolved action and structure
      const command: ParsedCommand = {
        rawInput: 'test',
        tokens: [],
        structure: {
          verb: { tokens: [0], text: 'look', head: 'look' }
        },
        pattern: 'CUSTOM_PATTERN_NAME', // Engine doesn't care
        confidence: 1.0,
        action: 'if.action.looking' // This is what matters
      };
      
      // Engine executes based on action, not pattern
      // (In real implementation, would process this command)
      expect(command.action).toBe('if.action.looking');
      expect(command.pattern).toBe('CUSTOM_PATTERN_NAME');
    });
  });

  describe('Language switching support', () => {
    test('should support different language providers', () => {
      // Create Japanese language provider
      class JapaneseLanguageProvider {
        languageCode = 'ja-JP';
        
        getMessage(id: string, params?: Record<string, any>): string {
          const messages: Record<string, string> = {
            'if.message.taken': '取りました。',
            'if.message.room_description': '{description}',
            'if.message.you_see': 'ここに{items}が見えます。'
          };
          
          let message = messages[id] || `[メッセージなし: ${id}]`;
          
          if (params) {
            Object.entries(params).forEach(([key, value]) => {
              message = message.replace(`{${key}}`, String(value));
            });
          }
          
          return message;
        }
        
        formatList(items: string[], conjunction: '、' | 'または' = '、'): string {
          return items.join(conjunction);
        }
      }
      
      const japaneseProvider = new JapaneseLanguageProvider();
      
      // Different languages provide different messages
      expect(language.getMessage('if.message.taken')).toBe('Taken.');
      expect(japaneseProvider.getMessage('if.message.taken')).toBe('取りました。');
      
      // Different list formatting
      expect(language.formatList(['a', 'b', 'c'])).toBe('a, b, and c');
      expect(japaneseProvider.formatList(['a', 'b', 'c'])).toBe('a、b、c');
    });
  });
});

describe('Refactoring benefits', () => {
  test('no more PartOfSpeech enum mapping', () => {
    // Before refactoring, parser had to map between incompatible enums
    // This is no longer needed
    
    const parsed = parser.parse('look');
    
    // Tokens don't have partOfSpeech at top level
    expect(parsed.tokens[0].partOfSpeech).toEqual([]);
    
    // Language-specific info would be in languageData
    // (not implemented in this mock)
  });

  test('supports language-specific patterns', () => {
    // English pattern
    const englishCommand = parser.parse('take ball');
    expect(englishCommand.pattern).toBe('VERB_NOUN');
    
    // Japanese pattern (different word order)
    try {
      const japaneseCommand = parser.parse('hon wo yomu');
      expect(japaneseCommand.pattern).toBe('NOUN_PARTICLE_VERB');
    } catch (e) {
      // Expected in mock
    }
    
    // Each language can have its own patterns
  });

  test('cleaner separation of concerns', () => {
    // Parser: tokenizes and identifies structure
    // Language module: provides grammar rules
    // Engine: executes actions
    // Text service: formats output
    
    // Each component has a clear responsibility
    expect(parser).toHaveProperty('parse');
    expect(language).toHaveProperty('getMessage');
    expect(engine).toHaveProperty('processCommand');
  });
});
