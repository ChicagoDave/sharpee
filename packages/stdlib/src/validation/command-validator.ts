/**
 * Command Validator
 * 
 * Validates parsed commands against the world model
 * Resolves entities and checks preconditions
 */

import type {
  ISystemEvent,
  IGenericEventSource,
  Result,
  EntityId
} from '@sharpee/core';

import type {
  IParsedCommand,
  INounPhrase,
  IValidatedCommand as CoreValidatedCommand,
  IValidatedObjectReference,
  IValidationError,
  WorldModel,
  IFEntity
} from '@sharpee/world-model';
import { IdentityTrait, WallEntity, deriveNameVocabulary } from '@sharpee/world-model';

import type { ValidatedCommand, ScopeInfo } from './types.js';
import type { SenseType } from '../scope/types.js';

import { ActionRegistry } from '../actions/registry.js';
import { ScopeResolver, ScopeLevel } from '../scope/types.js';
import { StandardScopeResolver } from '../scope/scope-resolver.js';

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
 * Match tiers for name resolution (ADR-231 D3, PIN 2).
 * EXACT (query text equals full name/alias/type) outranks WORDS (every
 * query content word matches the entity's vocabulary).
 */
const MATCH_TIER_EXACT = 3;
const MATCH_TIER_WORDS = 2;

/** Leading articles stripped from query text before matching (D3 defect fix). */
const QUERY_ARTICLES: ReadonlySet<string> = new Set(['the', 'a', 'an']);

/**
 * Result of matching a noun phrase against one entity's naming surface.
 */
interface NameMatch {
  tier: number;
  wordsMatched: number;
  reasons: string[];
}

/**
 * Entity match with scoring information (ADR-231 D3 tiered model).
 * `tier`/`wordsMatched` carry PIN 2's ranking (higher tier wins; within a
 * tier, more matched words win); `score` is the within-tie heuristic
 * (visibility/inventory/author scope priority) consumed by the normal
 * disambiguation flow.
 */
interface ScoredEntityMatch {
  entity: IFEntity;
  tier: number;
  wordsMatched: number;
  score: number;
  matchReasons: string[];
}




/**
 * Slot types that can have entity selections
 */
export type EntitySlot = 'directObject' | 'indirectObject' | 'instrument';

/**
 * Entity selections for disambiguation resolution
 */
export type EntitySelections = Partial<Record<EntitySlot, string>>;

/**
 * Validator interface - resolves entities and checks preconditions
 */
export interface CommandValidator {
  /**
   * Validate parsed command against world state
   * @param command Parsed command to validate
   * @returns Validated command or validation error
   */
  validate(command: IParsedCommand): Result<ValidatedCommand, IValidationError>;

  /**
   * Re-validate a command with explicit entity selections
   * Used after AMBIGUOUS_ENTITY error when user selects from disambiguation choices
   *
   * @param command Original parsed command
   * @param selections Map of slot to selected entity ID
   * @returns Validated command or validation error
   *
   * @example
   * // After receiving AMBIGUOUS_ENTITY for "take apple"
   * const result = validator.resolveWithSelection(command, {
   *   directObject: 'red-apple-001'  // User selected the red apple
   * });
   */
  resolveWithSelection(
    command: IParsedCommand,
    selections: EntitySelections
  ): Result<ValidatedCommand, IValidationError>;
}

/**
 * Enhanced command validator with full entity resolution
 */
export class CommandValidator implements CommandValidator {
  private world: WorldModel;
  private actionRegistry: ActionRegistry;
  private scopeResolver: ScopeResolver;
  private systemEvents?: IGenericEventSource<ISystemEvent>;
  /** Current action ID being validated (for disambiguation scoring) */
  private currentActionId?: string;

  constructor(world: WorldModel, actionRegistry: ActionRegistry, scopeResolver?: ScopeResolver) {
    this.world = world;
    this.actionRegistry = actionRegistry;
    this.scopeResolver = scopeResolver || new StandardScopeResolver(world);
  }

  /**
   * Set system event source for debug events
   */
  setSystemEventSource(eventSource: IGenericEventSource<ISystemEvent> | undefined): void {
    this.systemEvents = eventSource;
  }

  /**
   * Validate parsed command against world state
   */
  validate(command: IParsedCommand): Result<ValidatedCommand, IValidationError> {
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
          parsed: command,
          details: { action: command.action }
        }
      };
    }

    // Store current action ID for disambiguation scoring
    this.currentActionId = actionHandler.id;

    // 2. Resolve direct object if present in parsed command
    let directObject: IValidatedObjectReference | undefined;
    if (command.structure?.directObject) {
      // ADR-080: Multi-object commands ("get all", "drop all but sword")
      // Skip single-entity resolution - let the action handle expansion via expandMultiObject()
      const nounPhrase = command.structure.directObject;
      if (nounPhrase.isAll || nounPhrase.isList) {
        // Leave directObject undefined - action will use isMultiObjectCommand()
        // and expandMultiObject() to handle multiple entities
        directObject = undefined;
      } else {
        // Normal single-entity resolution
        const metadata = this.getActionMetadata(actionHandler);
        const scope = metadata.directObjectScope || ScopeLevel.VISIBLE;
        const resolved = this.resolveEntity(nounPhrase, 'direct', scope, command);
        if (!resolved.success) {
          return resolved;
        }
        directObject = resolved.value;
      }
    }
    // If no direct object in parsed command, that's fine - let the action decide if it needs one

    // 3. Resolve indirect object if present in parsed command
    let indirectObject: IValidatedObjectReference | undefined;
    if (command.structure?.indirectObject) {
      const metadata = this.getActionMetadata(actionHandler);
      const scope = metadata.indirectObjectScope || ScopeLevel.VISIBLE;
      const resolved = this.resolveEntity(command.structure.indirectObject, 'indirect', scope, command);
      if (!resolved.success) {
        return resolved;
      }
      indirectObject = resolved.value;
    }

    // 3b. Resolve instrument if present in parsed command (ADR-080)
    // Instruments are tools/weapons marked with .instrument() in grammar patterns
    let instrument: IValidatedObjectReference | undefined;
    if (command.instrument) {
      // Instruments are typically carried or reachable
      const resolved = this.resolveEntity(command.instrument, 'instrument', ScopeLevel.REACHABLE, command);
      if (!resolved.success) {
        return resolved;
      }
      instrument = resolved.value;
    }

    // 3c. Resolve topic if present (ADR-231 D4): entity-first with text
    // fallback. Quiet resolution only — a topic NEVER produces
    // ENTITY_NOT_FOUND or a disambiguation prompt; on miss or tie the
    // verbatim text flows through with entity undefined.
    const topic = command.topic ? this.resolveTopic(command.topic.text) : undefined;

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
            parsed: command,
            details: { 
              entity: directObject.entity.id,
              entityName: directObject.parsed.text,
              scopeCode: scopeCheck.code
            }
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
            parsed: command,
            details: { 
              entity: indirectObject.entity.id,
              entityName: indirectObject.parsed.text,
              scopeCode: scopeCheck.code
            }
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

    if (instrument) {
      const player = this.world.getPlayer()!;
      const entityScope = this.scopeResolver.getScope(player, instrument.entity as IFEntity);
      const perceivedBy = this.getPerceivedSenses(player, instrument.entity as IFEntity);

      scopeInfo.instrument = {
        level: entityScope,
        perceivedBy
      };
    }

    const validatedCommand: ValidatedCommand = {
      parsed: command,
      actionId: actionHandler.id,
      directObject,
      indirectObject,
      instrument,
      topic,
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
   * Re-validate a command with explicit entity selections
   * Used after AMBIGUOUS_ENTITY error when user selects from disambiguation choices
   */
  resolveWithSelection(
    command: IParsedCommand,
    selections: EntitySelections
  ): Result<ValidatedCommand, IValidationError> {
    const startTime = Date.now();
    const warnings: string[] = [];

    // 1. Validate action exists
    let actionHandler = this.actionRegistry.get(command.action);
    if (!actionHandler) {
      const verb = command.structure?.verb?.text || command.action;
      const matches = this.actionRegistry.findByPattern(verb);
      if (matches.length > 0) {
        actionHandler = matches[0];
      }
    }

    if (!actionHandler) {
      return {
        success: false,
        error: {
          type: 'VALIDATION_ERROR',
          code: 'ACTION_NOT_AVAILABLE',
          parsed: command,
          details: { action: command.action }
        }
      };
    }

    this.currentActionId = actionHandler.id;

    // 2. Resolve direct object - use selection if provided
    let directObject: IValidatedObjectReference | undefined;
    if (command.structure?.directObject) {
      const nounPhrase = command.structure.directObject;

      // ADR-080: Multi-object commands bypass resolution
      if (nounPhrase.isAll || nounPhrase.isList) {
        directObject = undefined;
      } else if (selections.directObject) {
        // Use explicit selection
        const entity = this.world.getEntity(selections.directObject);
        if (!entity) {
          return {
            success: false,
            error: {
              type: 'VALIDATION_ERROR',
              code: 'ENTITY_NOT_FOUND',
              parsed: command,
              details: {
                slot: 'directObject',
                selectedId: selections.directObject,
                reason: 'Selected entity no longer exists'
              }
            }
          };
        }
        directObject = {
          entity,
          parsed: nounPhrase
        };
      } else {
        // Normal resolution
        const metadata = this.getActionMetadata(actionHandler);
        const scope = metadata.directObjectScope || ScopeLevel.VISIBLE;
        const resolved = this.resolveEntity(nounPhrase, 'direct', scope, command);
        if (!resolved.success) {
          return resolved;
        }
        directObject = resolved.value;
      }
    }

    // 3. Resolve indirect object - use selection if provided
    let indirectObject: IValidatedObjectReference | undefined;
    if (command.structure?.indirectObject) {
      if (selections.indirectObject) {
        const entity = this.world.getEntity(selections.indirectObject);
        if (!entity) {
          return {
            success: false,
            error: {
              type: 'VALIDATION_ERROR',
              code: 'ENTITY_NOT_FOUND',
              parsed: command,
              details: {
                slot: 'indirectObject',
                selectedId: selections.indirectObject,
                reason: 'Selected entity no longer exists'
              }
            }
          };
        }
        indirectObject = {
          entity,
          parsed: command.structure.indirectObject
        };
      } else {
        const metadata = this.getActionMetadata(actionHandler);
        const scope = metadata.indirectObjectScope || ScopeLevel.VISIBLE;
        const resolved = this.resolveEntity(command.structure.indirectObject, 'indirect', scope, command);
        if (!resolved.success) {
          return resolved;
        }
        indirectObject = resolved.value;
      }
    }

    // 3b. Resolve instrument - use selection if provided
    let instrument: IValidatedObjectReference | undefined;
    if (command.instrument) {
      if (selections.instrument) {
        const entity = this.world.getEntity(selections.instrument);
        if (!entity) {
          return {
            success: false,
            error: {
              type: 'VALIDATION_ERROR',
              code: 'ENTITY_NOT_FOUND',
              parsed: command,
              details: {
                slot: 'instrument',
                selectedId: selections.instrument,
                reason: 'Selected entity no longer exists'
              }
            }
          };
        }
        instrument = {
          entity,
          parsed: command.instrument
        };
      } else {
        const resolved = this.resolveEntity(command.instrument, 'instrument', ScopeLevel.REACHABLE, command);
        if (!resolved.success) {
          return resolved;
        }
        instrument = resolved.value;
      }
    }

    // 3c. Resolve topic if present (ADR-231 D4) — same quiet entity-first
    // pass as validate(); topics are never disambiguation slots.
    const topic = command.topic ? this.resolveTopic(command.topic.text) : undefined;

    // 4. Check scope constraints based on action metadata
    const metadata = this.getActionMetadata(actionHandler);

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
            parsed: command,
            details: {
              entity: directObject.entity.id,
              entityName: directObject.parsed.text,
              scopeCode: scopeCheck.code
            }
          }
        };
      }
    }

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
            parsed: command,
            details: {
              entity: indirectObject.entity.id,
              entityName: indirectObject.parsed.text,
              scopeCode: scopeCheck.code
            }
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
          parsed: command,
          details: preconditionCheck.details
        }
      };
    }

    // Success - build validated command with scope info
    const validationTime = Date.now() - startTime;
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

    if (instrument) {
      const player = this.world.getPlayer()!;
      const entityScope = this.scopeResolver.getScope(player, instrument.entity as IFEntity);
      const perceivedBy = this.getPerceivedSenses(player, instrument.entity as IFEntity);

      scopeInfo.instrument = {
        level: entityScope,
        perceivedBy
      };
    }

    const validatedCommand: ValidatedCommand = {
      parsed: command,
      actionId: actionHandler.id,
      directObject,
      indirectObject,
      instrument,
      topic,
      metadata: {
        validationTime,
        warnings: warnings.length > 0 ? warnings : undefined
      },
      ...(Object.keys(scopeInfo).length > 0 && { scopeInfo })
    };

    this.emitDebugEvent('entity_resolution', command, {
      method: 'resolveWithSelection',
      selections,
      success: true
    });

    return {
      success: true,
      value: validatedCommand
    };
  }

  /**
   * Resolve an entity reference with full matching logic
   */
  private resolveEntity(
    ref: INounPhrase,
    objectType: 'direct' | 'indirect' | 'instrument',
    requiredScope: ScopeLevel,
    command: IParsedCommand
  ): Result<IValidatedObjectReference, IValidationError> {
    if (!ref) {
      throw new Error('Cannot resolve undefined reference');
    }

    this.emitDebugEvent('entity_resolution', command, {
      objectType,
      reference: ref,
      requiredScope,
      startTime: Date.now()
    });

    // ADR-089: Handle pre-resolved entity ID (from pronoun resolution in parser)
    if (ref.entityId) {
      const resolved = this.resolveEntityById(ref.entityId, ref);
      if (resolved) {
        this.emitDebugEvent('entity_resolution', command, {
          objectType,
          preResolvedEntityId: ref.entityId,
          entity: resolved.entity.id
        });
        return { success: true, value: resolved };
      }
      // Entity ID was set but entity not found - fall through to error
    }

    // Tiered word-level candidate search (ADR-231 D3, PIN 2): a candidate
    // is any entity the noun phrase matches at EXACT tier (full text equals
    // name/alias/type) or WORDS tier (every query content word matches the
    // entity's name/alias/adjective vocabulary). This replaces the old
    // exact-match cascade (full text → head noun → adjective fallback) —
    // "x key" now finds the brass key with zero authoring, while a query
    // word matching nothing disqualifies ("x brass sword" never resolves
    // the brass key).
    let candidates: IFEntity[];

    // For AWARE scope (hearing/smelling), search all entities except
    // rooms/player because entities might be in other rooms; scope
    // filtering below handles perceivability.
    const needsBroadSearch = requiredScope === ScopeLevel.AWARE;

    if (needsBroadSearch) {
      candidates = this.world.getAllEntities().filter(e =>
        e.type !== 'room' &&
        e.id !== this.world.getPlayer()?.id &&
        this.matchEntityName(e, ref) !== null
      );
    } else {
      candidates = this.findCandidates(ref);
    }

    this.emitDebugEvent('entity_search', command, {
      searchTerm: ref.text,
      candidateCount: candidates.length,
      strategy: 'tiered_word_match'
    });

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

    // PIN 2 ranking: keep only the dominant (tier, wordsMatched) group.
    // Higher tier wins outright; within a tier, more matched words win
    // outright. Only true ties flow into the disambiguation path below;
    // a single survivor auto-resolves.
    const viableMatches = this.dominantMatches(scoredMatches);

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

      // Phase 5: If user specified modifiers (adjectives) but NO candidate matches them,
      // this is ENTITY_NOT_FOUND (the specific entity doesn't exist), not AMBIGUOUS_ENTITY.
      // Example: "green ball" when only red and blue balls exist -> ENTITY_NOT_FOUND
      //
      // Note: The parser may not always populate modifiers, so we also extract them
      // by comparing text to head (e.g., "green ball" vs "ball" -> modifier "green")
      let modifiers = ref.modifiers || [];
      if (modifiers.length === 0 && ref.text && ref.head) {
        const head = ref.head.toLowerCase();
        const words = ref.text.toLowerCase().split(/\s+/).filter(w => w !== head);
        // Filter out common articles/determiners that aren't adjectives
        const nonModifiers = ['the', 'a', 'an', 'all', 'some', 'every', 'any', 'my'];
        modifiers = words.filter(w => !nonModifiers.includes(w));
      }

      if (modifiers.length > 0) {
        const anyModifierMatch = viableMatches.some(m =>
          m.matchReasons.some(r => r.startsWith('modifier_match_'))
        );
        if (!anyModifierMatch) {
          // User asked for specific adjective(s) that no entity has
          this.emitDebugEvent('entity_resolution', command, {
            objectType,
            resolved: false,
            reason: 'modifiers_not_matched',
            searchText: ref.text,
            specifiedModifiers: modifiers
          });

          return {
            success: false,
            error: {
              type: 'VALIDATION_ERROR',
              code: 'ENTITY_NOT_FOUND',
              parsed: command,
              details: {
                searchText: ref.text,
                modifiers,
                nearMatches: viableMatches.slice(0, 3).map(m => this.getEntityName(m.entity))
              }
            }
          };
        }
      }

      // Still ambiguous - return error with choices for disambiguation prompt
      // Phase 5: Include entity IDs so caller can re-resolve after user selection
      const choices = viableMatches.slice(0, 5).map(m => ({
        id: m.entity.id,
        name: this.getEntityName(m.entity),
        description: this.getEntityDescription(m.entity),
        score: m.score,
        matchReasons: m.matchReasons
      }));

      this.emitDebugEvent('disambiguation_required', command, {
        objectType,
        searchText: ref.text,
        candidateCount: viableMatches.length,
        topCandidates: choices
      });

      return {
        success: false,
        error: {
          type: 'VALIDATION_ERROR',
          code: 'AMBIGUOUS_ENTITY',  // Distinct from ENTITY_NOT_FOUND
          parsed: command,
          details: {
            ambiguousEntities: choices,
            searchText: ref.text,
            matchCount: viableMatches.length,
            objectType  // 'direct', 'indirect', or 'instrument'
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
   * Resolve a topic's text against VISIBLE scope, quietly (ADR-231 D4).
   *
   * Entity-first with text fallback: reuses the D3 tiered matcher, but a
   * topic is NEVER an entity slot — no ENTITY_NOT_FOUND, no scope
   * rejection, no disambiguation prompt. Exactly one dominant in-scope
   * match carries its EntityId (interceptors and future conversation
   * systems key on it); a miss or a tie falls back to the verbatim text.
   *
   * @param text Verbatim topic text as typed (articles preserved)
   * @returns The validated topic — `entity` set only on a unique match
   */
  private resolveTopic(text: string): { text: string; entity?: EntityId } {
    const words = this.stripLeadingArticles(text.toLowerCase().trim()).split(/\s+/);
    const ref: INounPhrase = {
      tokens: [],
      text,
      head: words[words.length - 1] || text,
      modifiers: [],
      articles: [],
      determiners: [],
      candidates: [text]
    };

    const candidates = this.findCandidates(ref);
    const inScope = this.filterByScope(candidates, ScopeLevel.VISIBLE);
    const viable = this.dominantMatches(this.scoreEntities(inScope, ref));

    if (viable.length === 1) {
      return { text, entity: viable[0].entity.id };
    }
    return { text };
  }

  /**
   * Find candidate entities the noun phrase matches at any tier
   * (ADR-231 D3). Rooms are skipped; the player IS resolvable here: a
   * player with an IdentityTrait ("yourself", aliases me/self/myself)
   * must match "examine me", "x yourself", etc. (ISSUE #154).
   */
  private findCandidates(ref: INounPhrase): IFEntity[] {
    return this.world.findWhere(entity => {
      if (entity.type === 'room') {
        return false;
      }
      return this.matchEntityName(entity, ref) !== null;
    });
  }

  /**
   * Match a noun phrase against one entity's naming surface (ADR-231 D3,
   * PIN 2's tiered model).
   *
   * Tier EXACT: the query text — tried with its leading articles restored
   * first (so proper names beginning with an article-like word survive),
   * then as parsed, then article-stripped — equals the full name, a full
   * alias, or the entity type, case-insensitively.
   *
   * Tier WORDS: EVERY query content word (stopwords dropped by
   * `deriveNameVocabulary`) matches a word of the entity's vocabulary
   * (name content words + alias content words + authored adjectives).
   * Any query word matching nothing DISQUALIFIES the candidate:
   * "x brass sword" never resolves to the brass key.
   *
   * @returns The tier and matched-word count, or null when neither
   *   tier matches.
   */
  private matchEntityName(entity: IFEntity, ref: INounPhrase): NameMatch | null {
    const rawText = ref.text?.toLowerCase().trim() || '';
    if (!rawText) {
      return null;
    }

    // Full-text-first: reconstruct the original query (leading articles the
    // parser split off) before trying the stripped forms.
    const articles = (ref.articles || []).map(a => a.toLowerCase());
    const queries: string[] = [];
    if (articles.length > 0) {
      queries.push(`${articles.join(' ')} ${rawText}`);
    }
    queries.push(rawText);
    const stripped = this.stripLeadingArticles(rawText);
    if (!queries.includes(stripped)) {
      queries.push(stripped);
    }

    const name = this.getEntityName(entity).toLowerCase();
    const aliases = this.getEntitySynonyms(entity).map(s => s.toLowerCase());
    const wordsMatchedFor = (q: string) =>
      Math.max(1, deriveNameVocabulary(q).length);

    // Tier EXACT — full text equals name, alias, or type
    for (const query of queries) {
      if (name === query) {
        return {
          tier: MATCH_TIER_EXACT,
          wordsMatched: wordsMatchedFor(query),
          reasons: ['exact_name_match']
        };
      }
      if (aliases.includes(query)) {
        // getEntitySynonyms includes the entity type, so type equality
        // lands here too (preserves pre-D3 type matching).
        return {
          tier: MATCH_TIER_EXACT,
          wordsMatched: wordsMatchedFor(query),
          reasons: ['exact_synonym_match']
        };
      }
    }

    // Tier WORDS — every query content word must match the vocabulary
    const queryWords = deriveNameVocabulary(stripped);
    if (queryWords.length === 0) {
      return null;
    }
    const vocabulary = this.getEntityVocabulary(entity);
    for (const word of queryWords) {
      if (!vocabulary.has(word)) {
        return null; // disqualified — a query word matched nothing
      }
    }
    return {
      tier: MATCH_TIER_WORDS,
      wordsMatched: queryWords.length,
      reasons: queryWords.map(w => `word_match_${w}`)
    };
  }

  /**
   * The entity's word-level matching vocabulary (PIN 2): name content
   * words + alias content words + authored adjectives (per-side for walls
   * via getEntityAdjectives). Always derived on demand from the CURRENT
   * name — never stored — so renames can't leave stale vocabulary and
   * Chord-loaded and TS-authored entities are uniform by construction.
   */
  private getEntityVocabulary(entity: IFEntity): Set<string> {
    const vocabulary = new Set<string>(
      deriveNameVocabulary(this.getEntityName(entity))
    );

    const identity = entity.getTrait(IdentityTrait);
    if (identity?.aliases) {
      for (const alias of identity.aliases) {
        for (const word of deriveNameVocabulary(alias)) {
          vocabulary.add(word);
        }
      }
    }

    for (const adjective of this.getEntityAdjectives(entity)) {
      vocabulary.add(adjective.toLowerCase());
    }

    return vocabulary;
  }

  /**
   * Strip leading articles ("the", "a", "an") from query text, always
   * keeping at least one word.
   */
  private stripLeadingArticles(text: string): string {
    const words = text.split(/\s+/);
    let start = 0;
    while (start < words.length - 1 && QUERY_ARTICLES.has(words[start])) {
      start++;
    }
    return words.slice(start).join(' ');
  }

  /**
   * Keep only the dominant (tier, wordsMatched) group of an already-sorted
   * scored list (PIN 2: higher tier wins; within a tier, more matched
   * words win; only true ties reach disambiguation).
   */
  private dominantMatches(scored: ScoredEntityMatch[]): ScoredEntityMatch[] {
    if (scored.length <= 1) {
      return scored;
    }
    const top = scored[0];
    return scored.filter(
      m => m.tier === top.tier && m.wordsMatched === top.wordsMatched
    );
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
        case ScopeLevel.AWARE:
          // For aware, check if we can hear or smell it
          const canHear = this.scopeResolver.canHear && this.scopeResolver.canHear(player, entity);
          const canSmell = this.scopeResolver.canSmell && this.scopeResolver.canSmell(player, entity);
          return canHear || canSmell || entityScope >= ScopeLevel.AWARE;
        default:
          // Use numeric comparison for other scope levels
          return entityScope >= scope;
      }
    });
  }

  /**
   * Score entities against a reference (ADR-231 D3 tiered model).
   *
   * The tier and matched-word count come from `matchEntityName` and carry
   * PIN 2's ranking; the numeric `score` is the within-tie heuristic
   * (modifier/visibility/inventory/author scope priority bonuses) that the
   * normal disambiguation flow uses to break residual ties.
   */
  private scoreEntities(entities: IFEntity[], ref: INounPhrase): ScoredEntityMatch[] {
    if (!ref) return [];

    const scored: ScoredEntityMatch[] = [];

    // Extract modifiers from ref, or infer from text vs head if not set
    // (The parser may not always populate the modifiers field)
    let modifiers = ref.modifiers || [];
    if (modifiers.length === 0 && ref.text && ref.head) {
      const head = ref.head.toLowerCase();
      const words = ref.text.toLowerCase().split(/\s+/).filter(w => w !== head);
      const nonModifiers = ['the', 'a', 'an', 'all', 'some', 'every', 'any', 'my'];
      modifiers = words.filter(w => !nonModifiers.includes(w));
    }

    for (const entity of entities) {
      const adjectives = this.getEntityAdjectives(entity).map(a => a.toLowerCase());

      // ADR-173: walls require strict modifier match. When the user specifies
      // modifiers, a wall whose current-side adjective doesn't match at least
      // one of them is removed from candidacy entirely — falling back on the
      // bare 'wall' type match would silently resolve `OAK WALL` from the
      // library to the library/parlor wall whose library side is 'brick'.
      if (entity instanceof WallEntity && modifiers.length > 0) {
        const anyMatch = modifiers.some(m => adjectives.includes(m.toLowerCase()));
        if (!anyMatch) {
          continue;
        }
      }

      // Tiered name match (PIN 2) — no match at either tier disqualifies
      const match = this.matchEntityName(entity, ref);
      if (!match) {
        continue;
      }

      let score = 10;
      const matchReasons = [...match.reasons];

      // Modifier matching — an explicitly specified modifier the entity's
      // vocabulary covers (adjective, name word, or alias word) marks the
      // candidate as modifier-consistent for the disambiguation flow.
      if (modifiers.length > 0) {
        const vocabulary = this.getEntityVocabulary(entity);
        for (const modifier of modifiers) {
          if (vocabulary.has(modifier.toLowerCase())) {
            score += 5;
            matchReasons.push(`modifier_match_${modifier}`);
          }
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

      // In inventory bonus
      if (this.isInPlayerInventory(entity)) {
        score += 2;
        matchReasons.push('in_inventory');
      }

      // Author-controlled scope priority (Phase 5 disambiguation)
      // entity.scope(actionId) returns priority (default 100)
      // We scale it to add reasonable bonus/penalty (100 = neutral, 150 = +5, 50 = -5)
      const actionId = this.currentActionId;
      if (actionId && typeof entity.scope === 'function') {
        const priority = entity.scope(actionId);
        const priorityBonus = Math.round((priority - 100) / 10);  // 150 -> +5, 50 -> -5
        if (priorityBonus !== 0) {
          score += priorityBonus;
          matchReasons.push(`scope_priority_${priority}`);
        }
      }

      scored.push({
        entity,
        tier: match.tier,
        wordsMatched: match.wordsMatched,
        score,
        matchReasons
      });
    }

    // Sort by PIN 2 rank (tier, then matched words), then heuristic score
    scored.sort(
      (a, b) =>
        b.tier - a.tier || b.wordsMatched - a.wordsMatched || b.score - a.score
    );

    return scored;
  }

  /**
   * Resolve ambiguity between multiple matches
   */
  private resolveAmbiguity(
    matches: ScoredEntityMatch[],
    ref: INounPhrase,
    command: IParsedCommand
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
    // Infer modifiers from text vs head (same logic as scoreEntities)
    let modifiers = ref?.modifiers || [];
    if (modifiers.length === 0 && ref?.text && ref?.head) {
      const head = ref.head.toLowerCase();
      const words = ref.text.toLowerCase().split(/\s+/).filter(w => w !== head);
      const nonModifiers = ['the', 'a', 'an', 'all', 'some', 'every', 'any', 'my'];
      modifiers = words.filter(w => !nonModifiers.includes(w));
    }

    if (modifiers.length > 0) {
      const perfectMatches = matches.filter(m => {
        const adjectives = this.getEntityAdjectives(m.entity).map(a => a.toLowerCase());
        return modifiers.every((mod: string) => adjectives.includes(mod.toLowerCase()));
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
   * Resolve an entity directly by ID
   * Used after disambiguation when user selects a specific entity
   */
  resolveEntityById(entityId: string, parsed: INounPhrase): IValidatedObjectReference | null {
    const entity = this.world.getEntity(entityId);
    if (!entity) {
      return null;
    }
    return {
      entity: entity as unknown as IValidatedObjectReference['entity'],
      parsed
    };
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
  ): { success: boolean; code?: string } {
    const player = this.world.getPlayer();
    if (!player) {
      return {
        success: false,
        code: 'NO_PLAYER'
      };
    }

    const entityScope = this.scopeResolver.getScope(player, entity);

    // Check if entity meets the required scope level
    switch (requiredScope) {
      case ScopeLevel.CARRIED:
        if (entityScope !== ScopeLevel.CARRIED) {
          return {
            success: false,
            code: 'NOT_CARRIED'
          };
        }
        break;

      case ScopeLevel.REACHABLE:
        if (entityScope !== ScopeLevel.CARRIED && entityScope !== ScopeLevel.REACHABLE) {
          return {
            success: false,
            code: 'NOT_REACHABLE'
          };
        }
        break;

      case ScopeLevel.VISIBLE:
        if (entityScope < ScopeLevel.VISIBLE) {
          return {
            success: false,
            code: 'NOT_VISIBLE'
          };
        }
        break;

      case ScopeLevel.AWARE:
        if (entityScope === ScopeLevel.UNAWARE) {
          return {
            success: false,
            code: 'NOT_AWARE'
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
   * Get entity adjectives.
   *
   * For walls (ADR-173), adjectives are per-side: the wall entity carries
   * an adjective for each of its two connecting rooms, and the parser
   * resolves against the side facing the player's current room. The same
   * wall entity therefore matches different adjectives from each side
   * (e.g. 'oak' from the parlor, 'brick' from the library). When the
   * player is not in either connecting room, the wall contributes no
   * adjectives.
   *
   * For all other entities, adjectives come from `IdentityTrait.adjectives`.
   */
  private getEntityAdjectives(entity: IFEntity): string[] {
    if (entity instanceof WallEntity) {
      const player = this.world.getPlayer();
      const playerRoom = player ? this.world.getLocation(player.id) : undefined;
      if (playerRoom && (playerRoom === entity.between[0] || playerRoom === entity.between[1])) {
        const adjective = entity.getSide(playerRoom)?.adjective;
        return adjective ? [adjective] : [];
      }
      return [];
    }

    const adjectives: string[] = [];

    // Get identity trait
    const identity = entity.getTrait(IdentityTrait);
    if (identity?.adjectives) {
      adjectives.push(...identity.adjectives);
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
    const identity = entity.getTrait(IdentityTrait);
    if (identity?.aliases) {
      synonyms.push(...identity.aliases);
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
   * Emit a debug event
   */
  private emitDebugEvent(
    debugType: 'entity_resolution' | 'entity_search' | 'scope_check' | 'ambiguity_resolution' | 'validation_error' | 'disambiguation_required',
    command: IParsedCommand,
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
