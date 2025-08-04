/**
 * @file English Grammar Engine Tests
 * @description Unit tests for the English-specific grammar matching engine
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { EnglishGrammarEngine } from '../src/english-grammar-engine';
import { Token, PartOfSpeech as VocabPartOfSpeech } from '@sharpee/if-domain';

describe('EnglishGrammarEngine', () => {
  let engine: EnglishGrammarEngine;
  let grammar: any;
  
  beforeEach(() => {
    engine = new EnglishGrammarEngine();
    grammar = engine.createBuilder();
  });
  
  // Helper function to create tokens
  function createTokens(words: string[]): Token[] {
    return words.map((word, index) => ({
      word,
      normalized: word.toLowerCase(),
      position: index * 5,
      candidates: []
    }));
  }
  
  // Helper function to create a token with candidates
  function createToken(word: string, candidates: Array<{type: string, id: string}>): Token {
    return {
      word,
      normalized: word.toLowerCase(),
      position: 0,
      candidates: candidates.map(c => ({
        partOfSpeech: c.type as VocabPartOfSpeech,
        mapsTo: c.id,
        priority: 1
      }))
    };
  }
  
  describe('Basic Pattern Matching', () => {
    it('should match simple verb patterns', () => {
      grammar
        .define('look')
        .mapsTo('if.action.looking')
        .build();
      
      const tokens = createTokens(['look']);
      const context = { world: null, actorId: 'player', currentLocation: 'room', slots: new Map() };
      const matches = engine.findMatches(tokens, context);
      
      expect(matches).toHaveLength(1);
      expect(matches[0].rule.action).toBe('if.action.looking');
      expect(matches[0].confidence).toBeGreaterThan(0);
    });
    
    it('should match verb-noun patterns', () => {
      grammar
        .define('take :item')
        .mapsTo('if.action.taking')
        .build();
      
      const tokens = createTokens(['take', 'sword']);
      const context = { world: null, actorId: 'player', currentLocation: 'room', slots: new Map() };
      const matches = engine.findMatches(tokens, context);
      
      expect(matches).toHaveLength(1);
      expect(matches[0].rule.action).toBe('if.action.taking');
      const itemSlot = matches[0].slots.get('item');
      expect(itemSlot?.text).toBe('sword');
      expect(itemSlot?.tokens).toEqual([1]);
    });
    
    it('should match patterns with alternates', () => {
      grammar
        .define('put :item in|into|inside :container')
        .mapsTo('if.action.inserting')
        .build();
      
      // Test each alternate
      const alternates = ['in', 'into', 'inside'];
      for (const prep of alternates) {
        const tokens = createTokens(['put', 'ball', prep, 'box']);
        const context = { world: null, actorId: 'player', currentLocation: 'room', slots: new Map() };
        const matches = engine.findMatches(tokens, context);
        
        expect(matches).toHaveLength(1);
        expect(matches[0].rule.action).toBe('if.action.inserting');
      }
    });
    
    it('should not match incorrect patterns', () => {
      grammar
        .define('take :item')
        .mapsTo('if.action.taking')
        .build();
      
      const tokens = createTokens(['drop', 'sword']);
      const context = { world: null, actorId: 'player', currentLocation: 'room', slots: new Map() };
      const matches = engine.findMatches(tokens, context);
      
      expect(matches).toHaveLength(0);
    });
  });
  
  describe('Slot Extraction', () => {
    it('should extract single slots correctly', () => {
      grammar
        .define('examine :target')
        .mapsTo('if.action.examining')
        .build();
      
      const tokens = createTokens(['examine', 'painting']);
      const context = { world: null, actorId: 'player', currentLocation: 'room', slots: new Map() };
      const matches = engine.findMatches(tokens, context);
      
      expect(matches).toHaveLength(1);
      const targetSlot = matches[0].slots.get('target');
      expect(targetSlot?.text).toBe('painting');
      expect(targetSlot?.tokens).toEqual([1]);
    });
    
    it('should extract multiple slots correctly', () => {
      grammar
        .define('give :item to :recipient')
        .mapsTo('if.action.giving')
        .build();
      
      const tokens = createTokens(['give', 'sword', 'to', 'guard']);
      const context = { world: null, actorId: 'player', currentLocation: 'room', slots: new Map() };
      const matches = engine.findMatches(tokens, context);
      
      expect(matches).toHaveLength(1);
      expect(matches[0].slots.get('item')?.text).toBe('sword');
      expect(matches[0].slots.get('recipient')?.text).toBe('guard');
    });
    
    it('should handle multi-word slots', () => {
      grammar
        .define('take :item')
        .mapsTo('if.action.taking')
        .build();
      
      const tokens = createTokens(['take', 'rusty', 'iron', 'key']);
      const context = { world: null, actorId: 'player', currentLocation: 'room', slots: new Map() };
      const matches = engine.findMatches(tokens, context);
      
      expect(matches).toHaveLength(1);
      const itemSlot = matches[0].slots.get('item');
      expect(itemSlot?.text).toBe('rusty iron key');
      expect(itemSlot?.tokens).toEqual([1, 2, 3]);
    });
  });
  
  describe('Priority and Confidence', () => {
    it('should respect rule priorities', () => {
      grammar
        .define('put :item on :supporter')
        .mapsTo('if.action.putting')
        .withPriority(100)
        .build();
      
      grammar
        .define('hang :item on :hook')
        .mapsTo('if.action.hanging')
        .withPriority(150)
        .build();
      
      const tokens = createTokens(['hang', 'cloak', 'on', 'hook']);
      const context = { world: null, actorId: 'player', currentLocation: 'room', slots: new Map() };
      const matches = engine.findMatches(tokens, context);
      
      // Both should match, but hang should be first due to priority
      expect(matches.length).toBeGreaterThanOrEqual(1);
      expect(matches[0].rule.action).toBe('if.action.hanging');
    });
    
    it('should calculate confidence based on alternate matches', () => {
      grammar
        .define('look at :target')
        .mapsTo('if.action.examining')
        .withPriority(100)
        .build();
        
      grammar
        .define('examine :target')
        .mapsTo('if.action.examining')
        .withPriority(90)
        .build();
      
      const tokens1 = createTokens(['look', 'at', 'mirror']);
      const tokens2 = createTokens(['examine', 'mirror']);
      const context = { world: null, actorId: 'player', currentLocation: 'room', slots: new Map() };
      
      const matches1 = engine.findMatches(tokens1, context);
      const matches2 = engine.findMatches(tokens2, context);
      
      expect(matches1).toHaveLength(1);
      expect(matches2).toHaveLength(1);
      
      // Higher priority rule should have higher confidence
      expect(matches1[0].confidence).toBeGreaterThanOrEqual(matches2[0].confidence);
    });
  });
  
  describe('Edge Cases', () => {
    it('should handle empty token lists', () => {
      grammar
        .define('look')
        .mapsTo('if.action.looking')
        .build();
      
      const tokens: Token[] = [];
      const context = { world: null, actorId: 'player', currentLocation: 'room', slots: new Map() };
      const matches = engine.findMatches(tokens, context);
      
      expect(matches).toHaveLength(0);
    });
    
    it('should handle patterns longer than token list', () => {
      grammar
        .define('put :item in :container')
        .mapsTo('if.action.inserting')
        .build();
      
      const tokens = createTokens(['put', 'ball']);
      const context = { world: null, actorId: 'player', currentLocation: 'room', slots: new Map() };
      const matches = engine.findMatches(tokens, context);
      
      expect(matches).toHaveLength(0);
    });
    
    it('should require exact token count match', () => {
      grammar
        .define('look')
        .mapsTo('if.action.looking')
        .build();
      
      const tokens = createTokens(['look', 'around']);
      const context = { world: null, actorId: 'player', currentLocation: 'room', slots: new Map() };
      const matches = engine.findMatches(tokens, context);
      
      // Should not match because we have extra tokens
      expect(matches).toHaveLength(0);
    });
  });
  
  describe('Multiple Rule Matching', () => {
    it('should find all matching rules', () => {
      grammar.define('take :item').mapsTo('if.action.taking').build();
      grammar.define('get :item').mapsTo('if.action.taking').build();
      grammar.define('grab :item').mapsTo('if.action.taking').build();
      
      const tokens = createTokens(['take', 'sword']);
      const context = { world: null, actorId: 'player', currentLocation: 'room', slots: new Map() };
      const matches = engine.findMatches(tokens, context);
      
      expect(matches).toHaveLength(1);
      expect(matches[0].rule.action).toBe('if.action.taking');
    });
    
    it('should limit matches based on maxMatches option', () => {
      // Add many rules that would match
      for (let i = 0; i < 20; i++) {
        grammar
          .define('look')
          .mapsTo(`if.action.looking${i}`)
          .build();
      }
      
      const tokens = createTokens(['look']);
      const context = { world: null, actorId: 'player', currentLocation: 'room', slots: new Map() };
      const matches = engine.findMatches(tokens, context, { maxMatches: 5 });
      
      expect(matches).toHaveLength(5);
    });
  });
});