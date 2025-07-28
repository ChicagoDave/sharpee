/**
 * Test Setup Utilities
 * 
 * Provides utilities for setting up tests with the new language management system
 */

import { GameEngine, createStandardEngine } from '../../src/game-engine';
import { Story } from '../../src/story';
import { createMockParser } from '../fixtures/mock-parser';
import { ParserFactory } from '@sharpee/stdlib';

/**
 * Mock the dynamic imports for tests
 */
export function setupLanguageMocks() {
  // Mock the language provider loader
  jest.mock('../../src/story', () => ({
    ...jest.requireActual('../../src/story'),
    loadLanguageProvider: jest.fn().mockImplementation(async (languageCode: string) => {
      // Return a mock language provider
      return {
        getLanguageCode: () => languageCode,
        getMessage: (key: string, ...params: any[]) => `[${key}]`,
        format: (template: string, data: any) => template,
        getVocabulary: () => ({
          verbs: {
            'if.action.looking': { words: ['look', 'l', 'examine', 'x'] },
            'if.action.taking': { words: ['take', 'get', 'grab'] },
            'if.action.dropping': { words: ['drop', 'discard'] },
            'if.action.going': { words: ['go', 'walk', 'move'] },
            'if.action.inventory': { words: ['inventory', 'i', 'inv'] },
            'if.action.waiting': { words: ['wait', 'z'] },
            'if.action.scoring': { words: ['score', 'points'] },
            'if.action.help': { words: ['help', 'h', '?'] },
            'if.action.about': { words: ['about', 'info', 'credits'] },
            'if.action.quitting': { words: ['quit', 'q', 'exit'] },
            'if.action.saving': { words: ['save'] },
            'if.action.restoring': { words: ['restore', 'load'] },
            // Add common test verbs
            'test-events': { words: ['test-events'] },
            'mocktest': { words: ['mocktest'] }
          },
          prepositions: {
            in: ['in', 'into', 'inside'],
            on: ['on', 'onto', 'upon'],
            under: ['under', 'beneath', 'below'],
            with: ['with', 'using']
          }
        })
      };
    })
  }));

  // Mock dynamic parser imports
  const mockParserModules: Record<string, any> = {
    '@sharpee/parser-en-us': {
      EnglishParser: class MockEnglishParser {
        constructor(private languageProvider: any) {}
        parse(input: string) {
          return createMockParser(this.languageProvider).parse(input);
        }
      }
    },
    '@sharpee/parser-test': {
      Parser: class MockTestParser {
        constructor(private languageProvider: any) {}
        parse(input: string) {
          return createMockParser(this.languageProvider).parse(input);
        }
      }
    }
  };

  // Override dynamic import
  const originalImport = global.import;
  global.import = jest.fn().mockImplementation(async (moduleName: string) => {
    if (mockParserModules[moduleName]) {
      return mockParserModules[moduleName];
    }
    // Fall back to original import for other modules
    return originalImport(moduleName);
  });
}

/**
 * Create a test engine with mocked language support
 */
export async function createTestEngine(story?: Story): Promise<GameEngine> {
  setupLanguageMocks();
  
  const engine = createStandardEngine();
  
  if (story) {
    await engine.setStory(story);
  } else {
    // Default to test language
    await engine.setLanguage('test');
  }
  
  return engine;
}

/**
 * Clean up mocks after tests
 */
export function cleanupLanguageMocks() {
  jest.unmock('../../src/story');
  jest.restoreAllMocks();
}
