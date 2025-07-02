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
  CommandValidator,
  ParsedCommand,
  ValidatedCommand,
  ValidatedObjectReference,
  ValidationError
} from '@sharpee/world-model';

import type { WorldModel, IFEntity } from '@sharpee/world-model';
import { ActionRegistry } from '../actions/registry';
import { ScopeService } from '@sharpee/world-model/services/ScopeService';

/**
 * Action metadata interface for declaring requirements
 */
export interface ActionMetadata {
  requiresDirectObject: boolean;
  requiresIndirectObject: boolean;
  directObjectScope?: 'visible' | 'reachable' | 'touchable';
  indirectObjectScope?: 'visible' | 'reachable' | 'touchable';
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
 * Enhanced command validator with full entity resolution
 */
export class CommandValidatorImpl implements CommandValidator {
  private world: WorldModel;
  private actionRegistry: ActionRegistry;
  private scopeService: ScopeService;
  private resolutionContext: ResolutionContext;
  private systemEvents?: GenericEventSource<SystemEvent>;

  constructor(world: WorldModel, actionRegistry: ActionRegistry) {
    this.world = world;
    this.actionRegistry = actionRegistry;
    this.scopeService = new ScopeService(world);
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
    const actionHandler = this.actionRegistry.get(command.action);
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

    // 2. Validate direct object if required
    let directObject: ValidatedObjectReference | undefined;
    if (command.directObject) {
      const metadata = this.getActionMetadata(actionHandler);
      const scope = metadata.directObjectScope || 'visible';
      const resolved = this.resolveEntity(command.directObject, 'direct', scope, command);
      if (!resolved.success) {
        return resolved;
      }
      directObject = resolved.value;
    } else if (this.actionRequiresDirectObject(actionHandler)) {
      return {
        success: false,
        error: {
          type: 'VALIDATION_ERROR',
          code: 'ENTITY_NOT_FOUND',
          message: `Action '${command.action}' requires a direct object`,
          parsed: command
        }
      };
    }

    // 3. Validate indirect object if present
    let indirectObject: ValidatedObjectReference | undefined;
    if (command.indirectObject) {
      const metadata = this.getActionMetadata(actionHandler);
      const scope = metadata.indirectObjectScope || 'visible';
      const resolved = this.resolveEntity(command.indirectObject, 'indirect', scope, command);
      if (!resolved.success) {
        return resolved;
      }
      indirectObject = resolved.value;
    }

    // 4. Check visibility constraints
    if (directObject && !this.isEntityVisible(directObject.entity as IFEntity)) {
      return {
        success: false,
        error: {
          type: 'VALIDATION_ERROR',
          code: 'ENTITY_NOT_VISIBLE',
          message: `You can't see the ${directObject.parsed.text}`,
          parsed: command,
          details: { entity: directObject.entity.id }
        }
      };
    }

    if (indirectObject && !this.isEntityVisible(indirectObject.entity as IFEntity)) {
      return {
        success: false,
        error: {
          type: 'VALIDATION_ERROR',
          code: 'ENTITY_NOT_VISIBLE',
          message: `You can't see the ${indirectObject.parsed.text}`,
          parsed: command,
          details: { entity: indirectObject.entity.id }
        }
      };
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

    // Success - build validated command
    const validationTime = Date.now() - startTime;
    
    return {
      success: true,
      value: {
        parsed: command,
        actionId: actionHandler.id,
        directObject,
        indirectObject,
        metadata: {
          validationTime,
          warnings: warnings.length > 0 ? warnings : undefined
        }
      }
    };
  }

  /**
   * Resolve an entity reference with full matching logic
   */
  private resolveEntity(
    ref: ParsedCommand['directObject'],
    objectType: 'direct' | 'indirect',
    requiredScope: 'visible' | 'reachable' | 'touchable',
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

    // Get all entities in scope
    const entitiesInScope = this.getEntitiesInScope(requiredScope);
    
    this.emitDebugEvent('scope_check', command, {
      objectType,
      requiredScope,
      totalEntities: this.world.getAllEntities().length,
      entitiesInScope: entitiesInScope.length,
      scopeDetails: entitiesInScope.map(e => ({
        id: e.id,
        name: this.getEntityName(e),
        visible: this.isEntityVisible(e),
        reachable: this.isEntityReachable(e),
        touchable: this.isEntityTouchable(e)
      }))
    });

    // Score each entity against the reference
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
   * Get entities within the specified scope
   */
  private getEntitiesInScope(scope: 'visible' | 'reachable' | 'touchable'): IFEntity[] {
    const player = this.world.getPlayer();
    if (!player) return [];

    const allEntities = this.world.getAllEntities();
    
    switch (scope) {
      case 'visible':
        return allEntities.filter(e => this.isEntityVisible(e));
      case 'reachable':
        return allEntities.filter(e => this.isEntityReachable(e));
      case 'touchable':
        return allEntities.filter(e => this.isEntityTouchable(e));
      default:
        return allEntities;
    }
  }

  /**
   * Score entities against a reference
   */
  private scoreEntities(entities: IFEntity[], ref: ParsedCommand['directObject']): ScoredEntityMatch[] {
    if (!ref) return [];

    const scored: ScoredEntityMatch[] = [];
    const words = ref.text.toLowerCase().split(/\s+/);
    const modifiers = ref.modifiers || [];

    for (const entity of entities) {
      let score = 0;
      const matchReasons: string[] = [];

      // Get entity properties
      const name = this.getEntityName(entity).toLowerCase();
      const type = entity.type?.toLowerCase() || '';
      const adjectives = this.getEntityAdjectives(entity).map(a => a.toLowerCase());
      const synonyms = this.getEntitySynonyms(entity).map(s => s.toLowerCase());

      // Exact name match
      if (name === ref.text.toLowerCase()) {
        score += 10;
        matchReasons.push('exact_name_match');
      }

      // Check each word
      for (const word of words) {
        // Name contains word
        if (name.includes(word)) {
          score += 5;
          matchReasons.push(`name_contains_${word}`);
        }

        // Type match
        if (type === word) {
          score += 4;
          matchReasons.push(`type_match_${word}`);
        }

        // Adjective match
        if (adjectives.includes(word)) {
          score += 3;
          matchReasons.push(`adjective_match_${word}`);
        }

        // Synonym match
        if (synonyms.includes(word)) {
          score += 2;
          matchReasons.push(`synonym_match_${word}`);
        }

        // Candidate match
        if (ref.candidates.includes(word)) {
          score += 1;
          matchReasons.push(`vocabulary_match_${word}`);
        }
      }

      // Modifier matching
      for (const modifier of modifiers) {
        if (adjectives.includes(modifier.toLowerCase())) {
          score += 2;
          matchReasons.push(`modifier_match_${modifier}`);
        }
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
    ref: ParsedCommand['directObject'],
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
        return ref.modifiers!.every(mod => adjectives.includes(mod.toLowerCase()));
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

    // Use scope service if available
    if (this.scopeService.canSee) {
      return this.scopeService.canSee(player, entity);
    }

    // Fallback logic
    const playerLocation = this.world.getLocation(player.id);
    if (!playerLocation) return false;

    const entityLocation = this.world.getLocation(entity.id);
    if (!entityLocation) return false;

    // Get location entities to compare
    const playerRoom = this.world.getEntity(playerLocation);
    const entityRoom = this.world.getEntity(entityLocation);
    
    // Same room
    if (playerRoom && entityRoom && playerRoom.id === entityRoom.id) {
      return true;
    }

    // In inventory
    return this.isInPlayerInventory(entity);
  }

  /**
   * Check if entity is reachable by player
   */
  private isEntityReachable(entity: IFEntity): boolean {
    const player = this.world.getPlayer();
    if (!player) return false;

    // Use scope service if available
    if (this.scopeService.canReach) {
      return this.scopeService.canReach(player, entity);
    }

    // Fallback - visible entities are reachable
    return this.isEntityVisible(entity);
  }

  /**
   * Check if entity is touchable by player
   */
  private isEntityTouchable(entity: IFEntity): boolean {
    // For now, touchable = reachable and not intangible
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
   * Get entity display name
   */
  private getEntityName(entity: IFEntity): string {
    // IFEntity has a name getter that uses identity trait
    return entity.name || entity.type || entity.id;
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
    const identity = entity.get('identity');
    if (identity && typeof identity === 'object' && 'synonyms' in identity) {
      const syn = (identity as any).synonyms;
      if (Array.isArray(syn)) {
        synonyms.push(...syn.map(String));
      }
    }

    // Add type as synonym
    if (entity.type) {
      synonyms.push(entity.type);
    }

    return synonyms;
  }

  /**
   * Check if action requires a direct object
   */
  private actionRequiresDirectObject(action: any): boolean {
    const metadata = this.getActionMetadata(action);
    return metadata.requiresDirectObject;
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

    // Default metadata based on action ID
    const requiresDirectObject = ['TAKE', 'DROP', 'EXAMINE', 'OPEN', 'CLOSE', 'PUT', 'LOCK', 'UNLOCK'];
    const requiresIndirectObject = ['PUT', 'LOCK', 'UNLOCK'];

    return {
      requiresDirectObject: requiresDirectObject.includes(action.id),
      requiresIndirectObject: requiresIndirectObject.includes(action.id),
      directObjectScope: 'visible',
      indirectObjectScope: 'visible'
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
    debugType: 'entity_resolution' | 'scope_check' | 'ambiguity_resolution' | 'validation_error',
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

