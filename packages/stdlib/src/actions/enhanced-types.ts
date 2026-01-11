/**
 * Enhanced action system types
 * 
 * This provides a cleaner, more author-friendly action system while
 * maintaining the event-driven architecture. Actions return events,
 * but the enhanced context makes it easy to create those events.
 */

import { ISemanticEvent } from '@sharpee/core';
import { IFEntity, WorldModel } from '@sharpee/world-model';
import { ScopeResolver, ScopeLevel } from '../scope/types';
import { ValidatedCommand } from '../validation/types';

/**
 * Result of a scope requirement check.
 *
 * Used by ActionContext.requireScope() to indicate whether an entity
 * meets the required scope level.
 */
export interface ScopeCheckResult {
  /** Whether the scope requirement was met */
  ok: boolean;

  /**
   * If ok is false, contains the error to return from validate().
   * Can be spread directly into a ValidationResult.
   */
  error?: {
    valid: false;
    error: string;
    params?: Record<string, any>;
  };

  /** The actual scope level of the entity (for debugging/logging) */
  actualScope?: ScopeLevel;
}

/**
 * Standard error codes for scope failures.
 * These map to message IDs in the language layer.
 */
export const ScopeErrors = {
  /** Entity is completely unknown to the player */
  NOT_KNOWN: 'scope.not_known',

  /** Entity is known but not currently visible */
  NOT_VISIBLE: 'scope.not_visible',

  /** Entity is visible but not physically reachable */
  NOT_REACHABLE: 'scope.not_reachable',

  /** Entity must be carried but is not in inventory */
  NOT_CARRIED: 'scope.not_carried',

  /** Generic scope failure */
  OUT_OF_SCOPE: 'scope.out_of_scope'
} as const;

/**
 * Result from an implicit take attempt.
 *
 * Used by ActionContext.requireCarriedOrImplicitTake() to indicate
 * whether the entity is now carried (either was already, or was
 * successfully taken implicitly).
 */
export interface ImplicitTakeResult {
  /** Whether the entity is now carried */
  ok: boolean;

  /**
   * If ok is false, contains the error to return from validate().
   * This could be a scope error (can't reach) or a take error (scenery, etc.)
   */
  error?: {
    valid: false;
    error: string;
    params?: Record<string, any>;
  };

  /**
   * Events from the implicit take action, if one was performed.
   * Should be prepended to the main action's report events.
   * Includes the "if.event.implicit_take" event for "(first taking the X)".
   */
  implicitTakeEvents?: ISemanticEvent[];
}

/**
 * Unified action context interface
 * 
 * Provides both world querying capabilities and event creation methods.
 * This is the single context interface used by all actions.
 * 
 * Phase 2: Consolidates ActionContext and EnhancedActionContext into one interface
 */
export interface ActionContext {
  // World querying capabilities
  /**
   * Read-only access to the world model
   */
  readonly world: WorldModel;
  
  /**
   * The player entity
   */
  readonly player: IFEntity;
  
  /**
   * The player's current location
   */
  readonly currentLocation: IFEntity;
  
  /**
   * The validated command being executed
   */
  readonly command: ValidatedCommand;
  
  /**
   * The scope resolver for determining what's perceivable
   */
  readonly scopeResolver: ScopeResolver;
  
  /**
   * Check if an entity is visible to the player
   */
  canSee(entity: IFEntity): boolean;
  
  /**
   * Check if an entity is physically reachable by the player
   */
  canReach(entity: IFEntity): boolean;
  
  /**
   * Check if an entity can be taken by the player
   */
  canTake(entity: IFEntity): boolean;
  
  /**
   * Check if an entity is in scope for the player
   */
  isInScope(entity: IFEntity): boolean;
  
  /**
   * Get all entities visible to the player
   */
  getVisible(): IFEntity[];
  
  /**
   * Get all entities in scope for the player
   */
  getInScope(): IFEntity[];

  // =========================================================================
  // Scope validation methods (Phase 4 parser refactor)
  // =========================================================================

  /**
   * Get the scope level for an entity.
   *
   * Returns the current scope level of the entity relative to the player,
   * using the ScopeResolver. This is the low-level method for custom
   * scope logic.
   *
   * @param entity The entity to check
   * @returns The scope level (UNAWARE through CARRIED)
   *
   * @example
   * const scope = context.getEntityScope(target);
   * if (scope >= ScopeLevel.VISIBLE) {
   *   // Can see it, maybe interact with it
   * }
   */
  getEntityScope(entity: IFEntity): ScopeLevel;

  /**
   * Get the scope level for an entity in a command slot.
   *
   * Convenience method that gets the entity from the command slot
   * and returns its scope level.
   *
   * @param slot The slot name ('target', 'item', 'container', etc.)
   * @returns The scope level, or UNAWARE if no entity in slot
   *
   * @example
   * const scope = context.getSlotScope('target');
   */
  getSlotScope(slot: string): ScopeLevel;

  /**
   * Check if an entity meets a required scope level.
   *
   * This is the high-level helper for scope validation in actions.
   * Returns a result that can be used directly in validate():
   *
   * @param entity The entity to check
   * @param required The minimum scope level required
   * @returns ScopeCheckResult with ok=true or error details
   *
   * @example
   * // Simple scope check in validate()
   * const scopeCheck = context.requireScope(target, ScopeLevel.REACHABLE);
   * if (!scopeCheck.ok) return scopeCheck.error;
   *
   * @example
   * // Dynamic scope based on entity traits
   * const effectiveScope = target.has(TraitType.REMOTE_CONTROLLABLE)
   *   ? ScopeLevel.VISIBLE
   *   : ScopeLevel.REACHABLE;
   * const scopeCheck = context.requireScope(target, effectiveScope);
   * if (!scopeCheck.ok) return scopeCheck.error;
   */
  requireScope(entity: IFEntity, required: ScopeLevel): ScopeCheckResult;

  /**
   * Check if a command slot entity meets a required scope level.
   *
   * Convenience method that combines getting the entity from a slot
   * and checking its scope. Returns an error if no entity in slot
   * or if scope check fails.
   *
   * @param slot The slot name ('target', 'item', 'container', etc.)
   * @param required The minimum scope level required
   * @returns ScopeCheckResult with ok=true or error details
   *
   * @example
   * const scopeCheck = context.requireSlotScope('target', ScopeLevel.REACHABLE);
   * if (!scopeCheck.ok) return scopeCheck.error;
   */
  requireSlotScope(slot: string, required: ScopeLevel): ScopeCheckResult;

  /**
   * Check if an entity is carried, attempting an implicit take if needed.
   *
   * This is the preferred method for actions that require a CARRIED item
   * but should support implicit takes (e.g., "put apple in box" when apple
   * is on the ground).
   *
   * Logic:
   * 1. If entity is already carried → return success
   * 2. If entity is reachable and takeable → attempt implicit take
   * 3. If implicit take succeeds → return success with events to prepend
   * 4. If implicit take fails → return the take's error
   * 5. If entity is not reachable → return scope error
   *
   * The implicit take events should be prepended to the action's report
   * events via sharedData.implicitTakeEvents.
   *
   * @param entity The entity that needs to be carried
   * @returns ImplicitTakeResult with ok=true or error details
   *
   * @example
   * // In validate():
   * const carryCheck = context.requireCarriedOrImplicitTake(item);
   * if (!carryCheck.ok) return carryCheck.error;
   * // Events stored in sharedData.implicitTakeEvents for report phase
   *
   * // In report():
   * const events: ISemanticEvent[] = [];
   * if (context.sharedData.implicitTakeEvents) {
   *   events.push(...context.sharedData.implicitTakeEvents);
   * }
   * // ... add main action events
   */
  requireCarriedOrImplicitTake(entity: IFEntity): ImplicitTakeResult;

  /**
   * Shared data store for passing information between action phases.
   *
   * This property enables clean data passing from the execute phase to the report phase,
   * eliminating the need for context pollution patterns like `(context as any)._previousLocation`.
   *
   * Data stored here during execute() is available in report() for creating rich events
   * with full context about what changed during the action.
   *
   * @deprecated Prefer using ValidationResult.data for passing data from validate()
   * to later phases. sharedData is still useful for passing data between execute()
   * and report() phases, but validate() discoveries should go in ValidationResult.data.
   *
   * @example
   * // In execute() phase - capture context before mutations
   * context.sharedData.previousLocation = context.world.getLocation(item.id);
   * context.sharedData.wasWorn = item.has(TraitType.WEARABLE) && item.wearable.worn;
   *
   * // In report() phase - access captured data
   * const { previousLocation, wasWorn } = context.sharedData;
   * if (wasWorn) {
   *   events.push(context.event('if.event.removed', { item: item.name }));
   * }
   */
  sharedData: Record<string, any>;

  /**
   * The validation result from the validate() phase.
   *
   * This is set by the engine after validate() returns and before calling
   * execute() or blocked(). Actions can access data passed from validate()
   * via validationResult.data.
   *
   * @example
   * // In validate() - return discovered data
   * return { valid: true, data: { trait, behavior, entity } };
   *
   * // In execute() or report() - access the data
   * const { behavior, entity } = context.validationResult!.data!;
   * behavior.execute(entity, context.world, context.player.id);
   */
  validationResult?: ValidationResult;
  
  // Event creation capabilities
  /**
   * The action being executed (for message resolution)
   */
  readonly action: Action;
  
  /**
   * Create an event with automatic entity injection and metadata enrichment
   * 
   * @param type Event type (e.g., 'if.event.taken', 'action.success', 'action.error')
   * @param data Event data - will be enriched with entities and metadata
   * @returns A properly formatted ISemanticEvent
   * 
   * @example
   * // Simple error
   * return [context.event('action.error', { 
   *   actionId: context.action.id, 
   *   messageId: 'no_target' 
   * })]
   * 
   * @example  
   * // Success with typed data
   * const eventData: TakenEventData = { item: noun.name }
   * return [
   *   context.event('if.event.taken', eventData),
   *   context.event('action.success', { 
   *     actionId: context.action.id, 
   *     messageId: 'taken',
   *     params: eventData
   *   })
   * ]
   */
  event(type: string, data: any): ISemanticEvent;
}

/**
 * @deprecated Use ActionContext instead. Will be removed in Phase 2.2.
 * 
 * Enhanced action context with helper methods for event creation
 * 
 * This interface is now redundant as ActionContext includes all capabilities.
 * Kept temporarily for backward compatibility during migration.
 */
export interface EnhancedActionContext extends ActionContext {
  // All methods now inherited from unified ActionContext
}

/**
 * Result from action validation
 * 
 * Used to determine if an action can be executed and provide
 * specific error information if not.
 */
export interface ValidationResult {
  /**
   * Whether the action can be executed
   */
  valid: boolean;

  /**
   * Error code if validation failed
   * Used to look up appropriate error messages
   */
  error?: string;

  /**
   * Additional context for error messages
   */
  params?: Record<string, any>;

  /**
   * Optional custom message ID to use instead of default
   */
  messageId?: string;

  /**
   * Data to pass from validate() to execute() and report() phases.
   *
   * This enables clean data flow without using sharedData mutations.
   * When validate() discovers entities, traits, or behaviors, it can
   * return them in data for later phases to use.
   *
   * @example
   * // In validate() - return discovered data
   * return { valid: true, data: { trait, behavior, entity } };
   *
   * // In execute/report() - access via context.validationResult
   * const { behavior, entity } = context.validationResult!.data!;
   */
  data?: Record<string, any>;
}

/**
 * Unified action interface
 * 
 * Actions define patterns, messages, and execution logic together.
 * They follow a three-phase pattern: validate, execute, then report.
 * 
 * Phase 3.5 Update (Complete Event Ownership):
 * - validate(): Check if action can proceed (returns ValidationResult)
 * - execute(): Perform mutations only (returns void or ISemanticEvent[] for compatibility)
 * - report(): Generate ALL events including errors (owns complete event lifecycle)
 * 
 * The report() method is ALWAYS called and is responsible for:
 * - Creating success events with captured entity snapshots
 * - Creating error events based on validation or execution results
 * - Ensuring all events have complete context and data
 * 
 * During migration, actions can implement either pattern:
 * - Old: validate + execute (returns events) - CommandExecutor creates error events
 * - New: validate + execute (void) + report - Action creates ALL events
 */
/**
 * Scope requirements for action slots.
 *
 * Maps slot names (e.g., 'target', 'item', 'recipient') to their
 * required scope level. This documents the default requirements
 * and can be used by the parser for entity resolution hints.
 *
 * Actions can override these dynamically in validate() using
 * context.requireScope() for more complex scenarios.
 *
 * @example
 * // Taking requires the target to be reachable
 * defaultScope: { target: ScopeLevel.REACHABLE }
 *
 * @example
 * // Giving requires item carried and recipient visible
 * defaultScope: {
 *   item: ScopeLevel.CARRIED,
 *   recipient: ScopeLevel.VISIBLE
 * }
 */
export type ActionScopeRequirements = Record<string, ScopeLevel>;

export interface Action {
  /**
   * Unique identifier for this action
   */
  id: string;

  /**
   * Default scope requirements for this action's slots.
   *
   * Documents what scope level each slot requires by default.
   * Used for:
   * - Parser hints during entity resolution
   * - Default scope validation in validate()
   * - Documentation of action requirements
   *
   * Actions can perform dynamic scope checking in validate() using
   * context.requireScope() for complex scenarios where requirements
   * depend on entity traits or world state.
   *
   * @example
   * defaultScope: { target: ScopeLevel.REACHABLE }
   *
   * @example
   * defaultScope: {
   *   item: ScopeLevel.CARRIED,
   *   container: ScopeLevel.REACHABLE
   * }
   */
  defaultScope?: ActionScopeRequirements;

  /**
   * List of message IDs this action requires
   * Used for documentation and validation
   * Example: ['taken', 'already_have', 'cant_take']
   */
  requiredMessages?: string[];
  
  /**
   * Validate whether this action can be executed in the current context
   * 
   * This method should check:
   * - Entity requirements (exists, has required traits)
   * - State preconditions (using behavior validation methods)
   * - Any action-specific constraints
   * 
   * @param context Unified action context with helper methods
   * @returns Validation result indicating if action can proceed
   */
  validate(context: ActionContext): ValidationResult;
  
  /**
   * Execute the action (mutations only in new pattern)
   * 
   * This method is only called if validate() returned { valid: true }.
   * 
   * Old pattern: Returns events describing what happened
   * New pattern: Returns void, only performs mutations
   * 
   * @param context Unified action context with helper methods
   * @returns Array of events (old pattern) or void (new pattern)
   */
  execute(context: ActionContext): ISemanticEvent[] | void;
  
  /**
   * Generate success events (four-phase pattern)
   *
   * This method is ONLY called when validation passes and execute() succeeds.
   * It is responsible for creating success events with captured entity snapshots.
   *
   * NOTE: This will become required once all actions are migrated to the new pattern.
   * For now it's optional to maintain backward compatibility with unmigrated actions.
   *
   * @param context Unified action context
   * @returns Array of success events with captured state data
   */
  report?(context: ActionContext): ISemanticEvent[];

  /**
   * Generate blocked events when validation fails (four-phase pattern)
   *
   * This method is called when validate() returns { valid: false }.
   * It creates appropriate error/blocked events based on the validation result.
   *
   * Each action owns its own blocked messages and can customize the response.
   * A default implementation generates a standard 'action.blocked' event.
   *
   * NOTE: This will become required once all actions are migrated to the new pattern.
   * For now it's optional to maintain backward compatibility with unmigrated actions.
   *
   * @param context Unified action context
   * @param result The validation result containing error info
   * @returns Array of blocked/error events
   */
  blocked?(context: ActionContext, result: ValidationResult): ISemanticEvent[];
  
  /**
   * @deprecated Use validate() instead. This will be removed after refactoring.
   * Optional method to validate if this action can handle the command
   * By default, pattern matching is sufficient
   */
  canExecute?(context: ActionContext): boolean;
  
  /**
   * Message ID for the action description (for help/documentation)
   * The language provider should have this message
   */
  descriptionMessageId?: string;
  
  /**
   * Message ID for example commands (for help/documentation)
   * The language provider should format this as a list
   */
  examplesMessageId?: string;
  
  /**
   * Action group (for organizing related actions)
   */
  group?: string;
  
  /**
   * Priority for pattern matching (higher = preferred)
   * Default is 0
   */
  priority?: number;
}

/**
 * Text event structure
 * 
 * Standard structure for events that produce text output
 */
export interface TextEvent extends ISemanticEvent {
  type: 'text' | 'action.success' | 'action.error' | 'game.message';
  data: {
    /**
     * Message ID to look up
     */
    messageId: string;
    
    /**
     * Parameters for message formatting
     */
    params?: Record<string, any>;
    
    /**
     * Optional fallback text if message ID not found
     */
    fallback?: string;
    
    /**
     * Optional metadata
     */
    metadata?: Record<string, any>;
  };
}

/**
 * Action registry interface
 */
export interface ActionRegistry {
  /**
   * Register an action
   */
  register(action: Action): void;
  
  /**
   * Register multiple actions
   */
  registerMany(actions: Action[]): void;
  
  /**
   * Get an action by ID
   */
  get(actionId: string): Action | undefined;
  
  /**
   * Get all registered actions
   */
  getAll(): Action[];
  
  /**
   * Check if an action is registered
   */
  has(actionId: string): boolean;
  
  /**
   * Find actions by pattern
   */
  findByPattern(pattern: string): Action[];
  
  /**
   * Get actions by group
   */
  getByGroup(group: string): Action[];
  
  /**
   * Register messages for an action
   */
  registerMessages(actionId: string, messages: Record<string, string>): void;
}

/**
 * Message registry interface
 */
export interface MessageRegistry {
  /**
   * Register messages
   */
  register(messages: Record<string, string>): void;
  
  /**
   * Register messages with a namespace
   */
  registerNamespaced(namespace: string, messages: Record<string, string>): void;
  
  /**
   * Get a message by ID
   */
  getMessage(id: string, params?: Record<string, any>): string;
  
  /**
   * Check if a message exists
   */
  hasMessage(id: string): boolean;
  
  /**
   * Get all messages in a namespace
   */
  getNamespace(namespace: string): Record<string, string>;
  
  /**
   * Override a message
   */
  override(id: string, message: string): void;
}

/**
 * Helper type for action definitions
 */
export type ActionDefinition = Omit<Action, 'execute'> & {
  execute: (context: ActionContext) => ISemanticEvent[];
};

/**
 * Standard message namespaces
 */
export const MessageNamespaces = {
  SYSTEM: 'if.system',
  ACTION: 'if.action',
  ERROR: 'if.error',
  GAME: 'if.game',
  STORY: 'story',
  EXTENSION: 'ext'
} as const;

/**
 * Standard event types
 */
export const EventTypes = {
  TEXT: 'text',
  ACTION_SUCCESS: 'action.success',
  ACTION_ERROR: 'action.error',
  ACTION_FAILED: 'action.failed',
  GAME_MESSAGE: 'game.message',
  SYSTEM_MESSAGE: 'system.message'
} as const;