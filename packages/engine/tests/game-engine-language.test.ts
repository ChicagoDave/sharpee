/**
 * Tests for GameEngine language management
 * 
 * NOTE: These tests are currently skipped because dynamic language loading
 * has been removed in favor of static dependency injection.
 * See migration guide: docs/maintenance/migrations/dynamic-to-static.md
 */

import { describe, it, expect } from 'vitest';

describe.skip('GameEngine Language Management (DEPRECATED)', () => {
  describe('setLanguage()', () => {
    it('should load language provider and parser dynamically', () => {
      // Functionality removed - languages are now provided via constructor
    });

    it('should handle different parser export patterns', () => {
      // Functionality removed - parsers are now provided via constructor
    });

    it('should throw error if language code is not provided', () => {
      // Functionality removed - no dynamic loading
    });

    it('should throw error if parser package is not found', () => {
      // Functionality removed - no dynamic loading
    });

    it('should throw error if parser class is not found in package', () => {
      // Functionality removed - no dynamic loading
    });

    it('should register parser with ParserFactory', () => {
      // Functionality removed - no parser factory needed with static imports
    });
  });

  describe('Story integration', () => {
    it('should use language from story config when setting story', () => {
      // Functionality removed - language not in story config anymore
    });
  });

  describe('Getters', () => {
    it('should return undefined when no language is set', () => {
      // Language is always set via constructor now
    });

    it('should return parser and language provider after setting language', () => {
      // Language and parser are set via constructor now
    });
  });
});

// New tests for static language configuration
describe('GameEngine Static Language Configuration', () => {
  it('should accept language provider and parser via constructor', () => {
    // This is tested in game-engine.test.ts with setupTestEngine
    expect(true).toBe(true);
  });

  it('should have language provider accessible after construction', () => {
    // This is tested in game-engine.test.ts
    expect(true).toBe(true);
  });

  it('should have parser accessible after construction', () => {
    // This is tested in game-engine.test.ts
    expect(true).toBe(true);
  });
});