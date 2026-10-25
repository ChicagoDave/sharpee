/**
 * @file Scope Builder Implementation
 * @description Concrete implementation of the scope builder interface. A
 *   constraint is a base (visible, touchable, carried, nearby, all), property
 *   or function filters, required traits, and explicit entity ids — exactly
 *   what the scope resolver reads, and nothing it does not.
 *
 * Public interface: `scope()`, `ScopeBuilderImpl`.
 * Owner context: if-domain grammar contracts.
 *
 * References: ADR-385 D9 (the rule-inclusion list nothing read, and the
 * alias of `matching({ kind })`, are gone).
 */

import {
  ScopeBuilder,
  ScopeConstraint,
  PropertyConstraint,
  FunctionConstraint
} from './grammar-builder.js';

/**
 * Concrete scope builder implementation
 */
export class ScopeBuilderImpl implements ScopeBuilder {
  private constraint: ScopeConstraint = {
    base: 'all',
    filters: [],
    traitFilters: [],
    explicitEntities: []
  };

  visible(): ScopeBuilder {
    this.constraint.base = 'visible';
    return this;
  }

  touchable(): ScopeBuilder {
    this.constraint.base = 'touchable';
    return this;
  }

  carried(): ScopeBuilder {
    this.constraint.base = 'carried';
    return this;
  }

  nearby(): ScopeBuilder {
    this.constraint.base = 'nearby';
    return this;
  }

  matching(constraint: PropertyConstraint | FunctionConstraint): ScopeBuilder {
    this.constraint.filters.push(constraint);
    return this;
  }

  orExplicitly(entityIds: string[]): ScopeBuilder {
    this.constraint.explicitEntities.push(...entityIds);
    return this;
  }

  hasTrait(traitType: string): ScopeBuilder {
    this.constraint.traitFilters.push(traitType);
    return this;
  }

  build(): ScopeConstraint {
    return {
      ...this.constraint,
      filters: [...this.constraint.filters],
      traitFilters: [...this.constraint.traitFilters],
      explicitEntities: [...this.constraint.explicitEntities]
    };
  }
}

/**
 * Create a new scope builder
 */
export function scope(): ScopeBuilder {
  return new ScopeBuilderImpl();
}
