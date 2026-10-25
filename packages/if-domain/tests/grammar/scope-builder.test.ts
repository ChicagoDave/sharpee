/**
 * @file Scope Builder Tests
 * @description Unit tests for the scope builder implementation. The built
 *   constraint carries exactly what the scope resolver reads: a base, property
 *   or function filters, trait filters and explicit entities (ADR-385 D9).
 */

import { describe, it, expect } from 'vitest';
import { scope } from '../../src/grammar/scope-builder';

describe('ScopeBuilder', () => {
  describe('Basic Scope Methods', () => {
    it('should create a scope builder with visible base', () => {
      const constraint = scope().visible().build();

      expect(constraint.base).toBe('visible');
      expect(constraint.filters).toHaveLength(0);
      expect(constraint.traitFilters).toHaveLength(0);
      expect(constraint.explicitEntities).toHaveLength(0);
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
      const filterFn = (entity: { value?: number }) => (entity.value ?? 0) > 100;
      const constraint = scope()
        .visible()
        .matching(filterFn)
        .build();

      expect(constraint.filters).toHaveLength(1);
      expect(constraint.filters[0]).toBe(filterFn);
    });

    it('should add trait filters', () => {
      const constraint = scope()
        .touchable()
        .hasTrait('container')
        .build();

      expect(constraint.traitFilters).toEqual(['container']);
    });

    it('should allow multiple filters', () => {
      const constraint = scope()
        .visible()
        .matching({ portable: true })
        .matching({ type: 'weapon' })
        .matching((e: { damage?: number }) => (e.damage ?? 0) > 10)
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

  describe('Chaining', () => {
    it('should support complex chaining', () => {
      const constraint = scope()
        .touchable()
        .matching({ container: true, open: true })
        .hasTrait('chest')
        .orExplicitly(['special_box'])
        .matching((e: { capacity?: number }) => (e.capacity ?? 0) > 10)
        .build();

      expect(constraint.base).toBe('touchable');
      expect(constraint.filters).toHaveLength(2);
      expect(constraint.traitFilters).toEqual(['chest']);
      expect(constraint.explicitEntities).toEqual(['special_box']);
    });

    it('should maintain fluent interface', () => {
      const builder = scope();
      const same = builder
        .visible()
        .matching({ test: true })
        .hasTrait('thing')
        .orExplicitly(['a', 'b']);

      // All methods should return the same builder instance
      expect(same).toBe(builder);
    });
  });

  // ADR-385 D9: the constraint carries only what the resolver reads. `orRule()`
  // and `includeRules` were never consulted anywhere; `kind()` was `matching({ kind })`.
  describe('Shape (ADR-385 D9)', () => {
    it('builds exactly the four fields the scope resolver reads', () => {
      const constraint = scope().visible().build();

      expect(Object.keys(constraint).sort()).toEqual(['base', 'explicitEntities', 'filters', 'traitFilters']);
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
