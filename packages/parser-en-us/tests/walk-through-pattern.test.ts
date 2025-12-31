/**
 * @file Walk Through Pattern Tests
 * @description Unit tests for multi-word literal patterns like "walk through south wall"
 *
 * This tests the Sharpee issue where "walk through south wall" fails even when
 * the literal pattern is defined with higher priority than "walk through :target"
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { EnglishGrammarEngine } from '../src/english-grammar-engine';
import { Token } from '@sharpee/if-domain';

describe('Walk Through Pattern Matching', () => {
  let engine: EnglishGrammarEngine;
  let grammar: any;

  // Helper function to create tokens
  function createTokens(words: string[]): Token[] {
    return words.map((word, index) => ({
      word,
      normalized: word.toLowerCase(),
      position: index * 5,
      candidates: []
    }));
  }

  beforeEach(() => {
    engine = new EnglishGrammarEngine();
    grammar = engine.createBuilder();
  });

  describe('Literal pattern vs slot pattern', () => {
    it('should match literal "walk through south wall" pattern', () => {
      // Add both patterns - literal has higher priority
      grammar
        .define('walk through :target')
        .mapsTo('walk_through.generic')
        .withPriority(150)
        .build();

      grammar
        .define('walk through south wall')
        .mapsTo('walk_through.south_wall')
        .withPriority(155)
        .build();

      const tokens = createTokens(['walk', 'through', 'south', 'wall']);
      const context = { world: null, actorId: 'player', currentLocation: 'room', slots: new Map() };
      const matches = engine.findMatches(tokens, context);

      console.log('Matches found:', matches.length);
      for (const match of matches) {
        console.log(`  - ${match.rule.action} (confidence: ${match.confidence}, priority: ${match.rule.priority})`);
      }

      // We expect the literal pattern to match (higher priority)
      expect(matches.length).toBeGreaterThan(0);
      expect(matches[0].rule.action).toBe('walk_through.south_wall');
    });

    it('should match "walk through curtain" with slot pattern', () => {
      grammar
        .define('walk through :target')
        .mapsTo('walk_through.generic')
        .withPriority(150)
        .build();

      grammar
        .define('walk through south wall')
        .mapsTo('walk_through.south_wall')
        .withPriority(155)
        .build();

      const tokens = createTokens(['walk', 'through', 'curtain']);
      const context = { world: null, actorId: 'player', currentLocation: 'room', slots: new Map() };
      const matches = engine.findMatches(tokens, context);

      console.log('Matches found:', matches.length);
      for (const match of matches) {
        console.log(`  - ${match.rule.action} (confidence: ${match.confidence})`);
        console.log('    slots:', [...match.slots.entries()]);
      }

      expect(matches.length).toBeGreaterThan(0);
      expect(matches[0].rule.action).toBe('walk_through.generic');
      expect(matches[0].slots.get('target')?.text).toBe('curtain');
    });

    it('should handle multi-word slot matches like "rusty key"', () => {
      grammar
        .define('take :item')
        .mapsTo('taking')
        .withPriority(100)
        .build();

      const tokens = createTokens(['take', 'rusty', 'key']);
      const context = { world: null, actorId: 'player', currentLocation: 'room', slots: new Map() };
      const matches = engine.findMatches(tokens, context);

      expect(matches.length).toBeGreaterThan(0);
      expect(matches[0].slots.get('item')?.text).toBe('rusty key');
    });
  });

  describe('Slot pattern with constraints', () => {
    it('should fail when entity not found in scope', () => {
      // Add the slot pattern with a constraint (like story would)
      grammar
        .define('walk through :target')
        .where('target', (scope: any) => scope.touchable())
        .mapsTo('walk_through.constrained')
        .withPriority(150)
        .build();

      const tokens = createTokens(['walk', 'through', 'south', 'wall']);

      // Mock context with NO south wall entity
      const contextNoEntity = {
        world: {
          getTouchableEntities: () => [],
          getVisibleEntities: () => [],
          getCarriedEntities: () => [],
          getAllEntities: () => [],
          getEntitiesAt: () => [],
          getEntity: () => null
        },
        actorId: 'player',
        currentLocation: 'room',
        slots: new Map()
      };

      const matchesNoEntity = engine.findMatches(tokens, contextNoEntity);
      console.log('Matches with NO entity:', matchesNoEntity.length);

      // The constrained pattern should fail without entity
      expect(matchesNoEntity.length).toBe(0);
    });

    it('should match entity by attributes.name', () => {
      grammar
        .define('walk through :target')
        .where('target', (scope: any) => scope.touchable())
        .mapsTo('walk_through.constrained')
        .withPriority(150)
        .build();

      const tokens = createTokens(['walk', 'through', 'south', 'wall']);

      // Entity with attributes.name set (legacy pattern)
      const southWallEntity = {
        id: 'south-wall',
        attributes: {
          name: 'south wall',
          displayName: 'south wall'
        }
      };

      const contextWithEntity = {
        world: {
          getTouchableEntities: () => [southWallEntity],
          getVisibleEntities: () => [southWallEntity],
          getCarriedEntities: () => [],
          getAllEntities: () => [southWallEntity],
          getEntitiesAt: () => [southWallEntity],
          getEntity: (id: string) => id === 'south-wall' ? southWallEntity : null
        },
        actorId: 'player',
        currentLocation: 'room',
        slots: new Map()
      };

      const matches = engine.findMatches(tokens, contextWithEntity);
      console.log('Matches with attributes.name entity:', matches.length);

      expect(matches.length).toBeGreaterThan(0);
      expect(matches[0].rule.action).toBe('walk_through.constrained');
    });

    it('should match entity by IdentityTrait alias', () => {
      grammar
        .define('walk through :target')
        .where('target', (scope: any) => scope.touchable())
        .mapsTo('walk_through.constrained')
        .withPriority(150)
        .build();

      const tokens = createTokens(['walk', 'through', 'south', 'wall']);

      // Entity with IdentityTrait-style .get() method and aliases
      const southWallEntity = {
        id: 'south-wall',
        attributes: {},
        get: (traitName: string) => {
          if (traitName === 'identity') {
            return {
              name: 'wall',  // Primary name is just "wall"
              aliases: ['south wall', 's wall', 'southern wall']  // But aliases include "south wall"
            };
          }
          return undefined;
        }
      };

      const contextWithEntity = {
        world: {
          getTouchableEntities: () => [southWallEntity],
          getVisibleEntities: () => [southWallEntity],
          getCarriedEntities: () => [],
          getAllEntities: () => [southWallEntity],
          getEntitiesAt: () => [southWallEntity],
          getEntity: (id: string) => id === 'south-wall' ? southWallEntity : null
        },
        actorId: 'player',
        currentLocation: 'room',
        slots: new Map()
      };

      const matches = engine.findMatches(tokens, contextWithEntity);
      console.log('Matches with IdentityTrait alias:', matches.length);
      for (const match of matches) {
        console.log(`  - ${match.rule.action} (confidence: ${match.confidence})`);
      }

      expect(matches.length).toBeGreaterThan(0);
      expect(matches[0].rule.action).toBe('walk_through.constrained');
    });
  });

  describe('Pattern priority ordering', () => {
    it('should try higher priority patterns first', () => {
      // Lower priority first (to ensure order doesn't matter in definition)
      grammar
        .define('walk through :target')
        .mapsTo('walk_through.generic')
        .withPriority(150)
        .build();

      grammar
        .define('walk through north wall')
        .mapsTo('walk_through.north_wall')
        .withPriority(155)
        .build();

      grammar
        .define('walk through south wall')
        .mapsTo('walk_through.south_wall')
        .withPriority(155)
        .build();

      // Test south wall
      const southTokens = createTokens(['walk', 'through', 'south', 'wall']);
      const context = { world: null, actorId: 'player', currentLocation: 'room', slots: new Map() };
      const southMatches = engine.findMatches(southTokens, context);

      expect(southMatches[0].rule.action).toBe('walk_through.south_wall');

      // Test north wall
      const northTokens = createTokens(['walk', 'through', 'north', 'wall']);
      const northMatches = engine.findMatches(northTokens, context);

      expect(northMatches[0].rule.action).toBe('walk_through.north_wall');

      // Test generic (curtain) - should use generic pattern
      const genericTokens = createTokens(['walk', 'through', 'curtain']);
      const genericMatches = engine.findMatches(genericTokens, context);

      expect(genericMatches[0].rule.action).toBe('walk_through.generic');
    });
  });
});
