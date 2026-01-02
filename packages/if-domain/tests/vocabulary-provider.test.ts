/**
 * @file VocabularyProvider Tests
 * @description Tests for context-aware vocabulary system (ADR-082)
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  GrammarVocabularyProvider,
  IGrammarVocabularyProvider,
  GrammarContext
} from '../src/grammar';

describe('GrammarVocabularyProvider', () => {
  let vocab: IGrammarVocabularyProvider;
  let baseContext: GrammarContext;

  beforeEach(() => {
    vocab = new GrammarVocabularyProvider();
    baseContext = {
      world: {},
      actorId: 'player',
      currentLocation: 'room-1',
      slots: new Map()
    };
  });

  describe('define()', () => {
    it('should define a vocabulary category', () => {
      vocab.define('colors', {
        words: ['red', 'blue', 'green']
      });

      expect(vocab.hasCategory('colors')).toBe(true);
      expect(vocab.getWords('colors')).toEqual(new Set(['red', 'blue', 'green']));
    });

    it('should normalize words to lowercase', () => {
      vocab.define('colors', {
        words: ['RED', 'Blue', 'GrEeN']
      });

      expect(vocab.getWords('colors')).toEqual(new Set(['red', 'blue', 'green']));
    });

    it('should throw if category already exists', () => {
      vocab.define('colors', { words: ['red'] });

      expect(() => {
        vocab.define('colors', { words: ['blue'] });
      }).toThrow("Vocabulary category 'colors' already exists");
    });

    it('should store context predicate', () => {
      const mirrorRoomId = 'inside-mirror';

      vocab.define('panel-colors', {
        words: ['red', 'yellow'],
        when: (ctx) => ctx.currentLocation === mirrorRoomId
      });

      // Active in mirror room
      expect(vocab.isActive('panel-colors', {
        ...baseContext,
        currentLocation: mirrorRoomId
      })).toBe(true);

      // Not active elsewhere
      expect(vocab.isActive('panel-colors', {
        ...baseContext,
        currentLocation: 'other-room'
      })).toBe(false);
    });
  });

  describe('extend()', () => {
    it('should add words to existing category', () => {
      vocab.define('colors', { words: ['red', 'blue'] });
      vocab.extend('colors', ['green', 'yellow']);

      expect(vocab.getWords('colors')).toEqual(
        new Set(['red', 'blue', 'green', 'yellow'])
      );
    });

    it('should normalize extended words to lowercase', () => {
      vocab.define('colors', { words: ['red'] });
      vocab.extend('colors', ['BLUE', 'Green']);

      expect(vocab.getWords('colors')).toEqual(
        new Set(['red', 'blue', 'green'])
      );
    });

    it('should throw if category does not exist', () => {
      expect(() => {
        vocab.extend('nonexistent', ['word']);
      }).toThrow("Vocabulary category 'nonexistent' does not exist");
    });
  });

  describe('match()', () => {
    it('should match words in category (case-insensitive)', () => {
      vocab.define('colors', { words: ['red', 'blue'] });

      expect(vocab.match('colors', 'red', baseContext)).toBe(true);
      expect(vocab.match('colors', 'RED', baseContext)).toBe(true);
      expect(vocab.match('colors', 'Red', baseContext)).toBe(true);
      expect(vocab.match('colors', 'blue', baseContext)).toBe(true);
    });

    it('should not match words not in category', () => {
      vocab.define('colors', { words: ['red', 'blue'] });

      expect(vocab.match('colors', 'green', baseContext)).toBe(false);
      expect(vocab.match('colors', 'purple', baseContext)).toBe(false);
    });

    it('should not match in non-existent category', () => {
      expect(vocab.match('nonexistent', 'word', baseContext)).toBe(false);
    });

    it('should respect context predicate', () => {
      const mirrorRoomId = 'inside-mirror';

      vocab.define('panel-colors', {
        words: ['red', 'yellow'],
        when: (ctx) => ctx.currentLocation === mirrorRoomId
      });

      // Should match in mirror room
      const mirrorContext = { ...baseContext, currentLocation: mirrorRoomId };
      expect(vocab.match('panel-colors', 'red', mirrorContext)).toBe(true);

      // Should NOT match in other rooms
      const otherContext = { ...baseContext, currentLocation: 'other-room' };
      expect(vocab.match('panel-colors', 'red', otherContext)).toBe(false);
    });
  });

  describe('isActive()', () => {
    it('should return true for categories without predicate', () => {
      vocab.define('global-vocab', { words: ['word'] });

      expect(vocab.isActive('global-vocab', baseContext)).toBe(true);
    });

    it('should return false for non-existent categories', () => {
      expect(vocab.isActive('nonexistent', baseContext)).toBe(false);
    });

    it('should evaluate context predicate', () => {
      vocab.define('combat-words', {
        words: ['attack', 'defend'],
        when: (ctx) => (ctx.world as any).inCombat === true
      });

      // Not in combat
      expect(vocab.isActive('combat-words', {
        ...baseContext,
        world: { inCombat: false }
      })).toBe(false);

      // In combat
      expect(vocab.isActive('combat-words', {
        ...baseContext,
        world: { inCombat: true }
      })).toBe(true);
    });
  });

  describe('getWords()', () => {
    it('should return copy of words set', () => {
      vocab.define('colors', { words: ['red', 'blue'] });

      const words = vocab.getWords('colors');
      words.add('green'); // Modify the returned set

      // Original should be unchanged
      expect(vocab.getWords('colors')).toEqual(new Set(['red', 'blue']));
    });

    it('should return empty set for non-existent category', () => {
      expect(vocab.getWords('nonexistent')).toEqual(new Set());
    });
  });

  describe('hasCategory()', () => {
    it('should return true for existing categories', () => {
      vocab.define('colors', { words: ['red'] });
      expect(vocab.hasCategory('colors')).toBe(true);
    });

    it('should return false for non-existent categories', () => {
      expect(vocab.hasCategory('nonexistent')).toBe(false);
    });
  });

  describe('getCategories()', () => {
    it('should return all category names', () => {
      vocab.define('colors', { words: ['red'] });
      vocab.define('sizes', { words: ['big'] });
      vocab.define('shapes', { words: ['round'] });

      const categories = vocab.getCategories();
      expect(categories).toHaveLength(3);
      expect(categories).toContain('colors');
      expect(categories).toContain('sizes');
      expect(categories).toContain('shapes');
    });

    it('should return empty array when no categories', () => {
      expect(vocab.getCategories()).toEqual([]);
    });
  });

  describe('removeCategory()', () => {
    it('should remove existing category', () => {
      vocab.define('colors', { words: ['red'] });
      expect(vocab.hasCategory('colors')).toBe(true);

      const removed = vocab.removeCategory('colors');
      expect(removed).toBe(true);
      expect(vocab.hasCategory('colors')).toBe(false);
    });

    it('should return false for non-existent category', () => {
      expect(vocab.removeCategory('nonexistent')).toBe(false);
    });
  });

  describe('clear()', () => {
    it('should remove all categories', () => {
      vocab.define('colors', { words: ['red'] });
      vocab.define('sizes', { words: ['big'] });

      vocab.clear();

      expect(vocab.getCategories()).toEqual([]);
      expect(vocab.hasCategory('colors')).toBe(false);
      expect(vocab.hasCategory('sizes')).toBe(false);
    });
  });

  describe('Real-world usage: Inside Mirror puzzle', () => {
    it('should support context-aware panel colors', () => {
      const insideMirrorId = 'endgame-inside-mirror';

      // Register vocabulary like a story would
      vocab.define('panel-colors', {
        words: ['red', 'yellow', 'mahogany', 'pine'],
        when: (ctx) => ctx.currentLocation === insideMirrorId
      });

      // In Inside Mirror room
      const mirrorContext: GrammarContext = {
        ...baseContext,
        currentLocation: insideMirrorId
      };

      expect(vocab.match('panel-colors', 'red', mirrorContext)).toBe(true);
      expect(vocab.match('panel-colors', 'mahogany', mirrorContext)).toBe(true);
      expect(vocab.match('panel-colors', 'blue', mirrorContext)).toBe(false); // Not a panel color

      // Outside Inside Mirror room
      const hallwayContext: GrammarContext = {
        ...baseContext,
        currentLocation: 'hallway'
      };

      expect(vocab.match('panel-colors', 'red', hallwayContext)).toBe(false); // Not active here
    });
  });

  describe('Real-world usage: Manner adverbs', () => {
    it('should support global manner vocabulary', () => {
      // Register global manner vocabulary (no context predicate)
      vocab.define('manner', {
        words: ['carefully', 'quickly', 'forcefully', 'quietly', 'loudly']
      });

      // Should match anywhere
      expect(vocab.match('manner', 'carefully', baseContext)).toBe(true);
      expect(vocab.match('manner', 'QUICKLY', baseContext)).toBe(true);

      // Story extends with custom adverbs
      vocab.extend('manner', ['stealthily', 'recklessly']);

      expect(vocab.match('manner', 'stealthily', baseContext)).toBe(true);
      expect(vocab.match('manner', 'recklessly', baseContext)).toBe(true);
    });
  });
});
