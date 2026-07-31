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
      expect(rule.tier).toBe('standard'); // Default tier (ADR-268 D2)
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
    
    it('should register story tier when the builder is created for it (ADR-268 D2)', () => {
      const rule = engine.createBuilder('story')
        .define('hang :item on :hook')
        .mapsTo('if.action.putting')
        .build();

      expect(rule.tier).toBe('story');
    });
  });
  
  // ADR-231 D2a Amendment 1: `.where()` takes a scope-builder callback and
  // nothing else. Property and function predicates reach the resolver through
  // `ScopeBuilder.matching()`, which is what these tests exercise — the bare
  // property/function forms `.where()` used to accept were never evaluated.
  describe('Slot Constraints', () => {
    it('should carry a property predicate through into the built scope constraint', () => {
      const rule = builder
        .define('take :item')
        .where('item', s => s.visible().matching({ portable: true }))
        .mapsTo('if.action.taking')
        .build();

      expect(rule.slots.has('item')).toBe(true);
      const itemConstraint = rule.slots.get('item');
      expect(itemConstraint?.constraints).toHaveLength(1);

      const built = itemConstraint!.constraints[0](scope()).build();
      expect(built.base).toBe('visible');
      expect(built.filters).toEqual([{ portable: true }]);
    });

    it('should carry a function predicate through into the built scope constraint', () => {
      const testFn = (entity: any) => entity.weight < 10;

      const rule = builder
        .define('take :item')
        .where('item', s => s.carried().matching(testFn))
        .mapsTo('if.action.taking')
        .build();

      const itemConstraint = rule.slots.get('item');
      expect(itemConstraint?.constraints).toHaveLength(1);

      const built = itemConstraint!.constraints[0](scope()).build();
      expect(built.base).toBe('carried');
      expect(built.filters).toEqual([testFn]);
    });

    it('should add scope constraints to slots', () => {
      const rule = builder
        .define('examine :target')
        .where('target', scope => scope.visible())
        .mapsTo('if.action.examining')
        .build();

      const targetConstraint = rule.slots.get('target');
      expect(targetConstraint?.constraints).toHaveLength(1);
      expect(targetConstraint!.constraints[0](scope()).build().base).toBe('visible');
    });

    it('should allow multiple constraints on same slot', () => {
      const rule = builder
        .define('take :item')
        .where('item', s => s.touchable())
        .where('item', s => s.carried().hasTrait('portable'))
        .mapsTo('if.action.taking')
        .build();

      const itemConstraint = rule.slots.get('item');
      expect(itemConstraint?.constraints).toHaveLength(2);
      expect(itemConstraint!.constraints[0](scope()).build().base).toBe('touchable');

      const second = itemConstraint!.constraints[1](scope()).build();
      expect(second.base).toBe('carried');
      expect(second.traitFilters).toEqual(['portable']);
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
    
    it('should keep rules in registration (definition) order — ADR-268', () => {
      builder.define('put :item on :hook').mapsTo('if.action.putting').build();
      builder.define('put :item on :supporter').mapsTo('if.action.putting').build();
      builder.define('hang :item on :hook').mapsTo('if.action.putting').build();

      const rules = engine.getRules();
      expect(rules[0].pattern).toBe('put :item on :hook');
      expect(rules[1].pattern).toBe('put :item on :supporter');
      expect(rules[2].pattern).toBe('hang :item on :hook');
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
  
  describe('forAction fullPattern emission (ADR-271 D3)', () => {
    it('registers one rule per full-pattern line, sharing the action id and tier', () => {
      engine.createBuilder('story')
        .forAction('chord.action.petting')
        .fullPattern('pet :animal')
        .fullPattern('pat :animal')
        .build();

      const rules = engine.getRulesForAction('chord.action.petting');
      expect(rules).toHaveLength(2);
      expect(rules.map(r => r.pattern).sort()).toEqual(['pat :animal', 'pet :animal']);
      for (const rule of rules) {
        expect(rule.action).toBe('chord.action.petting');
        expect(rule.tier).toBe('story');
      }
    });

    it('does not cross full-pattern lines with verbs()', () => {
      engine.createBuilder()
        .forAction('chord.action.lowering')
        .verbs(['lower'])
        .pattern(':target')
        .fullPattern('winch :target down')
        .build();

      const rules = engine.getRulesForAction('chord.action.lowering');
      expect(rules.map(r => r.pattern).sort()).toEqual(['lower :target', 'winch :target down']);
    });

    it('attaches .where() constraints to every line carrying the slot', () => {
      engine.createBuilder()
        .forAction('chord.action.petting')
        .fullPattern('pet :animal')
        .fullPattern('stroke :animal')
        .where('animal', scope => scope.touchable())
        .build();

      const rules = engine.getRulesForAction('chord.action.petting');
      expect(rules).toHaveLength(2);
      for (const rule of rules) {
        const constraint = rule.slots.get('animal');
        expect(constraint, rule.pattern).toBeDefined();
        expect(constraint!.constraints).toHaveLength(1);
      }
    });

    it('skips slot-scoped config on lines that do not carry the slot', () => {
      engine.createBuilder()
        .forAction('chord.action.waving')
        .fullPattern('wave :thing')
        .fullPattern('wave hands')
        .where('thing', scope => scope.visible())
        .build();

      const rules = engine.getRulesForAction('chord.action.waving');
      const slotted = rules.find(r => r.pattern === 'wave :thing')!;
      const bare = rules.find(r => r.pattern === 'wave hands')!;
      expect(slotted.slots.get('thing')?.constraints).toHaveLength(1);
      expect(bare.slots.has('thing')).toBe(false);
    });

    it('rejects an empty pattern line', () => {
      expect(() => {
        engine.createBuilder().forAction('chord.action.x').fullPattern('  ');
      }).toThrow('fullPattern() requires a non-empty pattern line');
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
describe('removeRules (ADR-270 D3)', () => {
  let engine: TestGrammarEngine;
  let builder: any;

  beforeEach(() => {
    engine = new TestGrammarEngine();
    builder = engine.createBuilder();
    builder.define('take :item').mapsTo('if.action.taking').build();
    builder.define('get :item').mapsTo('if.action.taking').build();
    builder.define('drop :item').mapsTo('if.action.dropping').build();
  });

  it('removes the matching standard-tier rule from getRules and the action index, returning 1', () => {
    const removed = engine.removeRules('if.action.taking', 'get :item');

    expect(removed).toBe(1);
    expect(engine.getRules().map((r) => r.pattern)).toEqual(['take :item', 'drop :item']);
    expect(engine.getRulesForAction('if.action.taking').map((r) => r.pattern)).toEqual(['take :item']);
  });

  it('preserves the definition order of survivors (ADR-268: order is semantic)', () => {
    builder.define('snag :item').mapsTo('if.action.taking').build();
    engine.removeRules('if.action.taking', 'get :item');

    expect(engine.getRules().map((r) => r.pattern)).toEqual(['take :item', 'drop :item', 'snag :item']);
  });

  it('returns 0 on a shape no rule carries, leaving every rule in place', () => {
    expect(engine.removeRules('if.action.taking', 'grab :item')).toBe(0);
    expect(engine.removeRules('if.action.eating', 'take :item')).toBe(0);
    expect(engine.getRules()).toHaveLength(3);
  });

  it('defaults to the standard tier — an identically-shaped story rule survives', () => {
    const storyBuilder = engine.createBuilder('story');
    storyBuilder.define('get :item').mapsTo('if.action.taking').build();

    expect(engine.removeRules('if.action.taking', 'get :item')).toBe(1);
    const remaining = engine.getRules().filter((r) => r.pattern === 'get :item');
    expect(remaining).toHaveLength(1);
    expect(remaining[0].tier).toBe('story');
  });

  it('removes a story-tier rule only when the tier is named', () => {
    const storyBuilder = engine.createBuilder('story');
    storyBuilder.define('yoink :item').mapsTo('if.action.taking').build();

    expect(engine.removeRules('if.action.taking', 'yoink :item', 'story')).toBe(1);
    expect(engine.getRules().some((r) => r.pattern === 'yoink :item')).toBe(false);
  });

  it('empties the action index when the last rule of an action is removed', () => {
    engine.removeRules('if.action.dropping', 'drop :item');
    expect(engine.getRulesForAction('if.action.dropping')).toEqual([]);
  });

  it('is reachable through the builder surface (dual-surface, umbrella D8)', () => {
    expect(builder.removeRules('if.action.taking', 'get :item')).toBe(1);
    expect(builder.getRules().map((r: any) => r.pattern)).toEqual(['take :item', 'drop :item']);
  });
});
