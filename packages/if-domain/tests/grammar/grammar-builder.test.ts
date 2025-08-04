/**
 * @file Grammar Builder Tests
 * @description Unit tests for the grammar builder interfaces and implementation
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { GrammarEngine } from '../../src/grammar/grammar-engine';
import { PatternCompiler, CompiledPattern } from '../../src/grammar/pattern-compiler';
import { scope } from '../../src/grammar/scope-builder';
import { Token } from '../../src/parser-contracts/parser-types';

// Mock pattern compiler for testing
class MockPatternCompiler implements PatternCompiler {
  compile(pattern: string): CompiledPattern {
    const tokens = pattern.split(' ').map((word, index) => {
      if (word.startsWith(':')) {
        return { type: 'slot' as const, value: word.substring(1) };
      } else if (word.includes('|')) {
        return { type: 'alternates' as const, value: word.split('|')[0], alternates: word.split('|') };
      } else {
        return { type: 'literal' as const, value: word };
      }
    });
    
    const slots = new Map<string, number>();
    tokens.forEach((token, index) => {
      if (token.type === 'slot') {
        slots.set(token.value, index);
      }
    });
    
    return {
      tokens,
      slots,
      minTokens: tokens.length,
      maxTokens: tokens.length
    };
  }
  
  validate(pattern: string): boolean {
    return pattern.length > 0 && !pattern.includes('||');
  }
  
  extractSlots(pattern: string): string[] {
    return pattern.split(' ')
      .filter(word => word.startsWith(':'))
      .map(word => word.substring(1));
  }
}

// Mock grammar engine for testing
class TestGrammarEngine extends GrammarEngine {
  constructor() {
    super(new MockPatternCompiler());
  }
  
  findMatches(tokens: Token[], context: any, options?: any): any[] {
    // Simple mock implementation
    return [];
  }
}

describe('GrammarBuilder', () => {
  let engine: TestGrammarEngine;
  let builder: any;
  
  beforeEach(() => {
    engine = new TestGrammarEngine();
    builder = engine.createBuilder();
  });
  
  describe('Basic Rule Building', () => {
    it('should create a simple verb-only rule', () => {
      const rule = builder
        .define('look')
        .mapsTo('if.action.looking')
        .build();
      
      expect(rule).toBeDefined();
      expect(rule.pattern).toBe('look');
      expect(rule.action).toBe('if.action.looking');
      expect(rule.priority).toBe(100); // Default priority
    });
    
    it('should create a verb-noun rule with slot', () => {
      const rule = builder
        .define('take :item')
        .mapsTo('if.action.taking')
        .build();
      
      expect(rule.pattern).toBe('take :item');
      expect(rule.action).toBe('if.action.taking');
      expect(rule.compiledPattern).toBeDefined();
      expect(rule.compiledPattern.slots.has('item')).toBe(true);
    });
    
    it('should handle alternates in patterns', () => {
      const rule = builder
        .define('put :item in|into|inside :container')
        .mapsTo('if.action.inserting')
        .build();
      
      expect(rule.pattern).toBe('put :item in|into|inside :container');
      expect(rule.compiledPattern.tokens[2].type).toBe('alternates');
      expect(rule.compiledPattern.tokens[2].alternates).toContain('in');
      expect(rule.compiledPattern.tokens[2].alternates).toContain('into');
      expect(rule.compiledPattern.tokens[2].alternates).toContain('inside');
    });
    
    it('should set custom priority', () => {
      const rule = builder
        .define('hang :item on :hook')
        .mapsTo('if.action.putting')
        .withPriority(150)
        .build();
      
      expect(rule.priority).toBe(150);
    });
  });
  
  describe('Slot Constraints', () => {
    it('should add property constraints to slots', () => {
      const rule = builder
        .define('take :item')
        .where('item', { portable: true })
        .mapsTo('if.action.taking')
        .build();
      
      expect(rule.slots.has('item')).toBe(true);
      const itemConstraint = rule.slots.get('item');
      expect(itemConstraint?.constraints).toHaveLength(1);
      expect(itemConstraint?.constraints[0]).toEqual({ portable: true });
    });
    
    it('should add function constraints to slots', () => {
      const testFn = (entity: any) => entity.weight < 10;
      
      const rule = builder
        .define('take :item')
        .where('item', testFn)
        .mapsTo('if.action.taking')
        .build();
      
      const itemConstraint = rule.slots.get('item');
      expect(itemConstraint?.constraints).toHaveLength(1);
      expect(typeof itemConstraint?.constraints[0]).toBe('function');
    });
    
    it('should add scope constraints to slots', () => {
      const rule = builder
        .define('examine :target')
        .where('target', scope => scope.visible())
        .mapsTo('if.action.examining')
        .build();
      
      const targetConstraint = rule.slots.get('target');
      expect(targetConstraint?.constraints).toHaveLength(1);
    });
    
    it('should allow multiple constraints on same slot', () => {
      const rule = builder
        .define('take :item')
        .where('item', { portable: true })
        .where('item', (entity: any) => entity.weight < 10)
        .mapsTo('if.action.taking')
        .build();
      
      const itemConstraint = rule.slots.get('item');
      expect(itemConstraint?.constraints).toHaveLength(2);
    });
  });
  
  describe('Grammar Engine Integration', () => {
    it('should add rules to the engine', () => {
      expect(engine.getRules()).toHaveLength(0);
      
      builder
        .define('look')
        .mapsTo('if.action.looking')
        .build();
      
      expect(engine.getRules()).toHaveLength(1);
    });
    
    it('should maintain rule priority order', () => {
      builder.define('put :item on :hook').mapsTo('if.action.putting').withPriority(150).build();
      builder.define('put :item on :supporter').mapsTo('if.action.putting').withPriority(100).build();
      builder.define('hang :item on :hook').mapsTo('if.action.putting').withPriority(200).build();
      
      const rules = engine.getRules();
      expect(rules[0].priority).toBe(200); // Highest priority first
      expect(rules[1].priority).toBe(150);
      expect(rules[2].priority).toBe(100);
    });
    
    it('should group rules by action', () => {
      builder.define('take :item').mapsTo('if.action.taking').build();
      builder.define('get :item').mapsTo('if.action.taking').build();
      builder.define('drop :item').mapsTo('if.action.dropping').build();
      
      const takingRules = engine.getRulesForAction('if.action.taking');
      expect(takingRules).toHaveLength(2);
      
      const droppingRules = engine.getRulesForAction('if.action.dropping');
      expect(droppingRules).toHaveLength(1);
    });
  });
  
  describe('Error Handling', () => {
    it('should require an action to be set', () => {
      expect(() => {
        builder
          .define('look')
          .build();
      }).toThrow('Grammar rule must have an action');
    });
    
    it('should generate unique rule IDs', () => {
      const rule1 = builder.define('look').mapsTo('if.action.looking').build();
      const rule2 = builder.define('look').mapsTo('if.action.looking').build();
      
      expect(rule1.id).not.toBe(rule2.id);
    });
  });
});