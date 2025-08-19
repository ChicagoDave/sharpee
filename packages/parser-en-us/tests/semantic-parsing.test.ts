/**
 * Tests for Semantic Parsing
 * 
 * Demonstrates how semantic grammar provides clean properties to actions
 * without needing to access parser internals.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { SemanticParserEngine } from '../src/semantic-parser-engine';
import { defineSemanticInsertingRules, defineSemanticGoingRules, defineSemanticDroppingRules } from '../src/semantic-grammar-rules';
import { GrammarBuilder, Token, GrammarContext } from '@sharpee/if-domain';

// Mock implementation of GrammarBuilder for testing
class TestGrammarBuilder implements GrammarBuilder {
  rules: any[] = [];
  currentRule: any = {};
  
  define(pattern: string) {
    this.currentRule = { pattern, slots: new Map() };
    return this;
  }
  
  where(slot: string, constraint: any) {
    this.currentRule.slots.set(slot, { name: slot, constraints: [constraint] });
    return this;
  }
  
  mapsTo(action: string) {
    this.currentRule.action = action;
    return this;
  }
  
  withPriority(priority: number) {
    this.currentRule.priority = priority;
    return this;
  }
  
  withSemanticVerbs(verbs: any) {
    if (!this.currentRule.semantics) this.currentRule.semantics = {};
    this.currentRule.semantics.verbs = verbs;
    return this;
  }
  
  withSemanticPrepositions(prepositions: any) {
    if (!this.currentRule.semantics) this.currentRule.semantics = {};
    this.currentRule.semantics.prepositions = prepositions;
    return this;
  }
  
  withSemanticDirections(directions: any) {
    if (!this.currentRule.semantics) this.currentRule.semantics = {};
    this.currentRule.semantics.directions = directions;
    return this;
  }
  
  withDefaultSemantics(defaults: any) {
    this.currentRule.defaultSemantics = defaults;
    return this;
  }
  
  build() {
    this.currentRule.id = `rule-${this.rules.length}`;
    this.rules.push({ ...this.currentRule });
    this.currentRule = {};
    return this;
  }
  
  getRules() {
    return this.rules;
  }
  
  clear() {
    this.rules = [];
  }
}

describe('Semantic Parsing', () => {
  let engine: SemanticParserEngine;
  let grammar: TestGrammarBuilder;
  let context: GrammarContext;
  
  // Helper to find a specific action in matches
  const findAction = (matches: any[], action: string) => {
    return matches.find(m => m.rule.action === action);
  };
  
  beforeEach(() => {
    engine = new SemanticParserEngine();
    grammar = new TestGrammarBuilder();
    
    // Define semantic rules
    defineSemanticInsertingRules(grammar);
    defineSemanticGoingRules(grammar);
    defineSemanticDroppingRules(grammar);
    
    // Add rules to engine
    for (const rule of grammar.getRules()) {
      engine.addRule(rule);
    }
    
    // Mock context with world model containing test entities
    context = {
      world: {
        entities: {
          'coin': { 
            id: 'coin', 
            attributes: { name: 'coin' },
            portable: true,
            location: 'player' // carried
          },
          'slot': { 
            id: 'slot', 
            attributes: { name: 'slot' },
            container: true,
            location: 'room1'
          },
          'key': {
            id: 'key',
            attributes: { name: 'key' },
            portable: true,
            location: 'player' // carried
          },
          'lock': {
            id: 'lock',
            attributes: { name: 'lock' },
            container: true,
            location: 'room1'
          },
          'card': {
            id: 'card',
            attributes: { name: 'card' },
            portable: true,
            location: 'player'
          },
          'reader': {
            id: 'reader',
            attributes: { name: 'reader' },
            container: true,
            location: 'room1'
          },
          'note': {
            id: 'note',
            attributes: { name: 'note' },
            portable: true,
            location: 'player'
          },
          'pocket': {
            id: 'pocket',
            attributes: { name: 'pocket' },
            container: true,
            location: 'room1'
          },
          'sword': {
            id: 'sword',
            attributes: { name: 'sword' },
            portable: true,
            location: 'player'
          },
          'wrapper': {
            id: 'wrapper',
            attributes: { name: 'wrapper' },
            portable: true,
            location: 'player'
          },
          'weapon': {
            id: 'weapon',
            attributes: { name: 'weapon' },
            portable: true,
            location: 'player'
          },
          'vase': {
            id: 'vase',
            attributes: { name: 'vase' },
            portable: true,
            location: 'player'
          }
        },
        locations: {
          'room1': { id: 'room1', name: 'Test Room' }
        },
        getEntity: function(id: string) { 
          return this.entities[id]; 
        },
        getLocation: function(id: string) {
          return this.locations[id];
        },
        getEntitiesAt: function(locationId: string) {
          return Object.values(this.entities).filter((e: any) => e.location === locationId);
        },
        getCarriedBy: function(actorId: string) {
          return Object.values(this.entities).filter((e: any) => e.location === actorId);
        },
        getCarriedEntities: function(actorId: string) {
          return Object.values(this.entities).filter((e: any) => e.location === actorId);
        },
        getTouchableEntities: function(actorId: string, locationId: string) {
          return Object.values(this.entities).filter((e: any) => 
            e.location === locationId || e.location === actorId
          );
        },
        getVisibleEntities: function(actorId: string, locationId: string) {
          return Object.values(this.entities).filter((e: any) => 
            e.location === locationId || e.location === actorId
          );
        },
        getAllEntities: function() {
          return Object.values(this.entities);
        }
      } as any,
      actorId: 'player',
      currentLocation: 'room1',
      slots: new Map()
    };
  });
  
  describe('INSERTING semantics', () => {
    it('should handle implicit preposition "insert X Y"', () => {
      const tokens: Token[] = [
        { word: 'insert', normalized: 'insert', type: 'verb' },
        { word: 'coin', normalized: 'coin', type: 'noun' },
        { word: 'slot', normalized: 'slot', type: 'noun' }
      ];
      
      const matches = engine.findMatches(tokens, context);
      
      // Find the inserting match (there might be multiple matches)
      const insertingMatch = matches.find(m => m.rule.action === 'if.action.inserting');
      
      expect(insertingMatch).toBeDefined();
      expect(insertingMatch!.semantics).toEqual({
        manner: 'normal',
        spatialRelation: 'in',
        implicitPreposition: true
      });
    });
    
    it('should handle explicit preposition "insert X into Y"', () => {
      const tokens: Token[] = [
        { word: 'insert', normalized: 'insert', type: 'verb' },
        { word: 'key', normalized: 'key', type: 'noun' },
        { word: 'into', normalized: 'into', type: 'preposition' },
        { word: 'lock', normalized: 'lock', type: 'noun' }
      ];
      
      const matches = engine.findMatches(tokens, context);
      const insertingMatch = findAction(matches, 'if.action.inserting');
      
      expect(insertingMatch).toBeDefined();
      expect(insertingMatch!.semantics).toEqual({
        manner: 'normal',
        spatialRelation: 'in',  // "into" normalized to "in"
        implicitPreposition: false
      });
    });
    
    it('should recognize forceful insertion "jam X into Y"', () => {
      const tokens: Token[] = [
        { word: 'jam', normalized: 'jam', type: 'verb' },
        { word: 'card', normalized: 'card', type: 'noun' },
        { word: 'into', normalized: 'into', type: 'preposition' },
        { word: 'reader', normalized: 'reader', type: 'noun' }
      ];
      
      const matches = engine.findMatches(tokens, context);
      const insertingMatch = findAction(matches, 'if.action.inserting');
      
      expect(insertingMatch).toBeDefined();
      expect(insertingMatch!.semantics).toEqual({
        manner: 'forceful',
        spatialRelation: 'in',
        implicitPreposition: false
      });
    });
    
    it('should recognize stealthy insertion "slip X into Y"', () => {
      const tokens: Token[] = [
        { word: 'slip', normalized: 'slip', type: 'verb' },
        { word: 'note', normalized: 'note', type: 'noun' },
        { word: 'into', normalized: 'into', type: 'preposition' },
        { word: 'pocket', normalized: 'pocket', type: 'noun' }
      ];
      
      const matches = engine.findMatches(tokens, context);
      const insertingMatch = findAction(matches, 'if.action.inserting');
      
      expect(insertingMatch).toBeDefined();
      expect(insertingMatch!.semantics).toEqual({
        manner: 'stealthy',
        spatialRelation: 'in',
        implicitPreposition: false
      });
    });
  });
  
  describe('GOING semantics', () => {
    it('should normalize direction abbreviations', () => {
      const tokens: Token[] = [
        { word: 'n', normalized: 'n', type: 'direction' }
      ];
      
      const matches = engine.findMatches(tokens, context);
      const goingMatch = findAction(matches, 'if.action.going');
      
      expect(goingMatch).toBeDefined();
      expect(goingMatch!.semantics?.direction).toBe('north');
    });
    
    it('should handle "go north" with manner', () => {
      const tokens: Token[] = [
        { word: 'go', normalized: 'go', type: 'verb' },
        { word: 'north', normalized: 'north', type: 'direction' }
      ];
      
      const matches = engine.findMatches(tokens, context);
      const goingMatch = findAction(matches, 'if.action.going');
      
      expect(goingMatch).toBeDefined();
      expect(goingMatch!.semantics).toEqual({
        manner: 'normal',
        direction: 'north'
      });
    });
    
    it('should handle "run east" with quick manner', () => {
      const tokens: Token[] = [
        { word: 'run', normalized: 'run', type: 'verb' },
        { word: 'east', normalized: 'east', type: 'direction' }
      ];
      
      const matches = engine.findMatches(tokens, context);
      const goingMatch = findAction(matches, 'if.action.going');
      
      expect(goingMatch).toBeDefined();
      expect(goingMatch!.semantics).toEqual({
        manner: 'quick',
        direction: 'east'
      });
    });
  });
  
  describe('DROPPING semantics', () => {
    it('should handle normal dropping', () => {
      const tokens: Token[] = [
        { word: 'drop', normalized: 'drop', type: 'verb' },
        { word: 'sword', normalized: 'sword', type: 'noun' }
      ];
      
      const matches = engine.findMatches(tokens, context);
      const droppingMatch = findAction(matches, 'if.action.dropping');
      
      expect(droppingMatch).toBeDefined();
      expect(droppingMatch!.semantics?.manner).toBe('normal');
    });
    
    it('should handle careless discarding', () => {
      const tokens: Token[] = [
        { word: 'discard', normalized: 'discard', type: 'verb' },
        { word: 'wrapper', normalized: 'wrapper', type: 'noun' }
      ];
      
      const matches = engine.findMatches(tokens, context);
      const droppingMatch = findAction(matches, 'if.action.dropping');
      
      expect(droppingMatch).toBeDefined();
      expect(droppingMatch!.semantics?.manner).toBe('careless');
    });
    
    it('should handle forceful throwing', () => {
      const tokens: Token[] = [
        { word: 'throw', normalized: 'throw', type: 'verb' },
        { word: 'down', normalized: 'down', type: 'particle' },
        { word: 'weapon', normalized: 'weapon', type: 'noun' }
      ];
      
      const matches = engine.findMatches(tokens, context);
      const droppingMatch = findAction(matches, 'if.action.dropping');
      
      expect(droppingMatch).toBeDefined();
      expect(droppingMatch!.semantics?.manner).toBe('forceful');
    });
    
    it('should handle careful placing', () => {
      const tokens: Token[] = [
        { word: 'gently', normalized: 'gently', type: 'adverb' },
        { word: 'place', normalized: 'place', type: 'verb' },
        { word: 'vase', normalized: 'vase', type: 'noun' }
      ];
      
      const matches = engine.findMatches(tokens, context);
      const droppingMatch = findAction(matches, 'if.action.dropping');
      
      expect(droppingMatch).toBeDefined();
      expect(droppingMatch!.semantics?.manner).toBe('careful');
    });
  });
});

/**
 * These tests demonstrate that:
 * 
 * 1. Grammar rules provide semantic properties directly
 * 2. Prepositions are normalized (into → in, onto → on)
 * 3. Directions are normalized (n → north, s → south)
 * 4. Verb variations map to manner (discard → careless, jam → forceful)
 * 5. Implicit prepositions are detected and flagged
 * 
 * Actions no longer need to:
 * - Access context.command.parsed
 * - Check verb.text for variations
 * - Normalize directions or prepositions
 * - Modify commands to add implicit prepositions
 */