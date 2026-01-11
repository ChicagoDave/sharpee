/**
 * @file Scope Evaluator
 * @description Evaluates scope constraints against the world model
 */

import { 
  ScopeConstraint, 
  PropertyConstraint, 
  FunctionConstraint,
  GrammarContext 
} from '@sharpee/if-domain';
import { IEntity } from '@sharpee/core';

/**
 * Evaluates scope constraints to find matching entities
 */
export class ScopeEvaluator {
  /**
   * Get entities that match a scope constraint
   */
  static getEntitiesInScope(
    constraint: ScopeConstraint,
    context: GrammarContext
  ): IEntity[] {
    // If no world model, return empty array
    if (!context.world) {
      return [];
    }

    // Start with base scope
    let entities: IEntity[] = [];
    
    switch (constraint.base) {
      case 'all':
        entities = this.getAllEntities(context);
        break;
      case 'visible':
        entities = this.getVisibleEntities(context);
        break;
      case 'touchable':
        entities = this.getTouchableEntities(context);
        break;
      case 'carried':
        entities = this.getCarriedEntities(context);
        break;
      case 'nearby':
        entities = this.getNearbyEntities(context);
        break;
      default:
        entities = [];
    }

    // Apply filters
    for (const filter of constraint.filters) {
      entities = entities.filter(entity => this.matchesFilter(entity, filter, context));
    }

    // Apply trait filters
    if (constraint.traitFilters && constraint.traitFilters.length > 0) {
      entities = entities.filter(entity =>
        constraint.traitFilters!.every(traitType =>
          this.entityHasTrait(entity, traitType)
        )
      );
    }

    // Add explicit entities
    if (constraint.explicitEntities.length > 0) {
      const additionalEntities = constraint.explicitEntities
        .map(id => context.world.getEntity(id))
        .filter(Boolean);
      entities = [...entities, ...additionalEntities];
    }

    // Remove duplicates
    const uniqueIds = new Set(entities.map(e => e.id));
    return entities.filter((e, i, arr) => 
      arr.findIndex(e2 => e2.id === e.id) === i
    );
  }

  /**
   * Check if a single entity matches a scope constraint
   */
  static entityMatchesScope(
    entity: IEntity,
    constraint: ScopeConstraint,
    context: GrammarContext
  ): boolean {
    const matchingEntities = this.getEntitiesInScope(constraint, context);
    return matchingEntities.some(e => e.id === entity.id);
  }

  /**
   * Get all entities in the world
   */
  private static getAllEntities(context: GrammarContext): IEntity[] {
    if (!context.world?.getAllEntities) {
      return [];
    }
    return context.world.getAllEntities();
  }

  /**
   * Get visible entities from current location
   */
  private static getVisibleEntities(context: GrammarContext): IEntity[] {
    if (!context.world?.getVisibleEntities) {
      return [];
    }
    return context.world.getVisibleEntities(context.actorId, context.currentLocation);
  }

  /**
   * Get touchable entities from current location
   */
  private static getTouchableEntities(context: GrammarContext): IEntity[] {
    if (!context.world?.getTouchableEntities) {
      return [];
    }
    return context.world.getTouchableEntities(context.actorId, context.currentLocation);
  }

  /**
   * Get entities carried by the actor
   */
  private static getCarriedEntities(context: GrammarContext): IEntity[] {
    if (!context.world?.getCarriedEntities) {
      return [];
    }
    return context.world.getCarriedEntities(context.actorId);
  }

  /**
   * Get nearby entities (visible + adjacent locations)
   */
  private static getNearbyEntities(context: GrammarContext): IEntity[] {
    if (!context.world?.getNearbyEntities) {
      // Fallback to visible if nearby not implemented
      return this.getVisibleEntities(context);
    }
    return context.world.getNearbyEntities(context.actorId, context.currentLocation);
  }

  /**
   * Check if entity matches a filter
   */
  private static matchesFilter(
    entity: IEntity,
    filter: PropertyConstraint | FunctionConstraint,
    context: GrammarContext
  ): boolean {
    if (typeof filter === 'function') {
      // Function constraint
      return filter(entity, context);
    } else {
      // Property constraint
      for (const [key, value] of Object.entries(filter)) {
        const entityValue = (entity as any)[key];
        if (entityValue !== value) {
          return false;
        }
      }
      return true;
    }
  }

  /**
   * Check if entity has a specific trait
   * Supports both entity.has() method and entity.get() method patterns
   */
  private static entityHasTrait(entity: IEntity, traitType: string): boolean {
    // Check for .has() method (trait system standard)
    if (typeof (entity as any).has === 'function') {
      return (entity as any).has(traitType);
    }

    // Check for .get() method returning truthy value (alternate pattern)
    if (typeof (entity as any).get === 'function') {
      const trait = (entity as any).get(traitType);
      return trait !== undefined && trait !== null;
    }

    return false;
  }

  /**
   * Get entity names and aliases for matching
   * Supports both legacy attributes.name and IdentityTrait patterns
   */
  private static getEntityNames(entity: IEntity): string[] {
    const names: string[] = [];

    // Check attributes (legacy pattern)
    if (entity.attributes) {
      if (entity.attributes.displayName) {
        names.push(String(entity.attributes.displayName));
      }
      if (entity.attributes.name) {
        names.push(String(entity.attributes.name));
      }
    }

    // Check IdentityTrait (via .get() method)
    if (typeof (entity as any).get === 'function') {
      const identity = (entity as any).get('identity');
      if (identity && typeof identity === 'object') {
        if (identity.name) {
          names.push(String(identity.name));
        }
        // Also check aliases
        if (Array.isArray(identity.aliases)) {
          names.push(...identity.aliases.map(String));
        }
      }
    }

    return names;
  }

  /**
   * Find entities by name in a given scope
   */
  static findEntitiesByName(
    name: string,
    constraint: ScopeConstraint,
    context: GrammarContext
  ): IEntity[] {
    const entitiesInScope = this.getEntitiesInScope(constraint, context);
    const searchName = name.toLowerCase();

    // Try exact match first (name or any alias)
    const exactMatches = entitiesInScope.filter(e => {
      if (!e) return false;
      const names = this.getEntityNames(e);
      return names.some(n => n.toLowerCase() === searchName);
    });

    if (exactMatches.length > 0) {
      return exactMatches;
    }

    // Try partial match
    const partialMatches = entitiesInScope.filter(e => {
      if (!e) return false;
      const names = this.getEntityNames(e);
      return names.some(n => n.toLowerCase().includes(searchName));
    });

    return partialMatches;
  }
}