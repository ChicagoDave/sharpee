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
 * Which entities a phrase names is the one noun matcher's answer (ADR-385
 * D3): `findEntitiesByName` asks `matchNoun` over each entity's naming
 * surface, exactly as the validator does, so the two layers cannot disagree.
 *
 * NOT the same as the world-model's RuleScopeEvaluator (rule-based pre-parse
 * vocabulary) or the stdlib's StandardScopeResolver (validation-phase entity
 * resolution with disambiguation).
 */

import { 
  type ScopeConstraint, 
  type PropertyConstraint, 
  type FunctionConstraint,
  type GrammarContext 
} from '@sharpee/if-domain';
import { type IEntity } from '@sharpee/core';
import { matchNoun, namingSurfaceOf, type IFEntity, type NounQuery, type WorldModel } from '@sharpee/world-model';

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
   * Get physically visible entities (world.getVisible → VisibilityBehavior),
   * plus the actor themself — you can always see yourself (GH #312: parity
   * with the command validator, where the player is resolvable at every
   * tier, ISSUE #154). The world's enumeration deliberately lists OTHERS
   * (it feeds "all" expansions); the parse-time base adds the actor here.
   */
  private static getVisibleEntities(context: GrammarContext): IEntity[] {
    if (typeof context.world?.getVisible !== 'function') {
      this.warnDegraded('visible', 'world.getVisible unavailable');
      return [];
    }
    return this.withActor(context.world.getVisible(context.actorId), context);
  }

  /**
   * Get physically reachable entities (world.getReachable →
   * ReachabilityBehavior, ADR-273 D4: sight precondition, closed containers
   * block transparent or not, another actor's inventory needs
   * OpenInventoryTrait), plus the actor themself — you can always reach
   * yourself (GH #312: `kick me` under `must be reachable` resolves the way
   * stdlib's `attack me` does).
   */
  private static getTouchableEntities(context: GrammarContext): IEntity[] {
    if (typeof context.world?.getReachable !== 'function') {
      this.warnDegraded('touchable', 'world.getReachable unavailable');
      return [];
    }
    return this.withActor(context.world.getReachable(context.actorId), context);
  }

  /** The base set with the acting entity added (once), when the world knows it. */
  private static withActor(entities: IEntity[], context: GrammarContext): IEntity[] {
    if (entities.some((e) => e.id === context.actorId)) return entities;
    const actor = typeof context.world?.getEntity === 'function' ? context.world.getEntity(context.actorId) : undefined;
    return actor ? [...entities, actor] : entities;
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
   * The entities in a scope base that a noun phrase names (ADR-385 D3).
   *
   * Asks the one noun matcher over each entity's naming surface, so an
   * adjective admits here as it does in the validator and a substring never
   * does. The query is the phrase's content words with the articles the slot
   * consumer split off (ADR-385 D2), so a name beginning with an article
   * ("The Grail") still matches exactly.
   *
   * @param query The phrase: content text and its leading articles
   * @param constraint The slot's scope constraint (base and filters)
   * @param context The grammar context (world, actor, location)
   * @returns The admitted entities, in the base's order
   */
  static findEntitiesByName(
    query: NounQuery,
    constraint: ScopeConstraint,
    context: GrammarContext
  ): IEntity[] {
    const world = context.world as WorldModel;
    // The world's scope surfaces hand back its own entities (IFEntity), typed
    // here as the core IEntity the grammar contracts speak of
    return this.getEntitiesInScope(constraint, context).filter(
      (e) => !!e && matchNoun(namingSurfaceOf(world, e as IFEntity, context.actorId), query) !== null
    );
  }
}
