/**
 * Command Validator
 * 
 * Validates parsed commands against the world model
 * Resolves entities and checks preconditions
 */

import type {
  SystemEvent,
  GenericEventSource,
  Result
} from '@sharpee/core';

import type {
  ParsedCommand,
  NounPhrase,
  ValidatedCommand as CoreValidatedCommand,
  ValidatedObjectReference,
  ValidationError,
  WorldModel,
  IFEntity
} from '@sharpee/world-model';

import type { ValidatedCommand, ScopeInfo } from './types';
import type { SenseType } from '../scope/types';

import { ActionRegistry } from '../actions/registry';
import { ScopeResolver, ScopeLevel } from '../scope/types';
import { StandardScopeResolver } from '../scope/scope-resolver';

/**
 * Action metadata interface for declaring requirements
 */
export interface ActionMetadata {
  requiresDirectObject: boolean;
  requiresIndirectObject: boolean;
  directObjectScope?: ScopeLevel;
  indirectObjectScope?: ScopeLevel;
  validPrepositions?: string[];
}

/**
 * Entity match with scoring information
 */
interface ScoredEntityMatch {
  entity: IFEntity;
  score: number;
  matchReasons: string[];
}

/**
 * Resolution context for tracking state
 */
interface ResolutionContext {
  recentEntities: Map<string, IFEntity>;
  lastInteractedEntity?: IFEntity;
}



/**
 * Validator interface - resolves entities and checks preconditions
 */
export interface CommandValidator {
  /**
   * Validate parsed command against world state
   * @param command Parsed command to validate
   * @returns Validated command or validation error
   */
  validate(command: ParsedCommand): Result<ValidatedCommand, ValidationError>;
}

/**
 * Enhanced command validator with full entity resolution
 */
export class CommandValidator implements CommandValidator {
  private world: WorldModel;
  private actionRegistry: ActionRegistry;
  private scopeResolver: ScopeResolver;
  private resolutionContext: ResolutionContext;
  private systemEvents?: GenericEventSource<SystemEvent>;

  constructor(world: WorldModel, actionRegistry: ActionRegistry, scopeResolver?: ScopeResolver) {
    this.world = world;
    this.actionRegistry = actionRegistry;
    this.scopeResolver = scopeResolver || new StandardScopeResolver(world);
    this.resolutionContext = {
      recentEntities: new Map()
    };
  }

  /**
   * Set system event source for debug events
   */
  setSystemEventSource(eventSource: GenericEventSource<SystemEvent> | undefined): void {
    this.systemEvents = eventSource;
  }

  /**
   * Validate parsed command against world state
   */
  validate(command: ParsedCommand): Result<ValidatedCommand, ValidationError> {
    const startTime = Date.now();
    const warnings: string[] = [];

    // 1. Validate action exists
    // First try direct lookup by action ID
    let actionHandler = this.actionRegistry.get(command.action);

    // If not found, try to find by pattern (verb)
    if (!actionHandler) {
      const verb = command.structure?.verb?.text || command.action;
      const matches = this.actionRegistry.findByPattern(verb);
      if (matches.length > 0) {
        actionHandler = matches[0]; // Take the highest priority match
      }
    }

    if (!actionHandler) {
      return {
        success: false,
        error: {
          type: 'VALIDATION_ERROR',
          code: 'ACTION_NOT_AVAILABLE',
          message: `Unknown action: ${command.action}`,
          parsed: command
        }
      };
    }

    // 2. Resolve direct object if present in parsed command
    let directObject: ValidatedObjectReference | undefined;
    if (command.structure?.directObject) {
      const metadata = this.getActionMetadata(actionHandler);
      const scope = metadata.directObjectScope || ScopeLevel.VISIBLE;
      const resolved = this.resolveEntity(command.structure.directObject, 'direct', scope, command);
      if (!resolved.success) {
        return resolved;
      }
      directObject = resolved.value;
    }
    // If no direct object in parsed command, that's fine - let the action decide if it needs one

    // 3. Resolve indirect object if present in parsed command
    let indirectObject: ValidatedObjectReference | undefined;
    if (command.structure?.indirectObject) {
      const metadata = this.getActionMetadata(actionHandler);
      const scope = metadata.indirectObjectScope || ScopeLevel.VISIBLE;
      const resolved = this.resolveEntity(command.structure.indirectObject, 'indirect', scope, command);
      if (!resolved.success) {
        return resolved;
      }
      indirectObject = resolved.value;
    }

    // 4. Check scope constraints based on action metadata
    const metadata = this.getActionMetadata(actionHandler);

    // Check direct object scope
    if (directObject && metadata.directObjectScope) {
      const scopeCheck = this.checkEntityScope(
        directObject.entity as IFEntity,
        metadata.directObjectScope,
        directObject.parsed.text
      );
      if (!scopeCheck.success) {
        return {
          success: false,
          error: {
            type: 'VALIDATION_ERROR',
            code: 'ENTITY_NOT_VISIBLE',
            message: scopeCheck.message || 'Entity is not in required scope',
            parsed: command,
            details: { entity: directObject.entity.id }
          }
        };
      }
    }

    // Check indirect object scope
    if (indirectObject && metadata.indirectObjectScope) {
      const scopeCheck = this.checkEntityScope(
        indirectObject.entity as IFEntity,
        metadata.indirectObjectScope,
        indirectObject.parsed.text
      );
      if (!scopeCheck.success) {
        return {
          success: false,
          error: {
            type: 'VALIDATION_ERROR',
            code: 'ENTITY_NOT_VISIBLE',
            message: scopeCheck.message || 'Entity is not in required scope',
            parsed: command,
            details: { entity: indirectObject.entity.id }
          }
        };
      }
    }

    // 5. Check action-specific preconditions
    const preconditionCheck = this.checkActionPreconditions(
      actionHandler,
      directObject?.entity as IFEntity | undefined,
      indirectObject?.entity as IFEntity | undefined
    );

    if (!preconditionCheck.success) {
      return {
        success: false,
        error: {
          type: 'VALIDATION_ERROR',
          code: 'PRECONDITION_FAILED',
          message: preconditionCheck.message,
          parsed: command,
          details: preconditionCheck.details
        }
      };
    }

    // Success - build validated command with scope info
    const validationTime = Date.now() - startTime;

    // Build scope info for resolved entities
    const scopeInfo: ValidatedCommand['scopeInfo'] = {};

    if (directObject) {
      const player = this.world.getPlayer()!;
      const entityScope = this.scopeResolver.getScope(player, directObject.entity as IFEntity);
      const perceivedBy = this.getPerceivedSenses(player, directObject.entity as IFEntity);

      scopeInfo.directObject = {
        level: entityScope,
        perceivedBy
      };
    }

    if (indirectObject) {
      const player = this.world.getPlayer()!;
      const entityScope = this.scopeResolver.getScope(player, indirectObject.entity as IFEntity);
      const perceivedBy = this.getPerceivedSenses(player, indirectObject.entity as IFEntity);

      scopeInfo.indirectObject = {
        level: entityScope,
        perceivedBy
      };
    }

    const validatedCommand: ValidatedCommand = {
      parsed: command,
      actionId: actionHandler.id,
      directObject,
      indirectObject,
      metadata: {
        validationTime,
        warnings: warnings.length > 0 ? warnings : undefined
      },
      ...(Object.keys(scopeInfo).length > 0 && { scopeInfo })
    };

    return {
      success: true,
      value: validatedCommand
    };
  }

  /**
   * Resolve an entity reference with full matching logic
   */
  private resolveEntity(
    ref: NounPhrase,
    objectType: 'direct' | 'indirect',
    requiredScope: ScopeLevel,
    command: ParsedCommand
  ): Result<ValidatedObjectReference, ValidationError> {
    if (!ref) {
      throw new Error('Cannot resolve undefined reference');
    }

    this.emitDebugEvent('entity_resolution', command, {
      objectType,
      reference: ref,
      requiredScope,
      startTime: Date.now()
    });

    // Handle pronoun resolution
    if (this.isPronoun(ref.text)) {
      const pronounEntity = this.resolvePronoun(ref.text);
      if (pronounEntity) {
        this.emitDebugEvent('entity_resolution', command, {
          objectType,
          resolvedPronoun: ref.text,
          entity: pronounEntity.id
        });

        return {
          success: true,
          value: {
            entity: pronounEntity,
            parsed: ref
          }
        };
      }
    }

    // Find candidate entities by head noun (e.g., "box" from "wooden box")
    // The head noun is the main identifier, modifiers are used for disambiguation
    const searchTerm = ref.head || ref.text;
    let candidates: IFEntity[] = [];

    // For AUDIBLE and DETECTABLE scopes, we need to search more broadly
    // because entities might be in other rooms
    const needsBroadSearch = requiredScope === ScopeLevel.AUDIBLE ||
      requiredScope === ScopeLevel.DETECTABLE;

    if (needsBroadSearch) {
      // For audible/detectable, search all entities (except rooms/player)
      // and let scope filtering handle visibility
      candidates = this.world.getAllEntities().filter(e =>
        e.type !== 'room' && e.id !== this.world.getPlayer()?.id
      );

      // Filter candidates by name/type/synonym match with head noun
      candidates = candidates.filter(entity => {
        const name = this.getEntityName(entity).toLowerCase();
        const type = entity.type?.toLowerCase() || '';
        const synonyms = this.getEntitySynonyms(entity).map(s => s.toLowerCase());
        const searchLower = searchTerm.toLowerCase();

        return name === searchLower || type === searchLower || synonyms.includes(searchLower);
      });
    } else {
      // For other scopes, use targeted search by head noun
      // Look for entities by name, type, or synonym
      const byName = this.getEntitiesByName(searchTerm);
      candidates = byName;

      // Also check type matches
      const byType = this.getEntitiesByType(searchTerm);
      candidates.push(...byType);

      // And synonym matches
      const bySynonym = this.getEntitiesBySynonym(searchTerm);
      candidates.push(...bySynonym);

      this.emitDebugEvent('entity_search', command, {
        searchTerm,
        byName: byName.length,
        byType: byType.length,
        bySynonym: bySynonym.length,
        totalBeforeDedupe: candidates.length
      });

      // Remove duplicates
      const uniqueIds = new Set(candidates.map(e => e.id));
      candidates = candidates.filter((e, i, arr) =>
        arr.findIndex(x => x.id === e.id) === i
      );
    }

    // Now filter by scope
    const entitiesInScope = this.filterByScope(candidates, requiredScope);

    // Get detailed scope information for all candidates
    const candidateScopes: any[] = [];
    const player = this.world.getPlayer();
    if (player) {
      for (const entity of candidates) {
        const entityScope = this.scopeResolver.getScope(player, entity);
        candidateScopes.push({
          id: entity.id,
          name: this.getEntityName(entity),
          type: entity.type,
          location: this.world.getLocation(entity.id),
          scope: entityScope,
          meetsRequired: this.filterByScope([entity], requiredScope).length > 0,
          visible: this.isEntityVisible(entity),
          reachable: this.isEntityReachable(entity),
          touchable: this.isEntityTouchable(entity)
        });
      }
    }

    this.emitDebugEvent('scope_check', command, {
      objectType,
      requiredScope,
      totalCandidates: candidates.length,
      entitiesInScope: entitiesInScope.length,
      candidateScopes,
      scopeDetails: entitiesInScope.map(e => ({
        id: e.id,
        name: this.getEntityName(e),
        visible: this.isEntityVisible(e),
        reachable: this.isEntityReachable(e),
        touchable: this.isEntityTouchable(e)
      }))
    });

    // Score only the entities that are in scope
    const scoredMatches = this.scoreEntities(entitiesInScope, ref);

    // Filter out zero-score matches
    const viableMatches = scoredMatches.filter(m => m.score > 0);

    if (viableMatches.length === 0) {
      this.emitDebugEvent('validation_error', command, {
        errorType: 'NO_MATCHES',
        reference: ref,
        scope: requiredScope,
        checkedEntities: entitiesInScope.length
      });

      return {
        success: false,
        error: {
          type: 'VALIDATION_ERROR',
          code: 'ENTITY_NOT_FOUND',
          message: this.getMessage('entity_not_found', { text: ref.text }),
          parsed: command,
          details: {
            searchText: ref.text,
            candidates: ref.candidates,
            scope: requiredScope
          }
        }
      };
    }

    // Handle ambiguity
    if (viableMatches.length > 1) {
      const resolved = this.resolveAmbiguity(viableMatches, ref, command);
      if (resolved) {
        return {
          success: true,
          value: {
            entity: resolved.entity,
            parsed: ref
          }
        };
      }

      // Still ambiguous - return error with choices
      const choices = viableMatches.slice(0, 5).map(m => ({
        name: this.getEntityName(m.entity),
        description: this.getEntityDescription(m.entity)
      }));

      return {
        success: false,
        error: {
          type: 'VALIDATION_ERROR',
          code: 'ENTITY_NOT_FOUND',
          message: this.getMessage('ambiguous_reference', {
            text: ref.text,
            count: viableMatches.length
          }),
          parsed: command,
          details: {
            ambiguousEntities: choices
          }
        }
      };
    }

    // Single match
    const match = viableMatches[0];
    this.emitDebugEvent('entity_resolution', command, {
      objectType,
      resolved: true,
      entity: match.entity.id,
      score: match.score,
      matchReasons: match.matchReasons
    });

    return {
      success: true,
      value: {
        entity: match.entity,
        parsed: ref
      }
    };
  }

  /**
   * Get entities by exact name match
   */
  private getEntitiesByName(name: string): IFEntity[] {
    // For now, use findWhere until WorldModel has a name index
    const normalizedName = name.toLowerCase();
    return this.world.findWhere(entity => {
      // Skip rooms and player
      if (entity.type === 'room' || entity.id === this.world.getPlayer()?.id) {
        return false;
      }

      // Check exact name match
      const entityName = this.getEntityName(entity).toLowerCase();
      return entityName === normalizedName;
    });
  }

  /**
   * Get entities by type
   */
  private getEntitiesByType(type: string): IFEntity[] {
    const normalizedType = type.toLowerCase();
    return this.world.findByType(normalizedType);
  }

  /**
   * Get entities by synonym
   */
  private getEntitiesBySynonym(synonym: string): IFEntity[] {
    const normalizedSynonym = synonym.toLowerCase();
    return this.world.findWhere(entity => {
      // Skip rooms and player
      if (entity.type === 'room' || entity.id === this.world.getPlayer()?.id) {
        return false;
      }

      const synonyms = this.getEntitySynonyms(entity).map(s => s.toLowerCase());
      return synonyms.includes(normalizedSynonym);
    });
  }

  /**
   * Filter entities by scope level
   */
  private filterByScope(entities: IFEntity[], scope: ScopeLevel): IFEntity[] {
    const player = this.world.getPlayer();
    if (!player) return [];

    return entities.filter(entity => {
      const entityScope = this.scopeResolver.getScope(player, entity);

      // Check if entity meets the required scope level
      switch (scope) {
        case ScopeLevel.CARRIED:
          return entityScope === ScopeLevel.CARRIED;
        case ScopeLevel.REACHABLE:
          return entityScope === ScopeLevel.CARRIED || entityScope === ScopeLevel.REACHABLE;
        case ScopeLevel.VISIBLE:
          return entityScope === ScopeLevel.CARRIED ||
            entityScope === ScopeLevel.REACHABLE ||
            entityScope === ScopeLevel.VISIBLE;
        case ScopeLevel.AUDIBLE:
          // For audible, check if we can actually hear it
          return this.scopeResolver.canHear && this.scopeResolver.canHear(player, entity);
        case ScopeLevel.DETECTABLE:
          // For detectable, check if we can actually smell it
          return this.scopeResolver.canSmell && this.scopeResolver.canSmell(player, entity);
        default:
          return entityScope !== ScopeLevel.OUT_OF_SCOPE;
      }
    });
  }

  /**
   * Score entities against a reference
   */
  private scoreEntities(entities: IFEntity[], ref: NounPhrase): ScoredEntityMatch[] {
    if (!ref) return [];

    const scored: ScoredEntityMatch[] = [];
    const searchTerm = (ref.head || ref.text).toLowerCase();
    const modifiers = ref.modifiers || [];

    for (const entity of entities) {
      let score = 0;
      const matchReasons: string[] = [];

      // Get entity properties
      const name = this.getEntityName(entity).toLowerCase();
      const type = entity.type?.toLowerCase() || '';
      const adjectives = this.getEntityAdjectives(entity).map(a => a.toLowerCase());
      const synonyms = this.getEntitySynonyms(entity).map(s => s.toLowerCase());

      // Base score for matching the search term (head noun)
      if (name === searchTerm) {
        score += 10;
        matchReasons.push('exact_name_match');
      } else if (type === searchTerm) {
        score += 8;
        matchReasons.push('type_match');
      } else if (synonyms.includes(searchTerm)) {
        score += 6;
        matchReasons.push('synonym_match');
      }

      // Modifier matching - this is key for disambiguation
      // If the user specified modifiers, entities that match them score higher
      for (const modifier of modifiers) {
        if (adjectives.includes(modifier.toLowerCase())) {
          score += 5;
          matchReasons.push(`modifier_match_${modifier}`);
        }
      }

      // Penalty if entity has adjectives that weren't specified
      // This helps "red ball" not match when user just says "ball" if there's also a plain ball
      if (modifiers.length === 0 && adjectives.length > 0) {
        score -= 1;
        matchReasons.push('unspecified_adjectives');
      }

      // Visibility bonus
      if (this.isEntityVisible(entity)) {
        score += 1;
        matchReasons.push('visible');
      }

      // Reachability bonus
      if (this.isEntityReachable(entity)) {
        score += 1;
        matchReasons.push('reachable');
      }

      // Recent interaction bonus
      if (this.resolutionContext.lastInteractedEntity?.id === entity.id) {
        score += 3;
        matchReasons.push('recently_interacted');
      }

      // In inventory bonus
      if (this.isInPlayerInventory(entity)) {
        score += 2;
        matchReasons.push('in_inventory');
      }

      if (score > 0) {
        scored.push({ entity, score, matchReasons });
      }
    }

    // Sort by score descending
    scored.sort((a, b) => b.score - a.score);

    return scored;
  }

  /**
   * Resolve ambiguity between multiple matches
   */
  private resolveAmbiguity(
    matches: ScoredEntityMatch[],
    ref: NounPhrase,
    command: ParsedCommand
  ): ScoredEntityMatch | null {
    this.emitDebugEvent('ambiguity_resolution', command, {
      reference: ref,
      matchCount: matches.length,
      topMatches: matches.slice(0, 5).map(m => ({
        entity: m.entity.id,
        name: this.getEntityName(m.entity),
        score: m.score,
        reasons: m.matchReasons
      }))
    });

    // If there's a clear winner (score significantly higher), use it
    if (matches.length >= 2) {
      const topScore = matches[0].score;
      const secondScore = matches[1].score;

      if (topScore >= secondScore * 1.5) {
        this.emitDebugEvent('ambiguity_resolution', command, {
          resolved: true,
          method: 'score_threshold',
          chosen: matches[0].entity.id,
          scoreGap: topScore - secondScore
        });
        return matches[0];
      }
    }

    // If all adjectives match for only one entity, use it
    if (ref && ref.modifiers && ref.modifiers.length > 0) {
      const perfectMatches = matches.filter(m => {
        const adjectives = this.getEntityAdjectives(m.entity).map(a => a.toLowerCase());
        return ref.modifiers!.every((mod: string) => adjectives.includes(mod.toLowerCase()));
      });

      if (perfectMatches.length === 1) {
        this.emitDebugEvent('ambiguity_resolution', command, {
          resolved: true,
          method: 'all_modifiers_match',
          chosen: perfectMatches[0].entity.id
        });
        return perfectMatches[0];
      }
    }

    // If only one is visible and reachable, use it
    const reachableMatches = matches.filter(m =>
      this.isEntityVisible(m.entity) && this.isEntityReachable(m.entity)
    );

    if (reachableMatches.length === 1) {
      this.emitDebugEvent('ambiguity_resolution', command, {
        resolved: true,
        method: 'only_reachable',
        chosen: reachableMatches[0].entity.id
      });
      return reachableMatches[0];
    }

    // Unable to resolve automatically
    this.emitDebugEvent('ambiguity_resolution', command, {
      resolved: false,
      method: 'none',
      remainingCount: matches.length
    });

    return null;
  }

  /**
   * Check if text is a pronoun
   */
  private isPronoun(text: string): boolean {
    const pronouns = ['it', 'them', 'him', 'her', 'this', 'that', 'these', 'those'];
    return pronouns.includes(text.toLowerCase());
  }

  /**
   * Resolve a pronoun to an entity
   */
  private resolvePronoun(pronoun: string): IFEntity | undefined {
    const normalized = pronoun.toLowerCase();

    // Simple pronoun resolution using recent entities
    if (normalized === 'it' || normalized === 'that') {
      return this.resolutionContext.recentEntities.get('it');
    }

    if (normalized === 'them' || normalized === 'these' || normalized === 'those') {
      return this.resolutionContext.recentEntities.get('them');
    }

    // Check for gendered pronouns if we track NPCs
    if (normalized === 'him') {
      return this.resolutionContext.recentEntities.get('him');
    }

    if (normalized === 'her') {
      return this.resolutionContext.recentEntities.get('her');
    }

    return this.resolutionContext.lastInteractedEntity;
  }

  /**
   * Check if entity is visible to player
   */
  private isEntityVisible(entity: IFEntity): boolean {
    const player = this.world.getPlayer();
    if (!player) return false;
    return this.scopeResolver.canSee(player, entity);
  }

  /**
   * Check if entity is reachable by player
   */
  private isEntityReachable(entity: IFEntity): boolean {
    const player = this.world.getPlayer();
    if (!player) return false;
    return this.scopeResolver.canReach(player, entity);
  }

  /**
   * Check if entity is touchable by player
   */
  private isEntityTouchable(entity: IFEntity): boolean {
    // Touchable = reachable and not intangible
    if (!this.isEntityReachable(entity)) return false;

    // Check for intangible trait
    if (entity.has && entity.has('intangible')) return false;

    return true;
  }

  /**
   * Check if entity is in player's inventory
   */
  private isInPlayerInventory(entity: IFEntity): boolean {
    const player = this.world.getPlayer();
    if (!player) return false;

    const inventory = this.world.getContents(player.id);
    return inventory.some(e => e.id === entity.id);
  }

  /**
   * Check if entity meets required scope level
   */
  private checkEntityScope(
    entity: IFEntity,
    requiredScope: ScopeLevel,
    entityName: string
  ): { success: boolean; code?: string; message?: string } {
    const player = this.world.getPlayer();
    if (!player) {
      return {
        success: false,
        code: 'NO_PLAYER',
        message: 'No player entity found'
      };
    }

    const entityScope = this.scopeResolver.getScope(player, entity);

    // Check if entity meets the required scope level
    switch (requiredScope) {
      case ScopeLevel.CARRIED:
        if (entityScope !== ScopeLevel.CARRIED) {
          return {
            success: false,
            code: 'NOT_CARRIED',
            message: `You're not carrying the ${entityName}.`
          };
        }
        break;

      case ScopeLevel.REACHABLE:
        if (entityScope !== ScopeLevel.CARRIED && entityScope !== ScopeLevel.REACHABLE) {
          return {
            success: false,
            code: 'NOT_REACHABLE',
            message: `You can't reach the ${entityName}.`
          };
        }
        break;

      case ScopeLevel.VISIBLE:
        if (entityScope === ScopeLevel.AUDIBLE ||
          entityScope === ScopeLevel.DETECTABLE ||
          entityScope === ScopeLevel.OUT_OF_SCOPE) {
          return {
            success: false,
            code: 'NOT_VISIBLE',
            message: `You can't see the ${entityName}.`
          };
        }
        break;

      case ScopeLevel.AUDIBLE:
        if (entityScope === ScopeLevel.OUT_OF_SCOPE) {
          return {
            success: false,
            code: 'NOT_AUDIBLE',
            message: `You can't hear the ${entityName}.`
          };
        }
        break;

      case ScopeLevel.DETECTABLE:
        if (entityScope === ScopeLevel.OUT_OF_SCOPE) {
          return {
            success: false,
            code: 'NOT_DETECTABLE',
            message: `You can't sense the ${entityName}.`
          };
        }
        break;
    }

    return { success: true };
  }

  /**
   * Get which senses can perceive an entity
   */
  private getPerceivedSenses(perceiver: IFEntity, entity: IFEntity): SenseType[] {
    const senses: SenseType[] = [];

    if (this.scopeResolver.canSee(perceiver, entity)) {
      senses.push('sight' as SenseType);
    }

    if (this.scopeResolver.canHear) {
      if (this.scopeResolver.canHear(perceiver, entity)) {
        senses.push('hearing' as SenseType);
      }
    }

    if (this.scopeResolver.canSmell) {
      if (this.scopeResolver.canSmell(perceiver, entity)) {
        senses.push('smell' as SenseType);
      }
    }

    // Touch is available if entity is reachable
    if (this.scopeResolver.canReach(perceiver, entity)) {
      senses.push('touch' as SenseType);
    }

    return senses;
  }

  /**
   * Get entity display name
   */
  private getEntityName(entity: IFEntity): string {
    // IFEntity has a name getter that uses identity trait
    const name = entity.name;
    // Handle case where name might be an object (from world model creation)
    if (typeof name === 'string') {
      return name;
    }
    return entity.type || entity.id;
  }

  /**
   * Get entity description
   */
  private getEntityDescription(entity: IFEntity): string {
    // IFEntity has a description getter that uses identity trait
    return entity.description || this.getEntityName(entity);
  }

  /**
   * Get entity adjectives
   */
  private getEntityAdjectives(entity: IFEntity): string[] {
    const adjectives: string[] = [];

    // Get identity trait
    const identity = entity.get('identity');
    if (identity && typeof identity === 'object' && 'adjectives' in identity) {
      const adj = (identity as any).adjectives;
      if (Array.isArray(adj)) {
        adjectives.push(...adj.map(String));
      }
    }

    return adjectives;
  }

  /**
   * Get entity synonyms
   */
  private getEntitySynonyms(entity: IFEntity): string[] {
    const synonyms: string[] = [];

    // Get identity trait  
    // Note: Entities use 'aliases' not 'synonyms' (synonyms are for verbs)
    const identity = entity.get('identity');
    if (identity && typeof identity === 'object' && 'aliases' in identity) {
      const aliases = (identity as any).aliases;
      if (Array.isArray(aliases)) {
        synonyms.push(...aliases.map(String));
      }
    }

    // Add type as synonym
    if (entity.type) {
      synonyms.push(entity.type);
    }

    return synonyms;
  }



  /**
   * Get action metadata
   */
  private getActionMetadata(action: any): ActionMetadata {
    // Check if action has metadata property with required fields
    if (action.metadata &&
      'requiresDirectObject' in action.metadata &&
      'requiresIndirectObject' in action.metadata) {
      return action.metadata as ActionMetadata;
    }

    // Default metadata - actions handle their own requirements
    return {
      requiresDirectObject: false,
      requiresIndirectObject: false,
      directObjectScope: ScopeLevel.VISIBLE,
      indirectObjectScope: ScopeLevel.VISIBLE
    };
  }

  /**
   * Check action-specific preconditions
   */
  private checkActionPreconditions(
    action: any,
    directObject?: IFEntity,
    indirectObject?: IFEntity
  ): { success: boolean; message: string; details?: any } {
    // If action has a validate method in metadata, use it
    if (action.metadata && typeof action.metadata.validate === 'function') {
      return action.metadata.validate(directObject, indirectObject);
    }

    // Default - all preconditions pass
    return { success: true, message: 'OK' };
  }

  /**
   * Get localized message
   */
  private getMessage(key: string, params?: Record<string, any>): string {
    // Message templates
    const messages: Record<string, string> = {
      unknown_action: "I don't understand the word '{action}'.",
      action_requires_object: "What do you want to {action}?",
      action_requires_indirect_object: "What do you want to {action} it with?",
      invalid_preposition: "You can't {action} something {preposition} that.",
      entity_not_found: "You can't see any {text} here.",
      entity_not_visible: "You can't see the {text}.",
      entity_not_reachable: "You can't reach the {text}.",
      ambiguous_reference: "Which {text} do you mean? (I can see {count} of them)"
    };

    let message = messages[key] || key;

    // Replace parameters
    if (params) {
      for (const [param, value] of Object.entries(params)) {
        message = message.replace(`{${param}}`, String(value));
      }
    }

    return message;
  }

  /**
   * Emit a debug event
   */
  private emitDebugEvent(
    debugType: 'entity_resolution' | 'entity_search' | 'scope_check' | 'ambiguity_resolution' | 'validation_error',
    command: ParsedCommand,
    data: any
  ): void {
    if (!this.systemEvents) return;

    this.systemEvents.emit({
      id: `validator_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      subsystem: 'validator',
      type: debugType,
      data: {
        command,
        ...data
      }
    });
  }
}
