# @sharpee/stdlib

All 43 standard actions, validation, scope builders, NPC support, combat, action chains.

---

### actions/enhanced-types

```typescript
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
export declare const ScopeErrors: {
    /** Entity is completely unknown to the player */
    readonly NOT_KNOWN: "scope.not_known";
    /** Entity is known but not currently visible */
    readonly NOT_VISIBLE: "scope.not_visible";
    /** Entity is visible but not physically reachable */
    readonly NOT_REACHABLE: "scope.not_reachable";
    /** Entity must be carried but is not in inventory */
    readonly NOT_CARRIED: "scope.not_carried";
    /** Generic scope failure */
    readonly OUT_OF_SCOPE: "scope.out_of_scope";
};
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
     * const eventData: TakenEventData = { item: noun.name, messageId: 'taken' }
     * return [
     *   context.event('if.event.taken', eventData)
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
    /**
     * Requirements the target must meet for this action to succeed.
     *
     * Used by implicit inference to find a valid alternative when the
     * player uses a pronoun that resolved to something that doesn't
     * meet the requirements.
     *
     * Inference ONLY triggers when pronouns are used ("read it"), not
     * when the player explicitly names an entity ("read mailbox").
     *
     * @example
     * // Reading requires ReadableTrait
     * targetRequirements: {
     *   trait: 'ReadableTrait',
     *   description: 'readable'
     * }
     *
     * @example
     * // Opening requires OpenableTrait and NOT already open
     * targetRequirements: {
     *   trait: 'OpenableTrait',
     *   condition: 'not_open',
     *   description: 'openable'
     * }
     */
    targetRequirements?: {
        /** Trait the target must have (e.g., 'ReadableTrait', 'OpenableTrait') */
        trait?: string;
        /** Additional condition (e.g., 'not_open', 'not_locked') */
        condition?: string;
        /** Human-readable description for messages (e.g., 'readable', 'openable') */
        description: string;
    };
    /**
     * Whether the target must be held (in inventory) for this action.
     *
     * When true and the target isn't held, an implicit take will be
     * attempted before executing the main action.
     *
     * Unlike inference, implicit take works for BOTH pronouns and
     * explicit nouns ("read leaflet" still auto-takes the leaflet).
     *
     * @example
     * // Reading requires holding the item
     * requiresHolding: true
     */
    requiresHolding?: boolean;
    /**
     * Whether to allow implicit inference for this action.
     *
     * When true (default), if the target doesn't meet targetRequirements
     * and a pronoun was used, the system will try to find a valid
     * alternative in scope.
     *
     * Set to false to disable inference for this action.
     */
    allowImplicitInference?: boolean;
    /**
     * Whether to allow implicit take for this action.
     *
     * When true (default if requiresHolding is true), if the target
     * isn't held, the system will try to take it first.
     *
     * Set to false to disable implicit take even if requiresHolding is true.
     */
    allowImplicitTake?: boolean;
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
export declare const MessageNamespaces: {
    readonly SYSTEM: "if.system";
    readonly ACTION: "if.action";
    readonly ERROR: "if.error";
    readonly GAME: "if.game";
    readonly STORY: "story";
    readonly EXTENSION: "ext";
};
/**
 * Standard event types
 */
export declare const EventTypes: {
    readonly TEXT: "text";
    readonly ACTION_SUCCESS: "action.success";
    readonly ACTION_ERROR: "action.error";
    readonly ACTION_FAILED: "action.failed";
    readonly GAME_MESSAGE: "game.message";
    readonly SYSTEM_MESSAGE: "system.message";
};
```

### actions/enhanced-context

```typescript
/**
 * Enhanced action context implementation
 *
 * Provides helper methods that make it easy to create properly
 * formatted events while maintaining the event-driven architecture.
 */
import { IFEntity, WorldModel } from '@sharpee/world-model';
import { ActionContext, Action } from './enhanced-types';
import { ScopeResolver } from '../scope/types';
import { ValidatedCommand } from '../validation/types';
/**
 * Factory function to create unified action context
 *
 * Phase 2: Factory pattern implementation
 */
export declare function createActionContext(world: WorldModel, player: IFEntity, action: Action, command: ValidatedCommand, scopeResolver?: ScopeResolver): ActionContext;
/**
 * Helper to create a mock action context for testing
 */
export declare function createMockActionContext(world: WorldModel, player: IFEntity, action: Action, command?: Partial<ValidatedCommand>, scopeResolver?: ScopeResolver): ActionContext;
```

### actions/meta-action

```typescript
/**
 * Meta-Action Base Class
 *
 * Base class for meta-commands (out-of-world actions) that don't affect game state.
 * Meta-commands do not:
 * - Increment the turn counter
 * - Trigger NPC actions or daemons
 * - Get recorded in command history
 * - Affect the game world state
 *
 * Examples include debug commands, system commands (SAVE/RESTORE), and information
 * commands (SCORE/VERSION).
 */
import { Action, ActionContext, ValidationResult } from './enhanced-types';
import { ISemanticEvent } from '@sharpee/core';
/**
 * Abstract base class for meta-commands
 *
 * Extends this class to create commands that interact with the game system
 * rather than the game world. The constructor automatically registers the
 * command as a meta-command.
 *
 * @example
 * ```typescript
 * export class ScoreAction extends MetaAction {
 *   id = 'score';
 *   verbs = ['score'];
 *
 *   execute(context: ActionContext): ISemanticEvent[] {
 *     // Display score without incrementing turn
 *     return [
 *       context.event('game.score', {
 *         score: context.world.getStateValue('score') || 0
 *       })
 *     ];
 *   }
 * }
 * ```
 */
export declare abstract class MetaAction implements Action {
    /**
     * Unique identifier for this action
     */
    abstract id: string;
    /**
     * Verbs that trigger this action
     */
    abstract verbs: string[];
    /**
     * Validate whether this meta-action can be executed
     *
     * Meta-actions typically have minimal validation requirements.
     * Override this method for custom validation logic.
     *
     * @param context The action context
     * @returns Validation result (defaults to always valid)
     */
    validate(context: ActionContext): ValidationResult;
    /**
     * @deprecated Use validate() instead. This will be removed after refactoring.
     * Optional method to check if action can execute
     * Override for complex conditions beyond verb matching
     */
    canExecute?(context: ActionContext): boolean;
    /**
     * Message ID for action description (for help/documentation)
     */
    descriptionMessageId?: string;
    /**
     * Message ID for example commands (for help/documentation)
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
    /**
     * Constructor - subclasses should call ensureRegistered() after setting id
     */
    constructor();
    /**
     * Execute the meta-command
     *
     * @param context The action context
     * @returns Array of semantic events
     */
    abstract execute(context: ActionContext): ISemanticEvent[];
    /**
     * Register this action as a meta-command
     * Subclasses should call this after setting the id property
     *
     * @example
     * ```typescript
     * export class ScoreAction extends MetaAction {
     *   id = 'score';
     *   verbs = ['score'];
     *
     *   constructor() {
     *     super();
     *     this.ensureRegistered();
     *   }
     * }
     * ```
     */
    protected ensureRegistered(): void;
}
```

### actions/meta-registry

```typescript
/**
 * Meta-Command Registry
 *
 * Centralized registry for tracking which commands are meta-commands.
 * Meta-commands don't increment turns, trigger NPCs, or get recorded in history.
 */
/**
 * Registry for meta-commands
 *
 * Maintains a list of action IDs that should be treated as meta-commands.
 * This includes both standard system commands (SAVE, RESTORE, etc.) and
 * custom meta-commands (debug commands, author commands, etc.).
 */
export declare class MetaCommandRegistry {
    /**
     * Set of registered meta-command IDs
     * Pre-populated with standard IF meta-commands
     */
    private static metaCommands;
    /**
     * Register an action ID as a meta-command
     *
     * @param actionId The action ID to register
     * @example
     * ```typescript
     * MetaCommandRegistry.register('my_debug_command');
     * ```
     */
    static register(actionId: string): void;
    /**
     * Unregister an action ID from meta-commands
     * Useful for testing or dynamic configuration
     *
     * @param actionId The action ID to unregister
     * @returns true if the command was registered and is now removed
     */
    static unregister(actionId: string): boolean;
    /**
     * Check if an action ID is registered as a meta-command
     *
     * @param actionId The action ID to check
     * @returns true if this is a meta-command
     * @example
     * ```typescript
     * if (!MetaCommandRegistry.isMeta(result.actionId)) {
     *   // Increment turn counter
     *   this.updateContext(result);
     * }
     * ```
     */
    static isMeta(actionId: string): boolean;
    /**
     * Get all registered meta-command IDs
     * Useful for debugging and documentation
     *
     * @returns Array of all registered meta-command IDs
     */
    static getAll(): string[];
    /**
     * Clear all registered meta-commands
     * Useful for testing - resets to default state
     */
    static clear(): void;
    /**
     * Reset to default meta-commands
     * Removes any custom registrations and restores defaults
     */
    static reset(): void;
    /**
     * Get the count of registered meta-commands
     *
     * @returns Number of registered meta-commands
     */
    static count(): number;
    /**
     * Check if registry has any custom (non-default) meta-commands
     *
     * @returns true if any non-default commands are registered
     */
    static hasCustomCommands(): boolean;
    /**
     * Common verb strings for non-undoable commands.
     *
     * Used for early detection before parsing (when action ID is not yet available).
     * Includes both meta-commands and info commands that don't change game state.
     *
     * @internal Used by game engine for undo snapshot decisions
     */
    private static nonUndoableVerbs;
    /**
     * Check if a raw input string is a non-undoable command.
     *
     * Used for early detection before parsing when we don't have an action ID yet.
     * This covers:
     * - Meta-commands (save, restore, quit, restart, undo, etc.)
     * - Info commands (look, examine, inventory)
     *
     * @param input Raw command input string
     * @returns true if this command should not create an undo snapshot
     *
     * @example
     * ```typescript
     * if (!MetaCommandRegistry.isNonUndoable(input)) {
     *   createUndoSnapshot();
     * }
     * ```
     */
    static isNonUndoable(input: string): boolean;
}
```

### actions/context

```typescript
/**
 * Read-only action context implementation
 *
 * Provides query methods for actions without allowing state mutations
 */
import { IFEntity, WorldModel, ICapabilityData, IValidatedCommand } from '@sharpee/world-model';
import { ActionContext, Action, ScopeCheckResult, ImplicitTakeResult } from './enhanced-types';
import { ISemanticEvent } from '@sharpee/core';
import { ScopeResolver, ScopeLevel } from '../scope/types';
/**
 * @deprecated Use createActionContext from enhanced-context.ts instead
 * This class is kept for backward compatibility but will be removed in Phase 4
 */
export declare class ReadOnlyActionContext implements ActionContext {
    readonly world: WorldModel;
    readonly player: IFEntity;
    readonly currentLocation: IFEntity;
    readonly command: IValidatedCommand;
    readonly action: Action;
    readonly scopeResolver: ScopeResolver;
    sharedData: Record<string, any>;
    constructor(world: WorldModel, player: IFEntity, currentLocation: IFEntity, command: IValidatedCommand, action?: Action, scopeResolver?: ScopeResolver);
    /**
     * Check if an entity is visible to the player
     */
    canSee(entity: IFEntity): boolean;
    /**
     * Check if an entity is physically reachable by the player
     *
     * An entity is reachable if:
     * 1. It's in the same location as the player
     * 2. It's held by the player
     * 3. It's in an open container in the same location
     * 4. It's on a supporter in the same location
     */
    canReach(entity: IFEntity): boolean;
    /**
     * Check if an entity can be taken by the player
     *
     * An entity can be taken if:
     * 1. It's visible
     * 2. It's reachable
     * 3. It's not a room
     * 4. It's not scenery (fixed in place)
     * 5. It's not already held by the player
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
    /**
     * Get capability data (convenience method)
     */
    getCapability(name: string): ICapabilityData | undefined;
    /**
     * Event creation method (required by ActionContext interface)
     * @deprecated This implementation throws an error - use createActionContext instead
     */
    event(type: string, data: any): ISemanticEvent;
    /**
     * Get the scope level for an entity.
     * @deprecated This implementation returns basic scope levels - use createActionContext instead
     */
    getEntityScope(entity: IFEntity): ScopeLevel;
    /**
     * Get the scope level for an entity in a command slot.
     * @deprecated This implementation returns basic scope levels - use createActionContext instead
     */
    getSlotScope(slot: string): ScopeLevel;
    /**
     * Check if an entity meets a required scope level.
     * @deprecated This implementation is basic - use createActionContext instead
     */
    requireScope(entity: IFEntity, required: ScopeLevel): ScopeCheckResult;
    /**
     * Check if a command slot entity meets a required scope level.
     * @deprecated This implementation is basic - use createActionContext instead
     */
    requireSlotScope(slot: string, required: ScopeLevel): ScopeCheckResult;
    /**
     * Check if an entity is carried, attempting implicit take if needed.
     * @deprecated This implementation throws an error - use createActionContext instead
     */
    requireCarriedOrImplicitTake(_entity: IFEntity): ImplicitTakeResult;
}
```

### actions/registry

```typescript
/**
 * Action registry implementation
 *
 * Manages registration and lookup of actions.
 * Actions are pure logic - patterns come from the language provider.
 */
import { Action, ActionRegistry as IActionRegistry } from './enhanced-types';
import { LanguageProvider } from '@sharpee/if-domain';
export { ActionRegistry } from './enhanced-types';
export declare class StandardActionRegistry implements IActionRegistry {
    private actions;
    private actionsByPattern;
    private actionsByGroup;
    private languageProvider;
    /**
     * Set the language provider for pattern resolution
     * @param provider Language provider instance (required for pattern resolution)
     */
    setLanguageProvider(provider: LanguageProvider): void;
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
     * Find an action by ID or pattern (backward compatibility)
     * @param idOrPattern Action ID or pattern to search for
     * @returns First matching action or undefined
     */
    find(idOrPattern: string): Action | undefined;
    /**
     * Register messages for an action (placeholder for future implementation)
     */
    registerMessages(actionId: string, messages: Record<string, string>): void;
    /**
     * Update pattern mappings for a single action
     */
    private updatePatternMappingsForAction;
    /**
     * Rebuild all pattern mappings from language provider
     */
    private rebuildPatternMappings;
}
```

### actions/constants

```typescript
/**
 * Standard Interactive Fiction action identifiers
 *
 * These are the common verbs/actions that players can perform
 */
export declare const ActionIDs: {
    readonly GOING: "if.action.going";
    readonly LOOKING: "if.action.looking";
    readonly EXAMINING: "if.action.examining";
    readonly TAKING: "if.action.taking";
    readonly DROPPING: "if.action.dropping";
    readonly OPENING: "if.action.opening";
    readonly INVENTORY: "if.action.inventory";
};
export declare const IFActions: {
    readonly GOING: "if.action.going";
    readonly ENTERING_ROOM: "if.action.entering_room";
    readonly ENTERING: "if.action.entering";
    readonly EXITING: "if.action.exiting";
    readonly CLIMBING: "if.action.climbing";
    readonly JUMPING: "if.action.jumping";
    readonly LOOKING: "if.action.looking";
    readonly EXAMINING: "if.action.examining";
    readonly SEARCHING: "if.action.searching";
    readonly LOOKING_UNDER: "if.action.looking_under";
    readonly LOOKING_BEHIND: "if.action.looking_behind";
    readonly LISTENING: "if.action.listening";
    readonly SMELLING: "if.action.smelling";
    readonly TOUCHING: "if.action.touching";
    readonly TASTING: "if.action.tasting";
    readonly TAKING: "if.action.taking";
    readonly DROPPING: "if.action.dropping";
    readonly PUTTING: "if.action.putting";
    readonly INSERTING: "if.action.inserting";
    readonly REMOVING: "if.action.removing";
    readonly THROWING: "if.action.throwing";
    readonly OPENING: "if.action.opening";
    readonly CLOSING: "if.action.closing";
    readonly EMPTYING: "if.action.emptying";
    readonly LOCKING: "if.action.locking";
    readonly UNLOCKING: "if.action.unlocking";
    readonly WEARING: "if.action.wearing";
    readonly TAKING_OFF: "if.action.taking_off";
    readonly SWITCHING_ON: "if.action.switching_on";
    readonly SWITCHING_OFF: "if.action.switching_off";
    readonly PUSHING: "if.action.pushing";
    readonly PULLING: "if.action.pulling";
    readonly TURNING: "if.action.turning";
    readonly SETTING: "if.action.setting";
    readonly EATING: "if.action.eating";
    readonly DRINKING: "if.action.drinking";
    readonly TALKING: "if.action.talking";
    readonly ASKING: "if.action.asking";
    readonly TELLING: "if.action.telling";
    readonly ANSWERING: "if.action.answering";
    readonly SHOWING: "if.action.showing";
    readonly GIVING: "if.action.giving";
    readonly ATTACKING: "if.action.attacking";
    readonly KISSING: "if.action.kissing";
    readonly WAVING: "if.action.waving";
    readonly LOWERING: "if.action.lowering";
    readonly RAISING: "if.action.raising";
    readonly CONSULTING: "if.action.consulting";
    readonly READING: "if.action.reading";
    readonly INVENTORY: "if.action.inventory";
    readonly WAITING: "if.action.waiting";
    readonly SLEEPING: "if.action.sleeping";
    readonly WAKING: "if.action.waking";
    readonly SAVING: "if.action.saving";
    readonly RESTORING: "if.action.restoring";
    readonly RESTARTING: "if.action.restarting";
    readonly QUITTING: "if.action.quitting";
    readonly UNDOING: "if.action.undoing";
    readonly AGAIN: "if.action.again";
    readonly SCORING: "if.action.scoring";
    readonly VERIFYING: "if.action.verifying";
    readonly VERSION: "if.action.version";
    readonly HELP: "if.action.help";
    readonly HINTS: "if.action.hints";
    readonly ABOUT: "if.action.about";
};
export type IFActionType = typeof IFActions[keyof typeof IFActions];
```

### actions/standard

```typescript
/**
 * Standard Interactive Fiction actions
 *
 * These are the core actions that most IF games will use.
 * Each action is a pure function that validates conditions and returns events.
 */
export { takingAction } from './taking';
export type { TakenEventData, TakingErrorData } from './taking/taking-events';
export * from './dropping';
export * from './examining';
export * from './opening';
export * from './closing/closing';
export * from './going';
export * from './looking';
export * from './inventory';
export * from './waiting';
export * from './sleeping';
export * from './scoring';
export * from './help';
export * from './about';
export * from './version';
export * from './locking';
export * from './unlocking';
export * from './switching_on';
export * from './switching_off';
export * from './entering';
export * from './exiting';
export * from './climbing';
export * from './searching';
export * from './listening';
export * from './smelling';
export * from './touching';
export * from './putting';
export * from './inserting';
export * from './reading';
export { removingAction } from './removing';
export type { RemovingEventMap } from './removing/removing-events';
export * from './giving';
export * from './showing';
export { throwingAction } from './throwing';
export type { ThrownEventData, ItemDestroyedEventData } from './throwing/throwing-events';
export * from './pushing';
export * from './pulling';
export * from './lowering';
export * from './raising';
export { wearingAction } from './wearing';
export { takingOffAction } from './taking_off';
export type { WornEventData, ImplicitTakenEventData } from './wearing/wearing-events';
export type { RemovedEventData as TakenOffEventData } from './taking_off/taking-off-events';
export * from './eating';
export * from './drinking';
export * from './talking';
export * from './attacking';
export * from './saving';
export * from './restoring';
export * from './quitting';
export * from './restarting';
export * from './undoing';
export * from './again';
import { TraceAction } from '../author';
export declare const standardActions: (import("..").Action | TraceAction)[];
```

### actions/author/trace

```typescript
/**
 * Trace Command
 *
 * Enables/disables tracing of internal engine events for debugging
 *
 * Usage:
 *   trace - Show current trace status
 *   trace on - Enable all tracing
 *   trace off - Disable all tracing
 *   trace parser on/off - Control parser event tracing
 *   trace validation on/off - Control validation event tracing
 *   trace system on/off - Control system event tracing
 *   trace all on/off - Control all tracing
 */
import { ActionContext } from '../enhanced-types';
import { MetaAction } from '../meta-action';
import { ValidationResult } from '../enhanced-types';
import { ISemanticEvent } from '@sharpee/core';
export declare class TraceAction extends MetaAction {
    id: string;
    verbs: string[];
    constructor();
    validate(context: ActionContext): ValidationResult;
    execute(context: ActionContext): ISemanticEvent[];
}
```

### events/action-events

```typescript
/**
 * Action event data patterns
 *
 * These interfaces define what goes in the 'payload' field of SemanticEvents
 * produced by actions. We use the existing SemanticEvent structure rather
 * than creating redundant fields.
 */
/**
 * Success event payload - when an action completes successfully
 */
export interface ActionSuccessPayload {
    actionId: string;
    messageId: string;
    params?: Record<string, any>;
}
/**
 * Error event payload - when an action fails
 */
export interface ActionErrorPayload {
    actionId: string;
    reason: string;
    messageId: string;
    params?: Record<string, any>;
}
/**
 * Game event payload - for world state changes
 * Each action defines the specific data type
 */
export interface GameEventPayload<TData = any> {
    actionId: string;
    data: TData;
}
```

### events/common-patterns

```typescript
/**
 * Common event data patterns for IF actions
 *
 * These are optional base interfaces that actions can extend
 * if they want to follow common patterns. Actions are free
 * to define their own structures.
 */
import { EntityId } from '@sharpee/core';
/**
 * Common pattern for events that involve a target entity
 */
export interface TargetedEventData {
    targetId: EntityId;
    targetName: string;
}
/**
 * Common pattern for events that involve object manipulation
 */
export interface ObjectEventData extends TargetedEventData {
    objectId: EntityId;
    objectName: string;
}
/**
 * Common pattern for location-based events
 */
export interface LocationEventData {
    locationId: EntityId;
    locationName: string;
}
/**
 * Common pattern for events involving containers/supporters
 */
export interface ContainerContextData {
    containerId?: EntityId;
    containerName?: string;
    isContainer?: boolean;
    isSupporter?: boolean;
}
/**
 * Common pattern for movement between locations
 */
export interface MovementData {
    fromLocationId: EntityId;
    fromLocationName: string;
    toLocationId: EntityId;
    toLocationName: string;
}
/**
 * Guidelines for event data design:
 *
 * 1. Entity references should use IDs (stable, unique)
 * 2. Include human-readable names when needed for messages
 * 3. Use consistent naming patterns:
 *    - `${entity}Id` for entity IDs
 *    - `${entity}Name` for entity names
 *    - `is${Property}` for boolean flags
 *    - `has${Property}` for existence checks
 * 4. Keep event data focused on what happened, not how to display it
 */
```

### events/event-utils

```typescript
/**
 * Utilities for creating standardized event data
 *
 * These are helpers that actions can use if they want to follow
 * common patterns, but they're entirely optional.
 */
import { IFEntity } from '@sharpee/world-model';
import { EntityId } from '@sharpee/core';
/**
 * Create standard target data from an entity
 */
export declare function createTargetData(entity: IFEntity): {
    targetId: string;
    targetName: string;
};
/**
 * Create standard object data from an entity
 */
export declare function createObjectData(entity: IFEntity): {
    targetId: string;
    targetName: string;
    objectId: string;
    objectName: string;
};
/**
 * Create standard container data from an entity
 */
export declare function createContainerData(entity: IFEntity): {
    containerId: string;
    containerName: string;
};
/**
 * Create standard location data from an entity
 */
export declare function createLocationData(entity: IFEntity): {
    locationId: string;
    locationName: string;
};
/**
 * Helper to convert entity array to ID array
 */
export declare function entitiesToIds(entities: IFEntity[]): EntityId[];
/**
 * Helper to convert entity array to name array
 */
export declare function entitiesToNames(entities: IFEntity[]): string[];
/**
 * Create movement data from two locations
 */
export declare function createMovementData(from: IFEntity, to: IFEntity): {
    fromLocationId: string;
    fromLocationName: string;
    toLocationId: string;
    toLocationName: string;
};
```

### events/event-registry

```typescript
/**
 * Stdlib Event Registry Extension
 *
 * Extends the core EventDataRegistry with stdlib action event types.
 * Uses TypeScript declaration merging to add type safety for IF events.
 *
 * @see ADR-082 for the design rationale
 */
import type { EntityId } from '@sharpee/core';
export type { TakenEventData, TakingErrorData } from '../actions/standard/taking/taking-events';
export type { DroppedEventData, DroppingErrorData } from '../actions/standard/dropping/dropping-events';
export type { LookedEventData, RoomDescriptionEventData, ListContentsEventData } from '../actions/standard/looking/looking-events';
export type { ExaminedEventData, ExaminingErrorData } from '../actions/standard/examining/examining-events';
export type { ActorMovedEventData, ActorExitedEventData, ActorEnteredEventData, GoingErrorData } from '../actions/standard/going/going-events';
export type { OpenedEventData, RevealedEventData, ExitRevealedEventData, OpeningErrorData } from '../actions/standard/opening/opening-events';
export type { PutInEventData, PutOnEventData } from '../actions/standard/putting/putting-events';
export type { LockedEventData, LockingErrorData } from '../actions/standard/locking/locking-events';
export type { UnlockedEventData, UnlockingErrorData } from '../actions/standard/unlocking/unlocking-events';
export type { WornEventData, WearingErrorData } from '../actions/standard/wearing/wearing-events';
export type { RemovedEventData as TakingOffRemovedEventData, TakingOffErrorData } from '../actions/standard/taking_off/taking-off-events';
export type { EnteredEventData, EnteringErrorData } from '../actions/standard/entering/entering-events';
export type { ExitedEventData, ExitingErrorData } from '../actions/standard/exiting/exiting-events';
export type { SwitchedOnEventData, SwitchingOnErrorData } from '../actions/standard/switching_on/switching_on-events';
export type { SwitchedOffEventData, SwitchingOffErrorData } from '../actions/standard/switching_off/switching_off-events';
export type { ScoreDisplayedEventData } from '../actions/standard/scoring/scoring-events';
export type { InventoryEventData, InventoryItem } from '../actions/standard/inventory/inventory-events';
import type { TakenEventData } from '../actions/standard/taking/taking-events';
import type { DroppedEventData } from '../actions/standard/dropping/dropping-events';
import type { LookedEventData, RoomDescriptionEventData, ListContentsEventData } from '../actions/standard/looking/looking-events';
import type { ExaminedEventData } from '../actions/standard/examining/examining-events';
import type { ActorMovedEventData, ActorExitedEventData, ActorEnteredEventData } from '../actions/standard/going/going-events';
import type { OpenedEventData, RevealedEventData, ExitRevealedEventData } from '../actions/standard/opening/opening-events';
import type { PutInEventData, PutOnEventData } from '../actions/standard/putting/putting-events';
import type { LockedEventData } from '../actions/standard/locking/locking-events';
import type { UnlockedEventData } from '../actions/standard/unlocking/unlocking-events';
import type { WornEventData } from '../actions/standard/wearing/wearing-events';
import type { RemovedEventData as TakingOffRemovedData } from '../actions/standard/taking_off/taking-off-events';
import type { EnteredEventData } from '../actions/standard/entering/entering-events';
import type { ExitedEventData } from '../actions/standard/exiting/exiting-events';
import type { SwitchedOnEventData } from '../actions/standard/switching_on/switching_on-events';
import type { SwitchedOffEventData } from '../actions/standard/switching_off/switching_off-events';
import type { ScoreDisplayedEventData } from '../actions/standard/scoring/scoring-events';
import type { InventoryEventData } from '../actions/standard/inventory/inventory-events';
/**
 * Standard success event data for actions
 */
export interface ActionSuccessData {
    actionId: string;
    messageId: string;
    params?: Record<string, unknown>;
}
/**
 * Standard error event data for actions
 */
export interface ActionErrorData {
    actionId: string;
    reason: string;
    messageId: string;
    params?: Record<string, unknown>;
}
/**
 * Closed event data (for closing action)
 */
export interface ClosedEventData {
    targetId: EntityId;
    targetName: string;
}
/**
 * Implicit take event data
 *
 * Emitted when an action requires a carried item and the item
 * is automatically taken first. Used for "(first taking the X)" messages.
 */
export interface ImplicitTakeEventData {
    item: EntityId;
    itemName: string;
}
declare module '@sharpee/core' {
    interface EventDataRegistry {
        'if.event.taken': TakenEventData;
        'if.event.dropped': DroppedEventData;
        'if.event.implicit_take': ImplicitTakeEventData;
        'if.event.looked': LookedEventData;
        'if.event.room.description': RoomDescriptionEventData;
        'if.event.list.contents': ListContentsEventData;
        'if.event.examined': ExaminedEventData;
        'if.event.actor_moved': ActorMovedEventData;
        'if.event.actor_exited': ActorExitedEventData;
        'if.event.actor_entered': ActorEnteredEventData;
        'if.event.opened': OpenedEventData;
        'if.event.closed': ClosedEventData;
        'if.event.revealed': RevealedEventData;
        'if.event.exit_revealed': ExitRevealedEventData;
        'if.event.put_in': PutInEventData;
        'if.event.put_on': PutOnEventData;
        'if.event.locked': LockedEventData;
        'if.event.unlocked': UnlockedEventData;
        'if.event.worn': WornEventData;
        'if.event.removed': TakingOffRemovedData;
        'if.event.entered': EnteredEventData;
        'if.event.exited': ExitedEventData;
        'if.event.switched_on': SwitchedOnEventData;
        'if.event.switched_off': SwitchedOffEventData;
        'if.event.score_displayed': ScoreDisplayedEventData;
        'if.action.inventory': InventoryEventData;
        'action.success': ActionSuccessData;
        'action.error': ActionErrorData;
    }
}
export {};
```

### validation/command-validator

```typescript
/**
 * Command Validator
 *
 * Validates parsed commands against the world model
 * Resolves entities and checks preconditions
 */
import type { ISystemEvent, IGenericEventSource, Result } from '@sharpee/core';
import type { IParsedCommand, INounPhrase, IValidatedObjectReference, IValidationError, WorldModel } from '@sharpee/world-model';
import type { ValidatedCommand } from './types';
import { ActionRegistry } from '../actions/registry';
import { ScopeResolver, ScopeLevel } from '../scope/types';
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
    resolveWithSelection(command: IParsedCommand, selections: EntitySelections): Result<ValidatedCommand, IValidationError>;
}
/**
 * Enhanced command validator with full entity resolution
 */
export declare class CommandValidator implements CommandValidator {
    private world;
    private actionRegistry;
    private scopeResolver;
    private systemEvents?;
    /** Current action ID being validated (for disambiguation scoring) */
    private currentActionId?;
    constructor(world: WorldModel, actionRegistry: ActionRegistry, scopeResolver?: ScopeResolver);
    /**
     * Set system event source for debug events
     */
    setSystemEventSource(eventSource: IGenericEventSource<ISystemEvent> | undefined): void;
    /**
     * Resolve an entity reference with full matching logic
     */
    private resolveEntity;
    /**
     * Find candidate entities by name, type, or synonym for a given search term.
     * Returns deduplicated results.
     */
    private findCandidatesByTerm;
    /**
     * Get entities by exact name match
     */
    private getEntitiesByName;
    /**
     * Get entities by type
     */
    private getEntitiesByType;
    /**
     * Get entities by synonym
     */
    private getEntitiesBySynonym;
    /**
     * Get entities by adjective (fallback for "press yellow" style commands)
     * When no name/alias match exists, find entities where the search term is an adjective
     */
    private getEntitiesByAdjective;
    /**
     * Filter entities by scope level
     */
    private filterByScope;
    /**
     * Score entities against a reference
     */
    private scoreEntities;
    /**
     * Resolve ambiguity between multiple matches
     */
    private resolveAmbiguity;
    /**
     * Resolve an entity directly by ID
     * Used after disambiguation when user selects a specific entity
     */
    resolveEntityById(entityId: string, parsed: INounPhrase): IValidatedObjectReference | null;
    /**
     * Check if entity is visible to player
     */
    private isEntityVisible;
    /**
     * Check if entity is reachable by player
     */
    private isEntityReachable;
    /**
     * Check if entity is touchable by player
     */
    private isEntityTouchable;
    /**
     * Check if entity is in player's inventory
     */
    private isInPlayerInventory;
    /**
     * Check if entity meets required scope level
     */
    private checkEntityScope;
    /**
     * Get which senses can perceive an entity
     */
    private getPerceivedSenses;
    /**
     * Get entity display name
     */
    private getEntityName;
    /**
     * Get entity description
     */
    private getEntityDescription;
    /**
     * Get entity adjectives
     */
    private getEntityAdjectives;
    /**
     * Get entity synonyms
     */
    private getEntitySynonyms;
    /**
     * Get action metadata
     */
    private getActionMetadata;
    /**
     * Check action-specific preconditions
     */
    private checkActionPreconditions;
    /**
     * Emit a debug event
     */
    private emitDebugEvent;
}
```

### validation/types

```typescript
/**
 * Enhanced validation types for stdlib
 *
 * Extends the core validation types with scope information
 */
import type { IValidatedCommand as CoreValidatedCommand } from '@sharpee/world-model';
import type { ScopeLevel, SenseType } from '../scope/types';
/**
 * Scope information for validated objects
 */
export interface ScopeInfo {
    /** The scope level of the entity */
    level: ScopeLevel;
    /** Which senses can perceive the entity */
    perceivedBy: SenseType[];
}
/**
 * Extended validated command with scope information
 */
export interface ValidatedCommand extends CoreValidatedCommand {
    /** Scope information for resolved entities */
    scopeInfo?: {
        /** Scope info for direct object */
        directObject?: ScopeInfo;
        /** Scope info for indirect object */
        indirectObject?: ScopeInfo;
        /** Scope info for instrument (ADR-080) */
        instrument?: ScopeInfo;
    };
}
/**
 * Extended validation error codes
 */
export type ValidationErrorCode = 'ENTITY_NOT_FOUND' | 'ENTITY_NOT_VISIBLE' | 'ENTITY_NOT_REACHABLE' | 'ENTITY_NOT_AUDIBLE' | 'ENTITY_NOT_DETECTABLE' | 'NOT_CARRIED' | 'ACTION_NOT_AVAILABLE' | 'PRECONDITION_FAILED' | 'NO_PLAYER' | 'AMBIGUOUS_ENTITY';
```

### vocabulary/standard-english

```typescript
/**
 * Standard English vocabulary for Sharpee
 *
 * This provides the base vocabulary for standard IF commands
 */
import { VerbVocabulary, DirectionVocabulary, SpecialVocabulary } from '../parser';
/**
 * Standard verb vocabulary
 */
export declare const standardVerbs: VerbVocabulary[];
/**
 * Standard direction vocabulary
 */
export declare const standardDirections: DirectionVocabulary[];
/**
 * Special vocabulary
 */
export declare const specialVocabulary: SpecialVocabulary;
/**
 * Common prepositions
 */
export declare const commonPrepositions: string[];
/**
 * Register all standard vocabulary
 */
export declare function registerStandardVocabulary(): void;
```

### capabilities

```typescript
/**
 * Standard capabilities for the Sharpee stdlib
 *
 * These capabilities provide common game state management patterns
 * that don't naturally fit in the entity-relationship model.
 */
import { ScoringCapabilitySchema, ScoringData } from './scoring';
import { SaveRestoreCapabilitySchema, SaveRestoreData, SaveData } from './save-restore';
import { ConversationCapabilitySchema, ConversationData, ConversationStateData } from './conversation';
import { GameMetaCapabilitySchema, GameMetaData } from './game-meta';
import { CommandHistoryCapabilitySchema, CommandHistoryData, CommandHistoryEntry } from './command-history';
import { DebugCapabilitySchema, DebugData, DEBUG_CAPABILITY, isAnyDebugEnabled, createDefaultDebugData } from './debug';
export { ScoringCapabilitySchema, ScoringData, SaveRestoreCapabilitySchema, SaveRestoreData, SaveData, ConversationCapabilitySchema, ConversationData, ConversationStateData, GameMetaCapabilitySchema, GameMetaData, CommandHistoryCapabilitySchema, CommandHistoryData, CommandHistoryEntry, DebugCapabilitySchema, DebugData, DEBUG_CAPABILITY, isAnyDebugEnabled, createDefaultDebugData };
/**
 * Map of standard capability names to their schemas
 */
export declare const StandardCapabilitySchemas: {
    readonly scoring: import("@sharpee/world-model").ICapabilitySchema;
    readonly saveRestore: import("@sharpee/world-model").ICapabilitySchema;
    readonly conversation: import("@sharpee/world-model").ICapabilitySchema;
    readonly gameMeta: import("@sharpee/world-model").ICapabilitySchema;
    readonly commandHistory: import("@sharpee/world-model").ICapabilitySchema;
    readonly debug: import("@sharpee/world-model").ICapabilitySchema;
};
/**
 * Helper to register all standard capabilities
 * @param world The world model to register capabilities on
 * @param capabilities Array of capability names to register (defaults to all)
 */
export declare function registerStandardCapabilities(world: {
    registerCapability: (name: string, reg: any) => void;
}, capabilities?: string[]): void;
```

### query-handlers/quit-handler

```typescript
/**
 * Quit Query Handler
 *
 * Handles responses to quit confirmation queries.
 * Works with the platform events system to emit appropriate events.
 */
import { IQueryHandler, IPendingQuery, IQueryResponse } from '@sharpee/core';
/**
 * Handler for quit confirmation queries
 */
export declare class QuitQueryHandler implements IQueryHandler {
    private eventSource;
    /**
     * Check if this handler can process the query
     */
    canHandle(query: IPendingQuery): boolean;
    /**
     * Process the player's response
     */
    handleResponse(response: IQueryResponse, query: IPendingQuery): void;
    /**
     * Handle query timeout
     */
    handleTimeout(query: IPendingQuery): void;
    /**
     * Handle query cancellation
     */
    handleCancel(query: IPendingQuery): void;
    /**
     * Get the event source
     */
    getEventSource(): import("@sharpee/core").ISemanticEventSource;
    /**
     * Create a semantic event
     */
    private createEvent;
}
/**
 * Create a quit query handler instance
 */
export declare function createQuitQueryHandler(): QuitQueryHandler;
```

### query-handlers/restart-handler

```typescript
/**
 * Restart Query Handler
 *
 * Handles responses to restart confirmation queries.
 * Works with the platform events system to emit appropriate events.
 */
import { IQueryHandler, IPendingQuery, IQueryResponse } from '@sharpee/core';
/**
 * Handler for restart confirmation queries
 */
export declare class RestartQueryHandler implements IQueryHandler {
    private eventSource;
    /**
     * Check if this handler can process the query
     */
    canHandle(query: IPendingQuery): boolean;
    /**
     * Process the player's response
     */
    handleResponse(response: IQueryResponse, query: IPendingQuery): void;
    /**
     * Handle query timeout
     */
    handleTimeout(query: IPendingQuery): void;
    /**
     * Handle query cancellation
     */
    handleCancel(query: IPendingQuery): void;
    /**
     * Get the event source
     */
    getEventSource(): import("@sharpee/core").ISemanticEventSource;
    /**
     * Create a semantic event
     */
    private createEvent;
}
/**
 * Create a restart query handler instance
 */
export declare function createRestartQueryHandler(): RestartQueryHandler;
```

### scope/types

```typescript
/**
 * Core types for the scope system
 */
import { IFEntity } from '@sharpee/world-model';
/**
 * Levels of scope indicating how an entity can be perceived.
 *
 * Ordered from least accessible (UNAWARE=0) to most accessible (CARRIED=4).
 * Higher values imply all lower levels are also satisfied.
 * Use numeric comparisons: if (entityScope >= requiredScope) { ... }
 *
 * For actions that check scope, use ActionContext.requireScope() which
 * returns appropriate error messages for scope failures.
 */
export declare enum ScopeLevel {
    /** Entity not known to player at all */
    UNAWARE = 0,
    /** Player knows entity exists (can think about, ask about, remember) */
    AWARE = 1,
    /** Can see with eyes (examine, look at, read) */
    VISIBLE = 2,
    /** Can physically touch/manipulate (take, push, open, touch) */
    REACHABLE = 3,
    /** In actor's inventory - always accessible (drop, eat, wear, insert) */
    CARRIED = 4
}
/**
 * @deprecated Use ScopeLevel instead. These string values are for backwards compatibility.
 */
export declare const ScopeLevelStrings: {
    readonly CARRIED: "carried";
    readonly REACHABLE: "reachable";
    readonly VISIBLE: "visible";
    readonly AUDIBLE: "audible";
    readonly DETECTABLE: "detectable";
    readonly OUT_OF_SCOPE: "out_of_scope";
};
/**
 * Types of sensory perception
 */
export declare enum SenseType {
    /** Visual perception - blocked by opaque barriers, needs light */
    SIGHT = "sight",
    /** Auditory perception - travels through some barriers */
    HEARING = "hearing",
    /** Olfactory perception - needs air path */
    SMELL = "smell",
    /** Tactile perception - requires physical contact */
    TOUCH = "touch",
    /** Supernatural/psychic perception - game-specific */
    VIBE = "vibe"
}
/**
 * Determines what entities are in scope for an actor
 */
export interface ScopeResolver {
    /**
     * Get the highest level of scope for a target entity
     */
    getScope(actor: IFEntity, target: IFEntity): ScopeLevel;
    /**
     * Check if actor can see the target
     */
    canSee(actor: IFEntity, target: IFEntity): boolean;
    /**
     * Check if actor can physically reach the target
     */
    canReach(actor: IFEntity, target: IFEntity): boolean;
    /**
     * Check if actor can hear the target or sounds from it
     */
    canHear(actor: IFEntity, target: IFEntity): boolean;
    /**
     * Check if actor can smell the target
     */
    canSmell(actor: IFEntity, target: IFEntity): boolean;
    /**
     * Get all entities visible to the actor
     */
    getVisible(actor: IFEntity): IFEntity[];
    /**
     * Get all entities reachable by the actor
     */
    getReachable(actor: IFEntity): IFEntity[];
    /**
     * Get all entities the actor can hear
     */
    getAudible(actor: IFEntity): IFEntity[];
}
/**
 * Tracks what actors know about based on what they've witnessed
 */
export interface WitnessSystem {
    /**
     * Record who can witness a state change
     */
    recordWitnesses(change: StateChange): WitnessRecord;
    /**
     * Update actor knowledge based on what was witnessed
     */
    updateKnowledge(record: WitnessRecord): void;
    /**
     * Get what an actor knows about
     */
    getKnownEntities(actorId: string): EntityKnowledge[];
    /**
     * Check if an actor has discovered an entity
     */
    hasDiscovered(actorId: string, entityId: string): boolean;
    /**
     * Get what an actor knows about a specific entity
     */
    getKnowledge(actorId: string, entityId: string): EntityKnowledge | undefined;
}
/**
 * Represents a change in world state that can be witnessed
 */
export interface StateChange {
    type: 'move' | 'create' | 'destroy' | 'modify' | 'action';
    entityId: string;
    actorId?: string;
    timestamp: number;
    from?: string;
    to?: string;
    property?: string;
    oldValue?: any;
    newValue?: any;
    action?: string;
    target?: string;
}
/**
 * Record of who witnessed what and how
 */
export interface WitnessRecord {
    change: StateChange;
    witnesses: Map<string, WitnessDetail>;
}
/**
 * Details about how an actor witnessed something
 */
export interface WitnessDetail {
    actorId: string;
    sense: SenseType;
    level: WitnessLevel;
    confidence: 'certain' | 'likely' | 'unsure';
}
/**
 * Level of detail in witnessing
 */
export declare enum WitnessLevel {
    /** Saw/heard/sensed everything clearly */
    FULL = "full",
    /** Saw/heard/sensed some but not all details */
    PARTIAL = "partial",
    /** Caught a glimpse or hint */
    PERIPHERAL = "peripheral",
    /** Deduced from evidence rather than direct perception */
    INFERRED = "inferred"
}
/**
 * What an actor knows about an entity
 */
export interface EntityKnowledge {
    entityId: string;
    exists: boolean;
    lastSeen?: number;
    lastKnownLocation?: string;
    visualProperties?: Map<string, any>;
    lastHeard?: number;
    heardFrom?: string;
    lastSmelled?: number;
    scentStrength?: 'faint' | 'moderate' | 'strong';
    discoveredAt: number;
    discoveredBy: SenseType;
    movementHistory?: MovementRecord[];
}
/**
 * Record of witnessed movement
 */
export interface MovementRecord {
    from: string;
    to: string;
    witnessedAt: number;
    witnessedBy: SenseType;
    confidence: 'certain' | 'likely' | 'unsure';
}
/**
 * Witness event types - all data, no narrative text
 */
export interface WitnessActionEvent {
    type: 'if.witness.action';
    data: {
        witnessId: string;
        sense: SenseType;
        level: WitnessLevel;
        action: string;
        actorId: string;
        targetId?: string;
        fromLocation?: string;
        toLocation?: string;
        timestamp: number;
    };
}
export interface WitnessMovementEvent {
    type: 'if.witness.movement';
    data: {
        witnessId: string;
        sense: SenseType;
        level: WitnessLevel;
        entityId: string | 'unknown';
        fromLocation: string;
        toLocation: string;
        direction?: string;
        timestamp: number;
    };
}
export interface WitnessSoundEvent {
    type: 'if.witness.sound';
    data: {
        witnessId: string;
        sense: SenseType;
        soundType: string;
        intensity: 'faint' | 'moderate' | 'loud';
        fromDirection?: string;
        estimatedLocation?: string;
        timestamp: number;
    };
}
export interface WitnessScentEvent {
    type: 'if.witness.scent';
    data: {
        witnessId: string;
        sense: SenseType;
        scentType: string;
        intensity: 'faint' | 'moderate' | 'strong';
        fromDirection?: string;
        characteristics?: string[];
        timestamp: number;
    };
}
export type WitnessEvent = WitnessActionEvent | WitnessMovementEvent | WitnessSoundEvent | WitnessScentEvent;
```

### scope/scope-resolver

```typescript
/**
 * @file Standard Scope Resolver
 * @description Determines what entities are physically perceivable by actors
 * based on IF conventions and physical laws (sight, hearing, smell, touch).
 *
 * Pipeline role: VALIDATION PHASE — used by CommandValidator to resolve entity
 * references from parsed noun phrases, filter by scope level, score candidates
 * for disambiguation, and attribute sensory perception. Also used by
 * ActionContext (canSee/canReach) during action execution.
 *
 * NOT the same as the world-model's RuleScopeEvaluator (rule-based pre-parse
 * vocabulary) or the parser's GrammarScopeResolver (grammar constraint
 * evaluation during parsing).
 */
import { IFEntity, WorldModel } from '@sharpee/world-model';
import { ScopeLevel, ScopeResolver } from './types';
/**
 * Standard implementation of scope resolution for IF games
 */
export declare class StandardScopeResolver implements ScopeResolver {
    private world;
    constructor(world: WorldModel);
    /**
     * Get the highest level of scope for a target entity.
     *
     * Returns numeric ScopeLevel values for easy comparison:
     * - CARRIED (4) > REACHABLE (3) > VISIBLE (2) > AWARE (1) > UNAWARE (0)
     *
     * Note: AUDIBLE and DETECTABLE (smell) map to AWARE for the numeric hierarchy,
     * since being able to hear or smell something means you're aware of it but
     * may not be able to see or touch it.
     *
     * This method also considers author-set minimum scope levels via
     * entity.setMinimumScope(). The returned scope is the maximum of the
     * physical scope and the minimum scope (additive only).
     */
    getScope(actor: IFEntity, target: IFEntity): ScopeLevel;
    /**
     * Calculate physical scope based on spatial relationships and perception.
     * This is the "natural" scope without author overrides.
     */
    private calculatePhysicalScope;
    /**
     * Check if actor can see the target.
     * Delegates to VisibilityBehavior via WorldModel for canonical visibility
     * logic (darkness, transparent containers, SceneryTrait, capabilities).
     */
    canSee(actor: IFEntity, target: IFEntity): boolean;
    /**
     * Check if actor can physically reach the target
     */
    canReach(actor: IFEntity, target: IFEntity): boolean;
    /**
     * Check if actor can hear the target
     */
    canHear(actor: IFEntity, target: IFEntity): boolean;
    /**
     * Check if actor can smell the target
     */
    canSmell(actor: IFEntity, target: IFEntity): boolean;
    /**
     * Get all entities visible to the actor.
     * Includes entities with minimum scope >= VISIBLE.
     */
    getVisible(actor: IFEntity): IFEntity[];
    /**
     * Get all entities reachable by the actor.
     * Includes entities with minimum scope >= REACHABLE.
     */
    getReachable(actor: IFEntity): IFEntity[];
    /**
     * Get all entities the actor can hear.
     * Includes entities with minimum scope >= AWARE.
     */
    getAudible(actor: IFEntity): IFEntity[];
    /**
     * Check if target is in actor's inventory
     */
    private isCarried;
    /**
     * Get the room containing an entity
     */
    private getContainingRoom;
    /**
     * Check if two rooms are connected by a door
     */
    private getRoomConnection;
    /**
     * Check if an entity has a scent
     */
    private hasScent;
    /**
     * Check if entity is inside any closed container
     */
    private isInClosedContainer;
}
/**
 * Create a standard scope resolver
 */
export declare function createScopeResolver(world: WorldModel): ScopeResolver;
```

### scope/witness-system

```typescript
/**
 * Witness system implementation
 *
 * Tracks what actors know about based on what they've witnessed.
 * Works with the scope system to determine who can perceive changes
 * and updates their knowledge accordingly.
 */
import { WorldModel } from '@sharpee/world-model';
import { WitnessSystem, StateChange, WitnessRecord, EntityKnowledge, ScopeResolver } from './types';
/**
 * Standard implementation of the witness system
 */
export declare class StandardWitnessSystem implements WitnessSystem {
    private world;
    private scopeResolver;
    private knowledge;
    constructor(world: WorldModel, scopeResolver: ScopeResolver);
    /**
     * Record who can witness a state change
     */
    recordWitnesses(change: StateChange): WitnessRecord;
    /**
     * Update actor knowledge based on what was witnessed
     */
    updateKnowledge(record: WitnessRecord): void;
    /**
     * Get what an actor knows about
     */
    getKnownEntities(actorId: string): EntityKnowledge[];
    /**
     * Check if an actor has discovered an entity
     */
    hasDiscovered(actorId: string, entityId: string): boolean;
    /**
     * Get what an actor knows about a specific entity
     */
    getKnowledge(actorId: string, entityId: string): EntityKnowledge | undefined;
    /**
     * Determine if and how an actor can witness a change
     */
    private canWitnessChange;
    /**
     * Determine the level of detail in witnessing
     */
    private determineWitnessLevel;
    /**
     * Update knowledge from witnessed movement
     */
    private updateMovementKnowledge;
    /**
     * Update knowledge from witnessed creation/discovery
     */
    private updateDiscoveryKnowledge;
    /**
     * Update knowledge from witnessed destruction
     */
    private updateDestructionKnowledge;
    /**
     * Update knowledge from witnessed modification
     */
    private updateModificationKnowledge;
    /**
     * Update knowledge from witnessed action
     */
    private updateActionKnowledge;
    /**
     * Create initial knowledge entry for an entity
     */
    private createInitialKnowledge;
    /**
     * Update sense-specific timestamps
     */
    private updateSenseTimestamps;
    /**
     * Emit appropriate witness event based on change type
     */
    private emitWitnessEvent;
    /**
     * Calculate direction of movement
     */
    private getDirection;
}
```

### services/PerceptionService

```typescript
/**
 * PerceptionService - Filters events based on what the player can perceive
 *
 * This service sits between action execution and the text service, transforming
 * events that describe things the player cannot perceive (due to darkness,
 * blindness, etc.) into appropriate alternative events.
 *
 * @see ADR-069 Perception-Based Event Filtering
 */
import { ISemanticEvent } from '@sharpee/core';
import { IFEntity, IWorldModel } from '@sharpee/world-model';
export type { Sense, PerceptionBlockReason, PerceptionBlockedData, IPerceptionService, } from '@sharpee/if-services';
import type { Sense, IPerceptionService } from '@sharpee/if-services';
/**
 * Default implementation of IPerceptionService
 *
 * Filters events based on environmental and actor state:
 * - Darkness (room is dark, no light source)
 * - Blindness (future: actor has blind trait)
 * - Blindfold (future: actor wearing something over eyes)
 */
export declare class PerceptionService implements IPerceptionService {
    /**
     * Filter events based on what the actor can perceive.
     *
     * Visual events (room descriptions, contents lists) are transformed
     * into perception-blocked events when the player cannot see.
     */
    filterEvents(events: ISemanticEvent[], actor: IFEntity, world: IWorldModel): ISemanticEvent[];
    /**
     * Check if an actor can perceive using a specific sense.
     */
    canPerceive(actor: IFEntity, location: IFEntity, world: IWorldModel, sense: Sense): boolean;
    /**
     * Check if actor can see in the given location.
     *
     * Checks (in order):
     * 1. Actor blindness trait
     * 2. Actor wearing blindfold
     * 3. Location darkness (via VisibilityBehavior)
     */
    private canSeeVisually;
    /**
     * Check if actor can hear. Currently always true (future extension point).
     */
    private canHear;
    /**
     * Check if actor can smell. Currently always true (future extension point).
     */
    private canSmell;
    /**
     * Check if actor can touch. Currently always true (future extension point).
     */
    private canTouch;
    /**
     * Check if an actor has a blindness trait.
     */
    private isBlind;
    /**
     * Check if an actor is wearing something that blocks vision.
     */
    private isWearingBlindfold;
    /**
     * Get the room an actor is currently in.
     */
    private getActorRoom;
    /**
     * Check if an event requires visual perception.
     */
    private isVisualEvent;
    /**
     * Create a perception-blocked event to replace a filtered event.
     */
    private createPerceptionBlockedEvent;
    /**
     * Determine why perception is blocked.
     */
    private getBlockReason;
}
```

### npc/types

```typescript
/**
 * NPC System Types (ADR-070)
 *
 * Types for NPC behaviors and actions.
 */
import { ISemanticEvent, EntityId, SeededRandom } from '@sharpee/core';
import { IFEntity, WorldModel, DirectionType } from '@sharpee/world-model';
/**
 * Context passed to NPC behavior hooks
 */
export interface NpcContext {
    /** The NPC entity */
    npc: IFEntity;
    /** The world model */
    world: WorldModel;
    /** Seeded random number generator */
    random: SeededRandom;
    /** Current turn number */
    turnCount: number;
    /** Player's current location */
    playerLocation: EntityId;
    /** NPC's current location */
    npcLocation: EntityId;
    /** Items in NPC's inventory */
    npcInventory: IFEntity[];
    /** Whether the player is in the same room as the NPC */
    playerVisible: boolean;
    /** Get entities in the NPC's current room */
    getEntitiesInRoom(): IFEntity[];
    /** Get exits from the NPC's current room */
    getAvailableExits(): {
        direction: DirectionType;
        destination: EntityId;
    }[];
}
/**
 * Actions an NPC can take
 *
 * All actions use semantic data (message IDs, entity IDs) rather than raw text.
 */
export type NpcAction = {
    type: 'move';
    direction: DirectionType;
} | {
    type: 'moveTo';
    roomId: EntityId;
} | {
    type: 'take';
    target: EntityId;
} | {
    type: 'drop';
    target: EntityId;
} | {
    type: 'attack';
    target: EntityId;
} | {
    type: 'speak';
    messageId: string;
    data?: Record<string, unknown>;
} | {
    type: 'emote';
    messageId: string;
    data?: Record<string, unknown>;
} | {
    type: 'wait';
} | {
    type: 'custom';
    handler: () => ISemanticEvent[];
};
/**
 * NPC behavior interface
 *
 * Defines hooks that are called at various points during the game.
 * Each hook returns an array of NpcActions to be executed.
 */
export interface NpcBehavior {
    /** Unique identifier for this behavior */
    id: string;
    /** Human-readable name for debugging */
    name?: string;
    /**
     * Called each turn for this NPC
     * This is the main hook for autonomous NPC behavior.
     */
    onTurn(context: NpcContext): NpcAction[];
    /**
     * Called when the player enters the NPC's room
     */
    onPlayerEnters?(context: NpcContext): NpcAction[];
    /**
     * Called when the player leaves the NPC's room
     */
    onPlayerLeaves?(context: NpcContext): NpcAction[];
    /**
     * Called when the player speaks to/at the NPC
     */
    onSpokenTo?(context: NpcContext, words: string): NpcAction[];
    /**
     * Called when the NPC is attacked
     */
    onAttacked?(context: NpcContext, attacker: IFEntity): NpcAction[];
    /**
     * Called when the NPC observes a player action
     */
    onObserve?(context: NpcContext, actionType: string, actionData: unknown): NpcAction[];
    /**
     * Optional: Get serializable state for save/load
     */
    getState?(npc: IFEntity): Record<string, unknown>;
    /**
     * Optional: Restore state after load
     */
    setState?(npc: IFEntity, state: Record<string, unknown>): void;
}
/**
 * Events emitted by NPC actions
 */
export interface NpcEvent extends ISemanticEvent {
    type: 'npc.moved' | 'npc.spoke' | 'npc.took' | 'npc.dropped' | 'npc.attacked' | 'npc.emoted' | 'npc.died' | 'npc.stateChanged';
}
/**
 * Data for NPC movement events
 */
export interface NpcMovedData {
    npc: EntityId;
    from: EntityId;
    to: EntityId;
    direction?: DirectionType;
}
/**
 * Data for NPC speech events
 */
export interface NpcSpokeData {
    npc: EntityId;
    messageId: string;
    data?: Record<string, unknown>;
}
/**
 * Data for NPC item manipulation events
 */
export interface NpcItemData {
    npc: EntityId;
    target: EntityId;
}
/**
 * Data for NPC emote events
 */
export interface NpcEmoteData {
    npc: EntityId;
    messageId: string;
    data?: Record<string, unknown>;
}
/**
 * Result of NPC combat
 */
export interface NpcCombatData {
    npc: EntityId;
    target: EntityId;
    hit: boolean;
    damage: number;
    targetKilled: boolean;
}
```

### npc/npc-messages

```typescript
/**
 * NPC Message IDs (ADR-070)
 *
 * Semantic message IDs for NPC-related events.
 * Actual text is provided by the language layer.
 */
/**
 * Message IDs for NPC events
 */
export declare const NpcMessages: {
    readonly NPC_ENTERS: "npc.enters";
    readonly NPC_LEAVES: "npc.leaves";
    readonly NPC_ARRIVES: "npc.arrives";
    readonly NPC_DEPARTS: "npc.departs";
    readonly NPC_NOTICES_PLAYER: "npc.notices_player";
    readonly NPC_IGNORES_PLAYER: "npc.ignores_player";
    readonly NPC_TAKES: "npc.takes";
    readonly NPC_DROPS: "npc.drops";
    readonly NPC_FOLLOWS: "npc.follows";
    readonly GUARD_BLOCKS: "npc.guard.blocks";
    readonly GUARD_ATTACKS: "npc.guard.attacks";
    readonly GUARD_DEFEATED: "npc.guard.defeated";
    readonly NPC_ATTACKS: "npc.attacks";
    readonly NPC_MISSES: "npc.misses";
    readonly NPC_HITS: "npc.hits";
    readonly NPC_KILLED: "npc.killed";
    readonly NPC_UNCONSCIOUS: "npc.unconscious";
    readonly NPC_SPEAKS: "npc.speaks";
    readonly NPC_SHOUTS: "npc.shouts";
    readonly NPC_WHISPERS: "npc.whispers";
    readonly NPC_MUTTERS: "npc.mutters";
    readonly NPC_LAUGHS: "npc.laughs";
    readonly NPC_GROWLS: "npc.growls";
    readonly NPC_CRIES: "npc.cries";
    readonly NPC_SIGHS: "npc.sighs";
    readonly NPC_GREETS: "npc.greets";
    readonly NPC_FAREWELL: "npc.farewell";
    readonly NPC_NO_RESPONSE: "npc.no_response";
    readonly NPC_CONFUSED: "npc.confused";
};
/**
 * Type for NPC message IDs
 */
export type NpcMessageId = (typeof NpcMessages)[keyof typeof NpcMessages];
```

### npc/character-messages

```typescript
/**
 * Character model message IDs (ADR-141)
 *
 * Semantic message IDs for character state change events.
 * Actual text is provided by the language layer.
 *
 * Public interface: CharacterMessages const, CharacterMessageId type.
 * Owner context: stdlib / npc
 */
/**
 * Message IDs for character model state change events.
 *
 * These are emitted as observable behavior events when an NPC's
 * cognitive or emotional state changes. Silent by default — authors
 * opt in per NPC to surface them to the player.
 */
export declare const CharacterMessages: {
    readonly LUCIDITY_SHIFT: "npc.character.lucidity_shift";
    readonly LUCIDITY_BASELINE_RESTORED: "npc.character.lucidity_baseline_restored";
    readonly HALLUCINATION_ONSET: "npc.character.hallucination_onset";
    readonly MOOD_CHANGED: "npc.character.mood_changed";
    readonly THREAT_CHANGED: "npc.character.threat_changed";
    readonly DISPOSITION_CHANGED: "npc.character.disposition_changed";
    readonly FACT_LEARNED: "npc.character.fact_learned";
};
/**
 * Type for character model message IDs.
 */
export type CharacterMessageId = (typeof CharacterMessages)[keyof typeof CharacterMessages];
```

### npc/npc-service

```typescript
/**
 * NPC Service (ADR-070)
 *
 * Manages NPC behaviors, executes NPC actions, and handles the NPC turn phase.
 */
import { ISemanticEvent, EntityId, SeededRandom } from '@sharpee/core';
import { IFEntity, WorldModel } from '@sharpee/world-model';
import { NpcBehavior } from './types';
/**
 * NPC Combat Resolver function type.
 *
 * Stories register a resolver to handle NPC→target combat resolution.
 * Without a resolver, NPC attack actions emit a bare `npc.attacked` event
 * with no combat resolution (no damage, no death).
 */
export type NpcCombatResolver = (npc: IFEntity, target: IFEntity, world: WorldModel, random: SeededRandom) => ISemanticEvent[];
/**
 * Register an NPC combat resolver.
 *
 * Call this in your story's initializeWorld() to provide combat resolution
 * for NPC attack actions. Without a resolver, NPC attacks produce bare events.
 *
 * @param resolver - Function that resolves NPC→target combat and returns events
 */
export declare function registerNpcCombatResolver(resolver: NpcCombatResolver): void;
/**
 * Clear the NPC combat resolver. Used for testing cleanup.
 */
export declare function clearNpcCombatResolver(): void;
/**
 * Context for NPC tick (simplified version of SchedulerContext)
 */
export interface NpcTickContext {
    world: WorldModel;
    turn: number;
    random: SeededRandom;
    playerLocation: EntityId;
    playerId: EntityId;
}
/**
 * NPC Service interface
 */
export interface INpcService {
    /** Register a behavior for use by NPCs */
    registerBehavior(behavior: NpcBehavior): void;
    /** Remove a behavior */
    removeBehavior(id: string): void;
    /** Get a behavior by ID */
    getBehavior(id: string): NpcBehavior | undefined;
    /** Execute the NPC turn phase */
    tick(context: NpcTickContext): ISemanticEvent[];
    /** Notify NPCs that player entered a room */
    onPlayerEnters(world: WorldModel, roomId: EntityId, random: SeededRandom, turn: number): ISemanticEvent[];
    /** Notify NPCs that player left a room */
    onPlayerLeaves(world: WorldModel, roomId: EntityId, random: SeededRandom, turn: number): ISemanticEvent[];
    /** Handle player speaking to an NPC */
    onPlayerSpeaks(world: WorldModel, npcId: EntityId, words: string, random: SeededRandom, turn: number): ISemanticEvent[];
    /** Handle player attacking an NPC */
    onNpcAttacked(world: WorldModel, npcId: EntityId, attackerId: EntityId, random: SeededRandom, turn: number): ISemanticEvent[];
}
/**
 * NPC Service implementation
 */
export declare class NpcService implements INpcService {
    private behaviors;
    registerBehavior(behavior: NpcBehavior): void;
    removeBehavior(id: string): void;
    getBehavior(id: string): NpcBehavior | undefined;
    /**
     * Execute the NPC turn phase
     */
    tick(context: NpcTickContext): ISemanticEvent[];
    /**
     * Notify NPCs that player entered a room
     */
    onPlayerEnters(world: WorldModel, roomId: EntityId, random: SeededRandom, turn: number): ISemanticEvent[];
    /**
     * Notify NPCs that player left a room
     */
    onPlayerLeaves(world: WorldModel, roomId: EntityId, random: SeededRandom, turn: number): ISemanticEvent[];
    /**
     * Handle player speaking to an NPC
     */
    onPlayerSpeaks(world: WorldModel, npcId: EntityId, words: string, random: SeededRandom, turn: number): ISemanticEvent[];
    /**
     * Handle player attacking an NPC
     */
    onNpcAttacked(world: WorldModel, npcId: EntityId, attackerId: EntityId, random: SeededRandom, turn: number): ISemanticEvent[];
    private getActiveNpcs;
    private getBehaviorForNpc;
    private createNpcContext;
    private getExitsFromRoom;
    private executeActions;
    private executeAction;
    private executeMove;
    private executeMoveTo;
    private executeTake;
    private executeDrop;
    private executeAttack;
}
/**
 * Create a new NPC Service instance
 */
export declare function createNpcService(): INpcService;
```

### npc/character-observer

```typescript
/**
 * Character observation handler (ADR-141)
 *
 * Processes events witnessed by NPCs through the cognitive profile filter
 * and updates character model state accordingly.
 *
 * Public interface: observeEvent(), DefaultStateTransitions.
 * Owner context: stdlib / npc
 */
import { ISemanticEvent, EntityId } from '@sharpee/core';
import { IFEntity, WorldModel, CharacterModelTrait } from '@sharpee/world-model';
/** A default state transition triggered by an event type. */
export interface StateTransitionRule {
    /** Event type pattern to match (exact string match). */
    eventType: string;
    /** Threat delta when this event is observed. */
    threatDelta?: number;
    /** Mood valence delta. */
    moodValenceDelta?: number;
    /** Mood arousal delta. */
    moodArousalDelta?: number;
    /**
     * Disposition delta toward the event's actor.
     * Only applied when the event has an actor entity.
     */
    dispositionDelta?: number;
}
/**
 * Default state transition rules.
 *
 * Stories can override by providing their own rules array
 * to observeEvent(). These are sensible defaults per ADR-141:
 * violence increases threat, gifts improve disposition, etc.
 */
export declare const DefaultStateTransitions: StateTransitionRule[];
/**
 * Filter an event through the NPC's cognitive profile.
 *
 * @param trait - The NPC's CharacterModelTrait
 * @param event - The incoming event
 * @returns 'pass' if the event should be processed, 'miss' if filtered out,
 *          'amplify' if the event should be processed with heightened impact
 */
export declare function filterPerception(trait: CharacterModelTrait, event: ISemanticEvent): 'pass' | 'miss' | 'amplify';
/**
 * Inject hallucinated facts for an NPC with augmented perception.
 *
 * Only injects when the NPC's current lucidity state matches
 * the perceived event's `when` condition.
 *
 * @param trait - The NPC's CharacterModelTrait
 * @param npcId - The NPC entity ID
 * @param turn - Current turn number
 * @returns Array of hallucination events (may be empty)
 */
export declare function injectHallucinations(trait: CharacterModelTrait, npcId: EntityId, turn: number): ISemanticEvent[];
/**
 * Process an event observed by an NPC through the character model.
 *
 * 1. Checks for CharacterModelTrait (returns early if absent — opt-in).
 * 2. Filters event through cognitive profile perception mode.
 * 3. Adds witnessed fact to knowledge.
 * 4. Applies default state transition rules.
 * 5. Checks lucidity triggers.
 * 6. Injects hallucinated facts (augmented perception).
 * 7. Emits observable behavior events for state changes.
 *
 * @param npc - The NPC entity
 * @param event - The observed event
 * @param world - The world model
 * @param turn - Current turn number
 * @param rules - State transition rules (defaults to DefaultStateTransitions)
 * @returns Array of observable behavior events emitted by state changes
 */
export declare function observeEvent(npc: IFEntity, event: ISemanticEvent, world: WorldModel, turn: number, rules?: StateTransitionRule[]): ISemanticEvent[];
```

### npc/lucidity-decay

```typescript
/**
 * Lucidity decay processing (ADR-141)
 *
 * End-of-turn processing for NPC lucidity windows.
 * When an NPC is in a lucid window with no sustaining trigger active,
 * lucidity decays and eventually returns to baseline.
 *
 * Public interface: processLucidityDecay(), DECAY_RATE_TURNS.
 * Owner context: stdlib / npc
 */
import { ISemanticEvent } from '@sharpee/core';
import { IFEntity, WorldModel, CharacterModelTrait, DecayRate } from '@sharpee/world-model';
/**
 * Maps decay rate words to number of turns before baseline is restored.
 * These are the window durations when no sustaining trigger is active.
 */
export declare const DECAY_RATE_TURNS: Record<DecayRate, number>;
/**
 * Process end-of-turn lucidity decay for a single NPC.
 *
 * If the NPC has a CharacterModelTrait with an active lucidity window,
 * decrements the window counter. When it reaches zero, the cognitive
 * profile returns to baseline and a LUCIDITY_BASELINE_RESTORED event
 * is emitted.
 *
 * If no lucidity config or no active window, returns empty array.
 *
 * @param npc - The NPC entity
 * @param world - The world model (unused in current impl, reserved for future)
 * @param turn - Current turn number (unused in current impl, reserved for future)
 * @returns Array of events emitted (baseline restored, or empty)
 */
export declare function processLucidityDecay(npc: IFEntity, world: WorldModel, turn: number): ISemanticEvent[];
/**
 * Initialize a lucidity window with the appropriate turn count
 * based on the NPC's configured decay rate.
 *
 * Call this when entering a lucidity state via a trigger, so the
 * window has the correct duration based on decayRate.
 *
 * @param trait - The NPC's CharacterModelTrait
 * @param targetState - The lucidity state to enter
 */
export declare function enterLucidityWindow(trait: CharacterModelTrait, targetState: string): void;
```

### npc/behaviors

```typescript
/**
 * Standard NPC Behaviors (ADR-070)
 *
 * Reusable behavior patterns for common NPC archetypes.
 * These are generic behaviors that can be used in any IF game.
 * Game-specific behaviors (thief, cyclops, etc.) should be defined in the story.
 */
import { NpcBehavior } from './types';
/**
 * Guard behavior - stationary NPC that blocks passage and fights back
 *
 * Guards:
 * - Don't move on their own
 * - Emit a blocking message when player enters
 * - Attack player each turn if hostile and engaged
 * - Counterattack when attacked
 */
export declare const guardBehavior: NpcBehavior;
/**
 * Wanderer behavior - NPC that moves randomly between rooms
 *
 * Wanderers:
 * - Move randomly with configurable probability
 * - Respect room restrictions
 * - Announce presence when entering player's room
 */
export declare function createWandererBehavior(options?: {
    /** Probability of moving each turn (0-1) */
    moveChance?: number;
    /** Whether to announce when entering player's room */
    announceEntry?: boolean;
}): NpcBehavior;
/**
 * Follower behavior - NPC that follows the player
 *
 * Followers:
 * - Stay with the player when possible
 * - Follow the player when they move
 * - Don't enter forbidden rooms
 */
export declare function createFollowerBehavior(options?: {
    /** Whether to follow immediately or wait a turn */
    immediate?: boolean;
    /** Message when following */
    followMessageId?: string;
}): NpcBehavior;
/**
 * Passive behavior - NPC that does nothing autonomously
 *
 * Useful as a base for NPCs that only react to player actions.
 */
export declare const passiveBehavior: NpcBehavior;
/**
 * Patrol behavior - NPC that moves along a fixed route
 */
export declare function createPatrolBehavior(options?: {
    /** Ordered list of room IDs to patrol */
    route: string[];
    /** Whether to reverse at the end or loop */
    loop?: boolean;
    /** Turns to wait at each waypoint */
    waitTurns?: number;
}): NpcBehavior;
```

### combat/weapon-utils

```typescript
/**
 * Weapon Utilities
 *
 * Helper functions for finding and evaluating weapons.
 * Combat resolution has moved to @sharpee/ext-basic-combat.
 */
import { IFEntity, WorldModel } from '@sharpee/world-model';
/**
 * Find the wielded weapon for an entity
 */
export declare function findWieldedWeapon(entity: IFEntity, world: WorldModel): IFEntity | undefined;
```

### chains

```typescript
/**
 * Event Chains - Standard Library Event Chain Handlers (ADR-094)
 *
 * Event chains define relationships between events where one event
 * automatically triggers the emission of related events. This provides
 * declarative event composition rather than imperative multi-emit in actions.
 *
 * Standard chains:
 * - opened → revealed: When a container opens, emit revealed for contents
 *
 * Stories can:
 * - Override standard chains using the chain keys
 * - Add story-specific chains with different priorities
 * - Use 'cascade' mode to add to stdlib chains
 *
 * @example
 * ```typescript
 * // Override stdlib opened→revealed with custom behavior
 * world.chainEvent('if.event.opened', myHandler, {
 *   key: OPENED_REVEALED_CHAIN_KEY,
 *   priority: 100
 * });
 *
 * // Add additional chain that fires after stdlib
 * world.chainEvent('if.event.opened', trapHandler, {
 *   key: 'story.chain.trap-trigger',
 *   priority: 200  // Fires after stdlib (100)
 * });
 * ```
 */
import { WorldModel } from '@sharpee/world-model';
/**
 * Register all standard library event chains with a WorldModel.
 *
 * This should be called during engine initialization, after the
 * EventProcessor has been connected to the WorldModel.
 *
 * @param world - The WorldModel to register chains with
 */
export declare function registerStandardChains(world: WorldModel): void;
export { OPENED_REVEALED_CHAIN_KEY } from './opened-revealed';
export { createOpenedRevealedChain } from './opened-revealed';
```

### inference/implicit-inference

```typescript
/**
 * Implicit Inference System (ADR-104)
 *
 * When a player uses a pronoun ("read it") and the resolved entity
 * doesn't meet the action's requirements, this system finds a valid
 * alternative target if exactly ONE exists in scope.
 *
 * CRITICAL: Inference ONLY triggers when pronouns are used.
 * Explicit nouns ("read mailbox") should fail with the normal error.
 */
import { IFEntity, WorldModel } from '@sharpee/world-model';
import { Action } from '../actions/enhanced-types';
/**
 * Result of attempting implicit inference
 */
export interface InferenceResult {
    /** Whether inference was performed */
    inferred: boolean;
    /** The original target entity */
    originalTarget: IFEntity;
    /** The inferred target entity (if inference succeeded) */
    inferredTarget?: IFEntity;
    /** Human-readable reason for inference (for debugging/messages) */
    reason?: string;
    /** Why inference failed (if it did) */
    failureReason?: 'not_pronoun' | 'no_requirements' | 'original_valid' | 'no_valid_targets' | 'multiple_valid_targets';
}
/**
 * Check if an entity meets an action's target requirements
 *
 * @param entity The entity to check
 * @param action The action with targetRequirements
 * @param world The world model (for condition checks)
 * @returns true if entity meets requirements
 */
export declare function meetsActionRequirements(entity: IFEntity, action: Action, world: WorldModel): boolean;
/**
 * Get all entities in scope that meet action requirements
 *
 * @param action The action to check requirements for
 * @param scope Entities currently in scope
 * @param world The world model
 * @returns Array of entities that meet requirements
 */
export declare function findValidTargets(action: Action, scope: IFEntity[], world: WorldModel): IFEntity[];
/**
 * Attempt implicit inference for a command
 *
 * This is the main entry point for the inference system.
 *
 * IMPORTANT: If a pronoun successfully resolved to a specific entity from
 * the pronoun context, we do NOT infer an alternative. The player clearly
 * intended to reference that entity. For example:
 *   - "get mat" sets "it" = mat
 *   - "read it" should fail with "nothing written on mat", NOT infer leaflet
 *
 * Inference is only appropriate when the pronoun resolution was ambiguous
 * or the player had no specific entity in mind.
 *
 * @param originalTarget The entity originally resolved (e.g., mailbox)
 * @param wasPronoun Whether a pronoun was used ("it", "them")
 * @param action The action being attempted
 * @param scope All entities currently in scope for the player
 * @param world The world model
 * @returns InferenceResult indicating whether a different target was inferred
 *
 * @example
 * // "read it" where "it" = mailbox (not readable)
 * const result = tryInferTarget(mailbox, true, readingAction, scopeEntities, world);
 * if (result.inferred) {
 *   // Use result.inferredTarget instead of mailbox
 * }
 */
export declare function tryInferTarget(originalTarget: IFEntity, wasPronoun: boolean, action: Action, scope: IFEntity[], world: WorldModel): InferenceResult;
```

### index

```typescript
/**
 * @sharpee/stdlib - Standard library for Sharpee IF Platform
 *
 * This package provides:
 * - Standard action implementations
 * - Command pattern definitions for parsing
 * - Command syntax definitions for help
 * - Language provider interface for text generation
 * - Parser and validation components
 * - Standard capability schemas
 *
 * All state changes go through events - no direct mutations
 */
export * from './actions';
export * from './events';
export * from './parser';
export * from './validation';
export * from './vocabulary';
export * from './capabilities';
export * from './query-handlers';
export * from './scope';
export * from './services';
export * from './npc';
export * from './combat';
export * from './chains';
export * from './inference';
```
