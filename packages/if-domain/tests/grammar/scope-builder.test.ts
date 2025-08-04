/**
 * @file Scope Builder Tests
 * @description Unit tests for the scope builder implementation
 */

import { describe, it, expect } from 'vitest';
import { scope, ScopeBuilderImpl } from '../../src/grammar/scope-builder';

describe('ScopeBuilder', () => {
  describe('Basic Scope Methods', () => {
    it('should create a scope builder with visible base', () => {
      const constraint = scope().visible().build();
      
      expect(constraint.base).toBe('visible');
      expect(constraint.filters).toHaveLength(0);
      expect(constraint.explicitEntities).toHaveLength(0);
      expect(constraint.includeRules).toHaveLength(0);
    });
    
    it('should create a scope builder with touchable base', () => {
      const constraint = scope().touchable().build();
      
      expect(constraint.base).toBe('touchable');
    });
    
    it('should create a scope builder with carried base', () => {
      const constraint = scope().carried().build();
      
      expect(constraint.base).toBe('carried');
    });
    
    it('should create a scope builder with nearby base', () => {
      const constraint = scope().nearby().build();
      
      expect(constraint.base).toBe('nearby');
    });
    
    it('should default to "all" base when no method called', () => {
      const constraint = scope().build();
      
      expect(constraint.base).toBe('all');
    });
  });
  
  describe('Filters', () => {
    it('should add property filters', () => {
      const constraint = scope()
        .visible()
        .matching({ portable: true, weight: 5 })
        .build();
      
      expect(constraint.filters).toHaveLength(1);
      expect(constraint.filters[0]).toEqual({ portable: true, weight: 5 });
    });
    
    it('should add function filters', () => {
      const filterFn = (entity: any) => entity.value > 100;
      const constraint = scope()
        .visible()
        .matching(filterFn)
        .build();
      
      expect(constraint.filters).toHaveLength(1);
      expect(constraint.filters[0]).toBe(filterFn);
    });
    
    it('should add kind filters', () => {
      const constraint = scope()
        .touchable()
        .kind('container')
        .build();
      
      expect(constraint.filters).toHaveLength(1);
      expect(constraint.filters[0]).toEqual({ kind: 'container' });
    });
    
    it('should allow multiple filters', () => {
      const constraint = scope()
        .visible()
        .matching({ portable: true })
        .kind('weapon')
        .matching((e: any) => e.damage > 10)
        .build();
      
      expect(constraint.filters).toHaveLength(3);
    });
  });
  
  describe('Explicit Entities', () => {
    it('should add explicit entity IDs', () => {
      const constraint = scope()
        .visible()
        .orExplicitly(['sword', 'shield'])
        .build();
      
      expect(constraint.explicitEntities).toEqual(['sword', 'shield']);
    });
    
    it('should accumulate multiple explicit calls', () => {
      const constraint = scope()
        .visible()
        .orExplicitly(['sword'])
        .orExplicitly(['shield', 'armor'])
        .build();
      
      expect(constraint.explicitEntities).toEqual(['sword', 'shield', 'armor']);
    });
  });
  
  describe('Include Rules', () => {
    it('should add rule references', () => {
      const constraint = scope()
        .visible()
        .orRule('magic_sight')
        .build();
      
      expect(constraint.includeRules).toEqual(['magic_sight']);
    });
    
    it('should accumulate multiple rule references', () => {
      const constraint = scope()
        .visible()
        .orRule('magic_sight')
        .orRule('telepathy')
        .orRule('x_ray_vision')
        .build();
      
      expect(constraint.includeRules).toEqual(['magic_sight', 'telepathy', 'x_ray_vision']);
    });
  });
  
  describe('Chaining', () => {
    it('should support complex chaining', () => {
      const constraint = scope()
        .touchable()
        .matching({ container: true, open: true })
        .kind('chest')
        .orExplicitly(['special_box'])
        .orRule('magical_containers')
        .matching((e: any) => e.capacity > 10)
        .build();
      
      expect(constraint.base).toBe('touchable');
      expect(constraint.filters).toHaveLength(3);
      expect(constraint.explicitEntities).toEqual(['special_box']);
      expect(constraint.includeRules).toEqual(['magical_containers']);
    });
    
    it('should maintain fluent interface', () => {
      // This should compile and work
      const builder = scope();
      const same = builder
        .visible()
        .matching({ test: true })
        .kind('thing')
        .orExplicitly(['a', 'b'])
        .orRule('test');
      
      // All methods should return the same builder instance
      expect(same).toBe(builder);
    });
  });
  
  describe('Immutability', () => {
    it('should create independent constraints from build()', () => {
      const builder = scope().visible().matching({ test: true });
      
      const constraint1 = builder.build();
      const constraint2 = builder.orExplicitly(['extra']).build();
      
      // constraint1 should not have the explicit entity
      expect(constraint1.explicitEntities).toHaveLength(0);
      expect(constraint2.explicitEntities).toEqual(['extra']);
    });
  });
});