/**
 * @file Grammar Scope Resolver
 * @description Evaluates grammar slot scope constraints against the world model
 * during parsing to find entities matching `.where()` definitions.
 *
 * Pipeline role: PARSE PHASE — called by EntitySlotConsumer during grammar
 * matching. Resolves scope bases against WorldModel's REAL surface (ADR-273):
 *   visible   → world.getVisible(actorId)        (VisibilityBehavior)
 *   touchable → world.getReachable(actorId)      (ReachabilityBehavior — sight
 *               precondition, closed containers block, OpenInventoryTrait)
 *   carried   → world.getCarriedAndWorn(actorId), carried ∪ worn
 *   all       → world.getAllEntities()
 *   nearby    → visible (no distinct nearby notion exists yet)
 * A missing world or missing surface fails closed (zero candidates — a
 * parse-time gate must not guess) and WARNS: silent degradation is the
 * defect class ADR-273 exists to kill.
 *
 * NOT the same as the world-model's RuleScopeEvaluator (rule-based pre-parse
 * vocabulary) or the stdlib's StandardScopeResolver (validation-phase entity
 * resolution with disambiguation).
 */

import { 
  ScopeConstraint, 
  PropertyConstraint, 
  FunctionConstraint,
  GrammarContext 
} from '@sharpee/if-domain';
import { IEntity } from '@sharpee/core';

/**
 * Entity with optional trait methods (duck-typed for IFEntity compatibility).
 * The parser operates on IEntity from core, but at runtime these are IFEntity
 * instances with has()/get() trait methods.
 */
interface ITraitAwareEntity extends IEntity {
  has?(type: string): boolean;
  get?(type: string): Record<string, unknown> | undefined;
}

/**
 * Evaluates scope constraints to find matching entities
 */
export class GrammarScopeResolver {
  /**
   * Get entities that match a scope constraint
   */
  static getEntitiesInScope(
    constraint: ScopeConstraint,
    context: GrammarContext
  ): IEntity[] {
    // If no world model, fail closed — but never silently (ADR-273 D3)
    if (!context.world) {
      this.warnDegraded(constraint.base, 'setWorldContext was never called');
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
   * ADR-273 D3: fail closed, never silently — name the degraded base and
   * what was missing, so a mock or mis-wired world surfaces immediately
   * instead of parsing every constrained command into "can't see any such
   * thing" (the defect this file's rewrite fixed).
   */
  private static warnDegraded(base: string, missing: string): void {
    console.warn(
      `GrammarScopeResolver: scope base '${base}' degraded to zero candidates — ${missing} (ADR-273 D3).`
    );
  }

  /**
   * Get all entities in the world (world.getAllEntities)
   */
  private static getAllEntities(context: GrammarContext): IEntity[] {
    if (typeof context.world?.getAllEntities !== 'function') {
      this.warnDegraded('all', 'world.getAllEntities unavailable');
      return [];
    }
    return context.world.getAllEntities();
  }

  /**
   * Get physically visible entities (world.getVisible → VisibilityBehavior)
   */
  private static getVisibleEntities(context: GrammarContext): IEntity[] {
    if (typeof context.world?.getVisible !== 'function') {
      this.warnDegraded('visible', 'world.getVisible unavailable');
      return [];
    }
    return context.world.getVisible(context.actorId);
  }

  /**
   * Get physically reachable entities (world.getReachable →
   * ReachabilityBehavior, ADR-273 D4: sight precondition, closed containers
   * block transparent or not, another actor's inventory needs
   * OpenInventoryTrait)
   */
  private static getTouchableEntities(context: GrammarContext): IEntity[] {
    if (typeof context.world?.getReachable !== 'function') {
      this.warnDegraded('touchable', 'world.getReachable unavailable');
      return [];
    }
    return context.world.getReachable(context.actorId);
  }

  /**
   * Get entities held by the actor (world.getCarriedAndWorn, carried ∪ worn
   * — a worn cloak counts as held)
   */
  private static getCarriedEntities(context: GrammarContext): IEntity[] {
    if (typeof context.world?.getCarriedAndWorn !== 'function') {
      this.warnDegraded('carried', 'world.getCarriedAndWorn unavailable');
      return [];
    }
    const { carried, worn } = context.world.getCarriedAndWorn(context.actorId);
    return [...carried, ...worn];
  }

  /**
   * Get nearby entities — no distinct nearby notion exists in the world
   * model yet; visible is the honest fallback (as the pre-ADR-273 code
   * intended).
   */
  private static getNearbyEntities(context: GrammarContext): IEntity[] {
    return this.getVisibleEntities(context);
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
      // Property constraint — dynamic lookup across entity fields (id, type, attributes, etc.)
      const entityRecord = entity as unknown as Record<string, unknown>;
      for (const [key, value] of Object.entries(filter)) {
        const entityValue = entityRecord[key];
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
    const traitEntity = entity as ITraitAwareEntity;

    // Check for .has() method (trait system standard)
    if (typeof traitEntity.has === 'function') {
      return traitEntity.has(traitType);
    }

    // Check for .get() method returning truthy value (alternate pattern)
    if (typeof traitEntity.get === 'function') {
      const trait = traitEntity.get(traitType);
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
    const traitEntity = entity as ITraitAwareEntity;
    if (typeof traitEntity.get === 'function') {
      const identity = traitEntity.get('identity');
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
   * Find entities by name in a given scope.
   *
   * Matching is original-text-first: an entity whose name genuinely begins
   * with an article ("The Grail") wins its exact match before any article
   * stripping is attempted. Only when the original text matches nothing is
   * a leading English article (the/a/an) stripped and the search retried —
   * articles are noise in entity references platform-wide (the
   * unconstrained resolution path already ignores them), so `wind the
   * clock` must gate the same as `wind clock`. Non-article determiners
   * (`my`, `that`, `some`) are NOT handled here — a known limit of the
   * constrained path; the fuller fix is determiner-tagged token stripping
   * in the slot consumer.
   */
  static findEntitiesByName(
    name: string,
    constraint: ScopeConstraint,
    context: GrammarContext
  ): IEntity[] {
    const entitiesInScope = this.getEntitiesInScope(constraint, context);

    const matchesFor = (searchName: string): IEntity[] => {
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
      return entitiesInScope.filter(e => {
        if (!e) return false;
        const names = this.getEntityNames(e);
        return names.some(n => n.toLowerCase().includes(searchName));
      });
    };

    const searchName = name.toLowerCase();
    const originalMatches = matchesFor(searchName);
    if (originalMatches.length > 0) {
      return originalMatches;
    }

    const stripped = searchName.replace(/^(?:the|a|an)\s+/, '');
    if (stripped !== searchName && stripped.length > 0) {
      return matchesFor(stripped);
    }

    return [];
  }
}