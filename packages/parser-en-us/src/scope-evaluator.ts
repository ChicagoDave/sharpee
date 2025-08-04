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
import { Entity } from '@sharpee/core';

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
  ): Entity[] {
    // If no world model, return empty array
    if (!context.world) {
      return [];
    }

    // Start with base scope
    let entities: Entity[] = [];
    
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
    entity: Entity,
    constraint: ScopeConstraint,
    context: GrammarContext
  ): boolean {
    const matchingEntities = this.getEntitiesInScope(constraint, context);
    return matchingEntities.some(e => e.id === entity.id);
  }

  /**
   * Get all entities in the world
   */
  private static getAllEntities(context: GrammarContext): Entity[] {
    if (!context.world?.getAllEntities) {
      return [];
    }
    return context.world.getAllEntities();
  }

  /**
   * Get visible entities from current location
   */
  private static getVisibleEntities(context: GrammarContext): Entity[] {
    if (!context.world?.getVisibleEntities) {
      return [];
    }
    return context.world.getVisibleEntities(context.actorId, context.currentLocation);
  }

  /**
   * Get touchable entities from current location
   */
  private static getTouchableEntities(context: GrammarContext): Entity[] {
    if (!context.world?.getTouchableEntities) {
      return [];
    }
    return context.world.getTouchableEntities(context.actorId, context.currentLocation);
  }

  /**
   * Get entities carried by the actor
   */
  private static getCarriedEntities(context: GrammarContext): Entity[] {
    if (!context.world?.getCarriedEntities) {
      return [];
    }
    return context.world.getCarriedEntities(context.actorId);
  }

  /**
   * Get nearby entities (visible + adjacent locations)
   */
  private static getNearbyEntities(context: GrammarContext): Entity[] {
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
    entity: Entity,
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
   * Find entities by name in a given scope
   */
  static findEntitiesByName(
    name: string,
    constraint: ScopeConstraint,
    context: GrammarContext
  ): Entity[] {
    const entitiesInScope = this.getEntitiesInScope(constraint, context);
    
    // Try exact match first
    const exactMatches = entitiesInScope.filter(e => {
      if (!e || !e.attributes) return false;
      const entityName = (e.attributes.displayName || e.attributes.name || '') as string;
      return entityName.toLowerCase() === name.toLowerCase();
    });
    
    if (exactMatches.length > 0) {
      return exactMatches;
    }

    // Try partial match
    const partialMatches = entitiesInScope.filter(e => {
      if (!e || !e.attributes) return false;
      const entityName = (e.attributes.displayName || e.attributes.name || '') as string;
      return entityName.toLowerCase().includes(name.toLowerCase());
    });

    return partialMatches;
  }
}