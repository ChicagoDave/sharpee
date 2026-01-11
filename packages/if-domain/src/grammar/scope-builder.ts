/**
 * @file Scope Builder Implementation
 * @description Concrete implementation of the scope builder interface
 */

import { 
  ScopeBuilder, 
  ScopeConstraint, 
  PropertyConstraint, 
  FunctionConstraint 
} from './grammar-builder';
import { IEntity } from '@sharpee/core';

/**
 * Concrete scope builder implementation
 */
export class ScopeBuilderImpl implements ScopeBuilder {
  private constraint: ScopeConstraint = {
    base: 'all',
    filters: [],
    traitFilters: [],
    explicitEntities: [],
    includeRules: []
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
  
  kind(kind: string): ScopeBuilder {
    this.constraint.filters.push({ kind });
    return this;
  }
  
  orExplicitly(entityIds: string[]): ScopeBuilder {
    this.constraint.explicitEntities.push(...entityIds);
    return this;
  }
  
  orRule(ruleId: string): ScopeBuilder {
    this.constraint.includeRules.push(ruleId);
    return this;
  }

  hasTrait(traitType: string): ScopeBuilder {
    this.constraint.traitFilters.push(traitType);
    return this;
  }

  build(): ScopeConstraint {
    return { ...this.constraint };
  }
}

/**
 * Create a new scope builder
 */
export function scope(): ScopeBuilder {
  return new ScopeBuilderImpl();
}