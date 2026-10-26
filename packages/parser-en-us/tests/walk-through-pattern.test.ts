/**
 * @file Walk Through Pattern Tests
 * @description Unit tests for multi-word literal patterns like "walk through south wall"
 *
 * This tests the Sharpee issue where "walk through south wall" fails even when
 * the literal pattern should beat "walk through :target" via literal specificity
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { EnglishLanguageProvider } from '@sharpee/lang-en-us';
import { EnglishGrammarEngine } from '../src/english-grammar-engine';
import { Token } from '@sharpee/if-domain';
import { WorldModel, IdentityTrait } from '@sharpee/world-model';

/** English, handed to hand-built worlds as the language's words (ADR-387 D2). */
const ENGLISH_WORDS = { selfWords: ['me', 'myself', 'self', 'yourself'], nameStopwords: ['the', 'a', 'an', 'of'] };

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
    engine = new EnglishGrammarEngine(new EnglishLanguageProvider());
    grammar = engine.createBuilder();
  });

  describe('Literal pattern vs slot pattern', () => {
    it('should match literal "walk through south wall" pattern', () => {
      // Add both patterns — the literal one wins via specificity (ADR-268)
      grammar
        .define('walk through :target')
        .mapsTo('walk_through.generic')
        .build();

      grammar
        .define('walk through south wall')
        .mapsTo('walk_through.south_wall')
        .build();

      const tokens = createTokens(['walk', 'through', 'south', 'wall']);
      const context = { world: null, actorId: 'player', currentLocation: 'room', slots: new Map() };
      const matches = engine.findMatches(tokens, context);

      // We expect the literal pattern to match (higher literal specificity)
      expect(matches.length).toBeGreaterThan(0);
      expect(matches[0].rule.action).toBe('walk_through.south_wall');
    });

    it('should match "walk through curtain" with slot pattern', () => {
      grammar
        .define('walk through :target')
        .mapsTo('walk_through.generic')
        .build();

      grammar
        .define('walk through south wall')
        .mapsTo('walk_through.south_wall')
        .build();

      const tokens = createTokens(['walk', 'through', 'curtain']);
      const context = { world: null, actorId: 'player', currentLocation: 'room', slots: new Map() };
      const matches = engine.findMatches(tokens, context);

      expect(matches.length).toBeGreaterThan(0);
      expect(matches[0].rule.action).toBe('walk_through.generic');
      expect(matches[0].slots.get('target')?.text).toBe('curtain');
    });

    it('should handle multi-word slot matches like "rusty key"', () => {
      grammar
        .define('take :item')
        .mapsTo('taking')
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
        .build();

      const tokens = createTokens(['walk', 'through', 'south', 'wall']);

      // Mock context with NO south wall entity
      const contextNoEntity = {
        world: {
          getLanguageWords: () => ENGLISH_WORDS,
          // ADR-273: the real WorldModel surface GrammarScopeResolver consumes
          getReachable: () => [],
          getVisible: () => [],
          getCarriedAndWorn: () => ({ carried: [], worn: [] }),
          getAllEntities: () => [],
          getEntity: () => null
        },
        actorId: 'player',
        currentLocation: 'room',
        slots: new Map()
      };

      const matchesNoEntity = engine.findMatches(tokens, contextNoEntity);

      // The constrained pattern should fail without entity
      expect(matchesNoEntity.length).toBe(0);
    });

    it('should match an entity by its name', () => {
      grammar
        .define('walk through :target')
        .where('target', (scope: any) => scope.touchable())
        .mapsTo('walk_through.constrained')
        .build();

      const tokens = createTokens(['walk', 'through', 'south', 'wall']);

      // A real entity: the gate reads its naming surface (ADR-385 D3)
      const southWallEntity = new WorldModel().createEntity('south wall', 'item');

      const contextWithEntity = {
        world: {
          getLanguageWords: () => ENGLISH_WORDS,
          // ADR-273: the real WorldModel surface GrammarScopeResolver consumes
          getReachable: () => [southWallEntity],
          getVisible: () => [southWallEntity],
          getCarriedAndWorn: () => ({ carried: [], worn: [] }),
          getAllEntities: () => [southWallEntity],
          getEntity: (id: string) => id === southWallEntity.id ? southWallEntity : null
        },
        actorId: 'player',
        currentLocation: 'room',
        slots: new Map()
      };

      const matches = engine.findMatches(tokens, contextWithEntity);

      expect(matches.length).toBeGreaterThan(0);
      expect(matches[0].rule.action).toBe('walk_through.constrained');
    });

    it('should match entity by IdentityTrait alias', () => {
      grammar
        .define('walk through :target')
        .where('target', (scope: any) => scope.touchable())
        .mapsTo('walk_through.constrained')
        .build();

      const tokens = createTokens(['walk', 'through', 'south', 'wall']);

      // A real entity named "wall" whose aliases include "south wall"
      const southWallEntity = new WorldModel().createEntity('wall', 'item');
      southWallEntity.add(new IdentityTrait({ name: 'wall', aliases: ['south wall', 's wall', 'southern wall'] }));

      const contextWithEntity = {
        world: {
          getLanguageWords: () => ENGLISH_WORDS,
          // ADR-273: the real WorldModel surface GrammarScopeResolver consumes
          getReachable: () => [southWallEntity],
          getVisible: () => [southWallEntity],
          getCarriedAndWorn: () => ({ carried: [], worn: [] }),
          getAllEntities: () => [southWallEntity],
          getEntity: (id: string) => id === southWallEntity.id ? southWallEntity : null
        },
        actorId: 'player',
        currentLocation: 'room',
        slots: new Map()
      };

      const matches = engine.findMatches(tokens, contextWithEntity);

      expect(matches.length).toBeGreaterThan(0);
      expect(matches[0].rule.action).toBe('walk_through.constrained');
    });
  });

  describe('Pattern specificity ordering', () => {
    it('should rank more-literal patterns first', () => {
      // Generic slot pattern first — specificity, not definition order, decides here
      grammar
        .define('walk through :target')
        .mapsTo('walk_through.generic')
        .build();

      grammar
        .define('walk through north wall')
        .mapsTo('walk_through.north_wall')
        .build();

      grammar
        .define('walk through south wall')
        .mapsTo('walk_through.south_wall')
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
