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
import { type ISemanticEvent, type RandomService } from '@sharpee/core';
import { IFEntity, WorldModel } from '@sharpee/world-model';
import { type ISound } from '@sharpee/if-domain';
import { ScopeResolver, ScopeLevel } from '../scope/types.js';
import { ValidatedCommand } from '../validation/types.js';
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
        /** Scope keys are a shared registered namespace — never prefixed (ADR-231 D1). */
        errorQualified?: boolean;
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
        /** True when `error` is a fully-qualified id (scope.* / cross-action keys — ADR-231 D1). */
        errorQualified?: boolean;
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
 * ADR-041 (Amendment 1): exactly one method creates events — `event(type, data)`.
 * There is deliberately no `emit()`/`emitSuccess()`/`emitError()`/`emitMany()`/
 * `createEvent()`. Everything else here is world querying or phase plumbing, not
 * a second event-creation path. The former `EnhancedActionContext` alias was
 * consolidated into this interface and removed (#141).
 */
export interface ActionContext {
    /**
     * Read-only access to the world model
     */
    readonly world: WorldModel;
    /**
     * The entity performing this action (ADR-328 D1).
     *
     * Every actor-relative helper on this context — `currentLocation`, the
     * scope checks, `event()`'s `entities.actor`, `emitSound`'s source — is
     * computed from this entity. For parser-driven commands it is the player;
     * for the programmatic entry (`CommandExecutor.executeAsActor`, ADR-328
     * D2) it is whichever actor the caller named.
     */
    readonly actor: IFEntity;
    /**
     * The player entity. Equal to `actor` for parser-driven commands; distinct
     * when a non-player actor is acting. Read this only when the logic is
     * genuinely about the player (scoring, second-person phrasing), never as a
     * stand-in for "who is acting" — that is `actor`.
     */
    readonly player: IFEntity;
    /**
     * The actor's current location
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
     * Dedicated action RNG stream (ADR-231 D6).
     *
     * The session's per-point stream owner (ADR-293). Every draw names a
     * declared `ChoicePoint`, and each point owns its own stream derived
     * from the master seed — no other point's draws can shift its rolls,
     * and every drawn point's state rides the save.
     *
     * Contract: actions draw ALL randomness through this service with a
     * declared point — never `Math.random()`, never a hand-built stream
     * (D6). World-model behaviors that need randomness keep taking a bare
     * `SeededRandom` parameter; callers reach one only through
     * `random.resolve(point, sample, materialize)`'s sample callback (D2).
     */
    readonly random: RandomService;
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
     * eliminating the need for context pollution patterns like `context['_previousLocation']`.
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
     * behavior.execute(entity, context.world, context.actor.id);
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
     *
     * @param at - Where the fact happened, when that is not where the actor
     *   stood as the action began (ADR-328 D3): an arrival is located at the
     *   destination. Presence is tagged from this location.
     */
    event(type: string, data: any, at?: {
        location: string;
    }): ISemanticEvent;
    /**
     * Emit a sound from the actor's current location for this turn (ADR-172
     * Phase 6).
     *
     * Buffers an `ISound` for the per-turn sound dispatcher to propagate to
     * every `ListenerTrait` entity. The context auto-fills `sourceEntity`
     * (from `context.actor.id`) and `sourceLocation` (from
     * `context.currentLocation.id`) so callers only supply the semantic
     * payload: kind, volumeTier, and optional content.
     *
     * Sounds buffered in this turn's report or execute phase are dispatched
     * once after action resolution and before text rendering. Sounds do NOT
     * survive the turn boundary.
     *
     * If the action context was created without a sound buffer wired (the
     * recursive implicit-take path, or a hand-built test mock), this is a
     * silent no-op — emission is dropped without error.
     *
     * @param sound A partial `ISound` omitting `sourceEntity` and
     *              `sourceLocation`; the context fills both from the actor.
     *
     * @example
     * // Speech sound with content (in an action's report phase)
     * context.emitSound({
     *   kind: 'speech',
     *   volumeTier: 'normal',
     *   content: { messageId: 'herve.greeting' },
     * });
     *
     * @example
     * // Ambient sound, no content
     * context.emitSound({ kind: 'glass-break', volumeTier: 'raised' });
     */
    emitSound(sound: Omit<ISound, 'sourceEntity' | 'sourceLocation'>): void;
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
     * When true, `error` is already a fully-qualified message id and must
     * not be prefixed with the action id (ADR-231 D1 provenance
     * pass-through). Set by the lifecycle engine for interceptor vetoes
     * and by helpers that emit another action's key; never set by an
     * action's own validation.
     */
    errorQualified?: boolean;
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
import { type RandomService } from '@sharpee/core';
import { IFEntity, WorldModel } from '@sharpee/world-model';
import { ActionContext, Action } from './enhanced-types.js';
import { ScopeResolver } from '../scope/types.js';
import { ValidatedCommand } from '../validation/types.js';
/**
 * Factory function to create unified action context
 *
 * @param actor The entity performing the action (ADR-328 D1). Defaults to
 *              `player`, so parser-driven and test contexts are unchanged;
 *              pass a non-player actor to run the action as that entity.
 *              `currentLocation` is the actor's immediate location.
 * @throws when the actor has no location in the world
 */
export declare function createActionContext(world: WorldModel, player: IFEntity, action: Action, command: ValidatedCommand, random: RandomService, scopeResolver?: ScopeResolver, actor?: IFEntity): ActionContext;
/**
 * Helper to create a mock action context for testing
 */
export declare function createMockActionContext(world: WorldModel, player: IFEntity, action: Action, random: RandomService, command?: Partial<ValidatedCommand>, scopeResolver?: ScopeResolver): ActionContext;
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
import { Action, ActionContext, ValidationResult } from './enhanced-types.js';
import { type ISemanticEvent } from '@sharpee/core';
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

### actions/registry

```typescript
/**
 * Action registry implementation
 *
 * Manages registration and lookup of actions.
 * Actions are pure logic - patterns come from the language provider.
 */
import { Action, ActionRegistry as IActionRegistry } from './enhanced-types.js';
import { type LanguageProvider } from '@sharpee/if-domain';
export { ActionRegistry } from './enhanced-types.js';
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
    readonly CUTTING: "if.action.cutting";
    readonly DIGGING: "if.action.digging";
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
    readonly HIDING: "if.action.hiding";
    readonly REVEALING: "if.action.revealing";
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

### actions/lifecycle/descriptor

```typescript
/**
 * Interceptor lifecycle descriptors (ADR-228).
 *
 * A descriptor is an action's declarative statement of its interceptor
 * surface: which command entities carry interceptors under which action
 * ids, in what order they are consulted, and which rare special contracts
 * apply. The shared lifecycle engine (`lifecycle-engine.ts`) executes the
 * ADR-228 rulings (D1 veto-only, D2 structured onBlocked, D3 all-entities
 * fixed order, D4 per-item multi-object) against this declaration — the
 * action never hand-rolls hook plumbing.
 *
 * An action is "wired" for interceptors iff it has a descriptor; the
 * stdlib wired-action registry (ADR-228 D5) is derived mechanically from
 * the descriptor table, never hand-maintained.
 *
 * Public interface: `ActionLifecycleDescriptor`, `EntitySlotSpec`,
 * `LifecycleContracts`.
 * Owner: stdlib standard-action infrastructure (ADR-228).
 */
import { IFEntity } from '@sharpee/world-model';
import { ActionContext } from '../enhanced-types.js';
/**
 * One consultable entity slot of a command.
 *
 * Slots are declared in the published consultation order (ADR-228 D3-B):
 * direct object → indirect object / instrument → action-specific implicit
 * entities (e.g. going's door, source room, destination room; exiting's
 * current container). Validate-phase vetoes stop the chain at the first
 * vetoing slot; postExecute/postReport run for every slot that survived.
 *
 * Both-ids rule (ADR-228 D6): a slot may consult more than one action id
 * (specific id first — e.g. removing consults `if.action.removing` then
 * `if.action.taking` on the item). One physical operation can therefore
 * fire hooks under two ids; a trait should register its interceptor under
 * exactly one of them to avoid double-mutation.
 */
export interface EntitySlotSpec {
    /**
     * Slot identity — stable, human-readable, unique within the descriptor
     * (e.g. 'directObject', 'container', 'item', 'weapon', 'door', 'source',
     * 'destination'). Used in docs, diagnostics, and tests.
     */
    id: string;
    /**
     * Action ids to consult on this slot's entity, in consultation order
     * (specific id before delegated id per D6).
     */
    actionIds: string[];
    /**
     * Resolve this slot's entity from the command. Return `undefined` when
     * the slot is not present in this particular command (e.g. no indirect
     * object) — the slot is then skipped, never an error.
     *
     * Implicit-entity slots resolve here too (going's source/destination
     * rooms, exiting's current container) — resolution is not limited to
     * parsed command objects.
     */
    resolve(context: ActionContext): IFEntity | undefined;
    /**
     * Optional seed for the slot's per-consultation sharedData, applied at
     * resolve time. Used for symmetric cross-entity context (ADR-228 D3
     * sub-ruling: the item-side hook in putting/inserting receives the
     * container id, mirroring how the container's hook receives the item id).
     *
     * @param context - The action context.
     * @param entity - This slot's resolved entity.
     * @param multiObjectItem - In a multi-object per-item resolution (D4),
     *   the item currently being processed — so a shared slot (e.g. the
     *   container in "put all in case") can seed per-item context like the
     *   item id. Undefined for single-object commands and for the item slot
     *   itself (where `entity` IS the item).
     */
    seedData?(context: ActionContext, entity: IFEntity, multiObjectItem?: IFEntity): Record<string, unknown>;
}
/**
 * Rare, explicit special contracts (ADR-228 D7.3). A contract changes the
 * engine's standard hook semantics for the action and MUST be declared
 * here — never encoded as a comment or an ad-hoc branch in the action.
 */
export interface LifecycleContracts {
    /**
     * attacking only: when a combatant target's interceptor implements
     * postExecute, that hook REPLACES the action's standard combat
     * resolution instead of running after it. The action reads this flag to
     * decide whether to run its core execute logic; the engine still runs
     * the hook itself normally.
     */
    postExecuteReplacesCore?: boolean;
}
/**
 * An action's declarative interceptor surface (ADR-228 D0-B).
 *
 * Supplied by the action to the lifecycle engine at each phase boundary.
 * Descriptors are static per action (module-level constants) — anything
 * command-dependent lives in slot `resolve`/`seedData` functions.
 */
export interface ActionLifecycleDescriptor {
    /**
     * The action's primary id (e.g. `IFActions.TAKING`). Used for
     * diagnostics and the D5 registry derivation.
     */
    actionId: string;
    /**
     * Entity slots in the published consultation order (D3-B): direct
     * object → indirect/instrument → implicit entities.
     */
    slots: EntitySlotSpec[];
    /** Rare special contracts (D7.3). Omit unless the ADR names one. */
    contracts?: LifecycleContracts;
}
```

### actions/lifecycle/lifecycle-engine

```typescript
/**
 * Interceptor lifecycle engine (ADR-228).
 *
 * The single implementation of the ADR-118 interceptor lifecycle. Actions
 * declare their interceptor surface as an `ActionLifecycleDescriptor` and
 * call the engine at their four phase boundaries; the engine owns the
 * rulings exactly once:
 *
 * - D1 — veto-only guards: a validate hook acts only when it returns
 *   `{valid: false}`; any other result (including `{valid: true}`) falls
 *   through. No hook can skip standard validation or later consultations.
 *   (The explicit force-allow marker is a reserved, unimplemented
 *   extension — see ADR-228 D1.)
 * - D2 — structured onBlocked: `{ override?, emit? }` applied against the
 *   standard blocked event, which always survives.
 * - D3 — all command entities consulted in the descriptor's published
 *   slot order, each consultation with its own sharedData; first veto
 *   stops the validate chain; postExecute/postReport run for every
 *   consultation once the action proceeds.
 * - Override arbitration: at most one consultation may return an
 *   `override` per report/blocked application — a second is a hard error,
 *   mirroring ADR-106's "multiple game.message reactions" rule.
 *
 * Multi-object commands (D4) run one lifecycle per item via
 * `multi-object-lifecycle.ts`, built on the same primitives.
 *
 * Public interface: `resolveLifecycle`, `getLifecycleState`,
 * `runPreValidate`, `runPostValidate`, `runPostExecute`, `runPostReport`,
 * `runOnBlocked`, `LifecycleState`, `ResolvedConsultation`.
 * Owner: stdlib standard-action infrastructure (ADR-228).
 */
import { type ISemanticEvent } from '@sharpee/core';
import { IFEntity, type InterceptorSharedData } from '@sharpee/world-model';
import type { ActionInterceptor } from '@sharpee/world-model';
import { ActionContext, ValidationResult } from '../enhanced-types.js';
import { ActionLifecycleDescriptor } from './descriptor.js';
/**
 * Slot id of the implicit actor consultation (ADR-327 D1): every wired
 * action consults the acting entity last. Not a descriptor slot —
 * descriptors never declare it.
 */
export declare const ACTOR_SLOT_ID = "actor";
/**
 * The registration key an interceptor uses to be consulted AS THE ACTOR
 * (ADR-327 D1): `actor:<actionId>`. A separate key, not the action's own id,
 * so a binding keyed on a trait the actor happens to carry (ACTOR on a
 * give/show recipient, CONTAINER on the player) is never consulted twice —
 * once as a target, once as the actor. Opting in is registering under this
 * key: `world.registerActionInterceptor(trait, actorConsultationId(id), …)`.
 * @param actionId the action's primary id (`if.action.taking`)
 * @returns the actor-consultation registration key
 */
export declare function actorConsultationId(actionId: string): string;
/**
 * One resolved (entity, actionId) interceptor consultation.
 *
 * A slot that consults two action ids (D6 both-ids) yields up to two
 * consultations; each has its own `data` (D3 sharedData isolation).
 */
export interface ResolvedConsultation {
    /** The descriptor slot this consultation came from. */
    slotId: string;
    /** The action id the interceptor was resolved under. */
    actionId: string;
    /** The entity whose trait declared the interceptor. */
    entity: IFEntity;
    /** The resolved interceptor. */
    interceptor: ActionInterceptor;
    /** Per-consultation shared data, isolated from other consultations. */
    data: InterceptorSharedData;
}
/**
 * The command's resolved lifecycle: the descriptor plus every
 * consultation found for the command's entities, in consultation order.
 */
export interface LifecycleState {
    descriptor: ActionLifecycleDescriptor;
    consultations: ResolvedConsultation[];
}
/**
 * Options for `resolveLifecycle`.
 */
export interface ResolveLifecycleOptions {
    /**
     * Substitute a specific entity for one slot instead of calling its
     * `resolve` — used by the multi-object helper (D4) to bind each
     * expanded item to the item slot. The resulting state is NOT stored in
     * sharedData (per-item states live in the multi-object results).
     */
    slotOverride?: {
        slotId: string;
        entity: IFEntity;
    };
}
/**
 * Resolve an action's interceptor consultations for the current command.
 *
 * Iterates the descriptor's slots in published order (D3-B); for each
 * slot that resolves to an entity, consults the world's interceptor
 * registry under each of the slot's action ids (D6 order). Every match
 * becomes a `ResolvedConsultation` with fresh sharedData (seeded via the
 * slot's `seedData`, if any).
 *
 * Stores the state in `context.sharedData` (unless `slotOverride` is
 * used) so later phases can fetch it with `getLifecycleState`.
 *
 * @param context - The action context.
 * @param descriptor - The action's declared interceptor surface.
 * @param options - See `ResolveLifecycleOptions`.
 * @returns The resolved lifecycle state (possibly with zero consultations).
 */
export declare function resolveLifecycle(context: ActionContext, descriptor: ActionLifecycleDescriptor, options?: ResolveLifecycleOptions): LifecycleState;
/**
 * Fetch the lifecycle state stored by `resolveLifecycle` for this command.
 *
 * @param context - The action context.
 * @returns The state, or `undefined` if `resolveLifecycle` has not run.
 */
export declare function getLifecycleState(context: ActionContext): LifecycleState | undefined;
/**
 * Resolve the message id for a blocked action (ADR-231 D1) — the ONE
 * place the qualification convention lives.
 *
 * Interceptor-originated errors (and helper-produced cross-action keys)
 * carry `errorQualified: true` and pass through untouched; an action's
 * own validation errors are qualified as `<action.id>.<error>` exactly
 * as before. `blocked()` implementations call this instead of building
 * ids by hand; key shape (dots, hyphens) is NOT the discriminator —
 * provenance is.
 *
 * @param context - The action context (supplies the action id).
 * @param result - The failed validation result carrying the error key.
 * @returns The message id to emit from `blocked()`.
 */
export declare function blockedMessageId(context: ActionContext, result: ValidationResult): string;
/**
 * Run every consultation's `preValidate` hook in order (D3-B).
 *
 * First veto wins: returns that veto as a `ValidationResult` and stops
 * consulting. Returns `null` when no hook vetoes (the action continues
 * with standard validation — D1: hooks cannot approve, only object).
 *
 * @param context - The action context.
 * @param state - The resolved lifecycle state.
 */
export declare function runPreValidate(context: ActionContext, state: LifecycleState): ValidationResult | null;
/**
 * Run every consultation's `postValidate` hook in order (D3-B).
 *
 * Canonical placement (ADR-228): after ALL standard validation has
 * passed. First veto wins; returns `null` when no hook vetoes.
 *
 * @param context - The action context.
 * @param state - The resolved lifecycle state.
 */
export declare function runPostValidate(context: ActionContext, state: LifecycleState): ValidationResult | null;
/**
 * Run every consultation's `postExecute` hook in order (D3-B: all
 * consultations survived validation once the action executed).
 *
 * Note the `postExecuteReplacesCore` contract (D7.3) governs whether the
 * ACTION runs its own core logic — the engine always runs the hooks
 * themselves normally.
 *
 * @param context - The action context.
 * @param state - The resolved lifecycle state.
 */
export declare function runPostExecute(context: ActionContext, state: LifecycleState): void;
/**
 * Run every consultation's `postReport` hook and apply the results to the
 * action's events.
 *
 * At most ONE consultation may return an `override` — a second is a hard
 * error (throws), mirroring the `InterceptorReportResult` contract's
 * ADR-106 rule. `emit` effects append in consultation order.
 *
 * @param context - The action context.
 * @param state - The resolved lifecycle state.
 * @param events - The action's events array; mutated in place.
 * @param primaryEventType - The event type an `override` targets.
 * @param searchFrom - Index in `events` where this report began — override
 *   targeting searches from here so per-item applications (D4) land on
 *   the item's own event, not an earlier item's.
 */
export declare function runPostReport(context: ActionContext, state: LifecycleState, events: ISemanticEvent[], primaryEventType: string, searchFrom?: number): void;
/**
 * Run every consultation's `onBlocked` hook and apply the results to the
 * action's blocked events (D2: the standard blocked event always
 * survives; `override` swaps its message, `emit` appends).
 *
 * All resolved consultations are notified — including ones the validate
 * chain never reached — matching the D3 author model ("a clause on any
 * entity involved in the command fires"). At most one `override` (hard
 * error otherwise).
 *
 * @param context - The action context.
 * @param state - The resolved lifecycle state.
 * @param events - The blocked events array (standard blocked event
 *   already pushed); mutated in place.
 * @param blockedEventType - The standard blocked event's type.
 * @param error - The validation error code the action was blocked with.
 * @param searchFrom - Index in `events` where this item's blocked report
 *   began (D4 per-item targeting).
 */
export declare function runOnBlocked(context: ActionContext, state: LifecycleState, events: ISemanticEvent[], blockedEventType: string, error: string, searchFrom?: number): void;
```

### actions/lifecycle/multi-object-lifecycle

```typescript
/**
 * Multi-object interceptor lifecycle (ADR-228 D4).
 *
 * Runs the FULL interceptor lifecycle per expanded item of a multi-object
 * command ("take all", "put all in case"): resolve → preValidate →
 * standard per-item validation → postValidate per item; postExecute /
 * postReport per successful item; onBlocked per failed item. Actions
 * supply only their standard per-item logic as callbacks — the hook
 * plumbing lives here exactly once, so the bypass class the ADR-118 audit
 * found (putting/dropping multi paths skipping all five hooks; taking
 * skipping onBlocked) cannot silently recur.
 *
 * Aggregated output is preserved: the action's report callbacks push
 * their own events; the engine applies each item's hook results against
 * that item's own events via `searchFrom` targeting.
 *
 * Public interface: `runMultiObjectValidate`, `runMultiObjectExecute`,
 * `runMultiObjectReport`, `getMultiObjectLifecycle`,
 * `MultiObjectItemState`.
 * Owner: stdlib standard-action infrastructure (ADR-228).
 */
import { type ISemanticEvent } from '@sharpee/core';
import { IFEntity } from '@sharpee/world-model';
import { ActionContext, ValidationResult } from '../enhanced-types.js';
import { ActionLifecycleDescriptor } from './descriptor.js';
import { LifecycleState } from './lifecycle-engine.js';
/**
 * One item's lifecycle through a multi-object command.
 *
 * `itemData` is the action's per-item scratch space (previous location,
 * implicit-removal flags, ...) — the analogue of single-object
 * sharedData, isolated per item.
 */
export interface MultiObjectItemState {
    entity: IFEntity;
    /** True when the item passed hooks + standard validation. */
    success: boolean;
    /** Validation error code when `success` is false. */
    error?: string;
    /**
     * True when `error` is already a fully-qualified message id
     * (interceptor-originated — ADR-231 D1); `blockedMessageId` must not
     * prefix it.
     */
    errorQualified?: boolean;
    /** Error params when `success` is false. */
    errorParams?: Record<string, unknown>;
    /** The item's resolved interceptor consultations (own sharedData each). */
    state: LifecycleState;
    /** Action-owned per-item scratch data. */
    itemData: Record<string, unknown>;
}
/**
 * Validate every expanded item through its full lifecycle (D4).
 *
 * Per item, in order: resolve consultations (the descriptor's
 * `multiObjectSlotId`-designated slot binds to the item) → preValidate
 * hooks (veto fails the item) → `validateItem` (standard validation) →
 * postValidate hooks (veto fails the item). A failed item never blocks
 * the others — per-item success/failure is recorded for the execute and
 * report phases.
 *
 * Stores the resulting array in `context.sharedData` and returns it.
 *
 * @param context - The action context.
 * @param descriptor - The action's declared interceptor surface. Its slot
 *   with id `multiObjectSlotId` is bound to each item in turn.
 * @param multiObjectSlotId - Id of the slot that carries each expanded
 *   item (usually the direct-object slot).
 * @param items - The expanded entities of the multi-object command.
 * @param validateItem - The action's standard single-item validation.
 * @returns Per-item lifecycle states, in `items` order.
 */
export declare function runMultiObjectValidate(context: ActionContext, descriptor: ActionLifecycleDescriptor, multiObjectSlotId: string, items: IFEntity[], validateItem: (context: ActionContext, item: IFEntity, itemData: Record<string, unknown>) => ValidationResult): MultiObjectItemState[];
/**
 * Fetch the per-item states stored by `runMultiObjectValidate`.
 *
 * @param context - The action context.
 * @returns The item states, or `undefined` if the command was not
 *   validated as a multi-object command.
 */
export declare function getMultiObjectLifecycle(context: ActionContext): MultiObjectItemState[] | undefined;
/**
 * Execute every successful item: the action's `executeItem`, then that
 * item's postExecute hooks (D4 — hooks fire per item, so e.g. a trophy
 * case's postExecute awards score for EVERY deposited treasure).
 *
 * @param context - The action context.
 * @param itemStates - The states from `runMultiObjectValidate`.
 * @param executeItem - The action's standard single-item mutation.
 */
export declare function runMultiObjectExecute(context: ActionContext, itemStates: MultiObjectItemState[], executeItem: (context: ActionContext, item: IFEntity, itemData: Record<string, unknown>) => void): void;
/**
 * Report every item: successes via `reportSuccess` + postReport hooks,
 * failures via `reportBlocked` + onBlocked hooks (D4 closes the audit's
 * take-all-loses-onBlocked gap).
 *
 * Each item's hook results are applied with `searchFrom` set to the index
 * where that item's events began, so overrides land on the item's own
 * event even though all items share one events array (aggregated output).
 *
 * @param context - The action context.
 * @param itemStates - The states from `runMultiObjectValidate`.
 * @param events - The action's events array; mutated in place.
 * @param primaryEventType - Event type a success `override` targets.
 * @param blockedEventType - Event type a blocked `override` targets.
 * @param reportSuccess - Pushes the item's standard success event(s).
 * @param reportBlocked - Pushes the item's standard blocked event. Receives
 *   the item's failure as a `ValidationResult` (error + errorQualified +
 *   params) so it can resolve the message id via `blockedMessageId`.
 */
export declare function runMultiObjectReport(context: ActionContext, itemStates: MultiObjectItemState[], events: ISemanticEvent[], primaryEventType: string, blockedEventType: string, reportSuccess: (context: ActionContext, item: IFEntity, itemData: Record<string, unknown>, events: ISemanticEvent[]) => void, reportBlocked: (context: ActionContext, item: IFEntity, result: ValidationResult, events: ISemanticEvent[]) => void): void;
```

### actions/lifecycle/registry

```typescript
/**
 * Wired-action registry (ADR-228 D5).
 *
 * The descriptor table: every standard action's `ActionLifecycleDescriptor`,
 * collected in one place, plus the set of interceptor-consulting action ids
 * derived mechanically from it. The table IS the source of truth — an action
 * is "wired" iff its descriptor appears here, and the id set is never
 * hand-maintained. Consumers (the Chord story-loader's load-time fail-fast,
 * tooling, tests) read the derived set to decide whether an interceptor
 * registered under a given action id will ever be consulted.
 *
 * Public interface: `actionLifecycleDescriptors`,
 * `interceptorConsultingActionIds`.
 * Owner: stdlib standard-action infrastructure (ADR-228).
 *
 * NOTE: this module is deliberately NOT exported from `./index.ts` (the
 * lifecycle barrel) — actions import that barrel, and this module imports
 * the actions, so routing it through the barrel would create an import
 * cycle. It is exported from the actions barrel (`../index.ts`) instead.
 */
import { ActionLifecycleDescriptor } from './descriptor.js';
/**
 * The descriptor table: all 38 entity-keyed standard actions (33 per
 * ADR-228 Consequences + cutting per ADR-230 D3c + digging + asking/telling per
 * ADR-230 Phase 6 + turning per the chord go-live G1 shortlist, 2026-07-17).
 * Structural exemptions
 * (no entity to key on: about, waiting, looking, … and the full-delegation
 * capability actions lowering/raising) are absent by design — see ADR-228
 * Context.
 */
export declare const actionLifecycleDescriptors: readonly ActionLifecycleDescriptor[];
/**
 * Every action id under which some wired action consults interceptors —
 * the union of all descriptors' slot actionIds (mechanically derived; the
 * both-ids delegation seams of ADR-228 D6 and implicit-entity ids like
 * `if.action.entering_room` fall out of the slots, not a hand-kept list).
 * An interceptor registered under an id NOT in this set will never fire.
 */
export declare const interceptorConsultingActionIds: ReadonlySet<string>;
```

### actions/standard

```typescript
/**
 * Standard Interactive Fiction actions
 *
 * These are the core actions that most IF games will use.
 * Each action is a pure function that validates conditions and returns events.
 */
export { takingAction } from './taking/index.js';
export type { TakenEventData, TakingErrorData } from './taking/taking-events.js';
export * from './dropping/index.js';
export * from './examining/index.js';
export * from './opening/index.js';
export * from './closing/closing.js';
export * from './going/index.js';
export * from './looking/index.js';
export * from './inventory/index.js';
export * from './waiting/index.js';
export * from './sleeping/index.js';
export * from './scoring/index.js';
export * from './help/index.js';
export * from './about/index.js';
export * from './version/index.js';
export * from './locking/index.js';
export * from './cutting/index.js';
export * from './turning/index.js';
export * from './asking/index.js';
export * from './telling/index.js';
export * from './digging/index.js';
export * from './unlocking/index.js';
export * from './switching_on/index.js';
export * from './switching_off/index.js';
export * from './entering/index.js';
export * from './exiting/index.js';
export * from './climbing/index.js';
export * from './searching/index.js';
export * from './listening/index.js';
export * from './smelling/index.js';
export * from './touching/index.js';
export * from './putting/index.js';
export * from './inserting/index.js';
export * from './reading/index.js';
export { removingAction } from './removing/index.js';
export type { RemovingEventMap } from './removing/removing-events.js';
export * from './giving/index.js';
export * from './showing/index.js';
export { throwingAction } from './throwing/index.js';
export type { ThrownEventData, ItemDestroyedEventData } from './throwing/throwing-events.js';
export * from './pushing/index.js';
export * from './pulling/index.js';
export * from './lowering/index.js';
export * from './raising/index.js';
export { wearingAction } from './wearing/index.js';
export { takingOffAction } from './taking_off/index.js';
export type { WornEventData, ImplicitTakenEventData } from './wearing/wearing-events.js';
export type { RemovedEventData as TakenOffEventData } from './taking_off/taking-off-events.js';
export * from './eating/index.js';
export * from './drinking/index.js';
export * from './talking/index.js';
export * from './attacking/index.js';
export * from './saving/index.js';
export * from './restoring/index.js';
export * from './quitting/index.js';
export * from './restarting/index.js';
export * from './undoing/index.js';
export * from './again/index.js';
export * from './hiding/index.js';
import { TraceAction } from '../author/index.js';
export declare const standardActions: (import("../enhanced-types.js").Action | TraceAction)[];
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
import { ActionContext } from '../enhanced-types.js';
import { MetaAction } from '../meta-action.js';
import { ValidationResult } from '../enhanced-types.js';
import { type ISemanticEvent } from '@sharpee/core';
export declare class TraceAction extends MetaAction {
    id: string;
    verbs: string[];
    constructor();
    validate(context: ActionContext): ValidationResult;
    execute(context: ActionContext): ISemanticEvent[];
}
```

### actions/helpers/exit-legality

```typescript
/**
 * Exit legality for conversational leaving (ADR-320 D8; ADR-328 D5).
 *
 * "Leaving is movement, obeys the world": a scene's `leave` outcome is
 * checked against the going action itself. `canActorLeave` runs the real
 * `going` action's `validate()` for the would-be leaver in every direction
 * the room offers — one truth, never a private conversation-only physics.
 * A restrained, cornered, or blocked NPC cannot take the exit; silence
 * remains the inalienable move.
 *
 * `hasTraversableExit` is the older read-side guess (going's read points,
 * re-implemented by hand); the Chord runtime still calls it from two
 * pre-checks the acting surface (ADR-328 D7) will replace.
 *
 * Public interface: canActorLeave, hasTraversableExit.
 * Owner context: stdlib / actions / helpers
 */
import { type RandomService } from '@sharpee/core';
import { IFEntity, WorldModel } from '@sharpee/world-model';
/**
 * Whether the actor could leave the room they stand in right now, by the
 * going action's own judgement: true when `going.validate()` accepts at
 * least one direction for them. Validate only — nothing moves.
 *
 * @param world - The live world
 * @param actor - The would-be leaver
 * @param player - The player entity (the action context's protagonist)
 * @param random - The session random service the context requires
 * @returns True when some direction validates for the actor
 */
export declare function canActorLeave(world: WorldModel, actor: IFEntity, player: IFEntity, random: RandomService): boolean;
/**
 * Whether the room offers at least one exit an actor could take right
 * now: an exit (static or computed) whose direction is not blocked (live
 * evaluator first, trait map fallback — going's read order) and whose
 * door, if any, is not locked (a closed unlocked door can be opened).
 *
 * @param world - The live world
 * @param roomId - The room the would-be leaver is in
 * @returns True when some exit is traversable
 */
export declare function hasTraversableExit(world: WorldModel, roomId: string): boolean;
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
import { type EntityId } from '@sharpee/core';
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
import { type EntityId } from '@sharpee/core';
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
export type { TakenEventData, TakingErrorData } from '../actions/standard/taking/taking-events.js';
export type { DroppedEventData, DroppingErrorData } from '../actions/standard/dropping/dropping-events.js';
export type { LookedEventData, RoomDescriptionEventData, ListContentsEventData } from '../actions/standard/looking/looking-events.js';
export type { ExaminedEventData, ExaminingErrorData } from '../actions/standard/examining/examining-events.js';
export type { ActorMovedEventData, ActorExitedEventData, ActorEnteredEventData, GoingErrorData } from '../actions/standard/going/going-events.js';
export type { OpenedEventData, RevealedEventData, ExitRevealedEventData, OpeningErrorData } from '../actions/standard/opening/opening-events.js';
export type { PutInEventData, PutOnEventData } from '../actions/standard/putting/putting-events.js';
export type { LockedEventData, LockingErrorData } from '../actions/standard/locking/locking-events.js';
export type { UnlockedEventData, UnlockingErrorData } from '../actions/standard/unlocking/unlocking-events.js';
export type { WornEventData, WearingErrorData } from '../actions/standard/wearing/wearing-events.js';
export type { RemovedEventData as TakingOffRemovedEventData, TakingOffErrorData } from '../actions/standard/taking_off/taking-off-events.js';
export type { EnteredEventData, EnteringErrorData } from '../actions/standard/entering/entering-events.js';
export type { ExitedEventData, ExitingErrorData } from '../actions/standard/exiting/exiting-events.js';
export type { SwitchedOnEventData, SwitchingOnErrorData } from '../actions/standard/switching_on/switching_on-events.js';
export type { SwitchedOffEventData, SwitchingOffErrorData } from '../actions/standard/switching_off/switching_off-events.js';
export type { ScoreDisplayedEventData } from '../actions/standard/scoring/scoring-events.js';
export type { InventoryEventData, InventoryItem } from '../actions/standard/inventory/inventory-events.js';
import type { TakenEventData } from '../actions/standard/taking/taking-events.js';
import type { DroppedEventData } from '../actions/standard/dropping/dropping-events.js';
import type { LookedEventData, RoomDescriptionEventData, ListContentsEventData } from '../actions/standard/looking/looking-events.js';
import type { ExaminedEventData } from '../actions/standard/examining/examining-events.js';
import type { ActorMovedEventData, ActorExitedEventData, ActorEnteredEventData } from '../actions/standard/going/going-events.js';
import type { OpenedEventData, RevealedEventData, ExitRevealedEventData } from '../actions/standard/opening/opening-events.js';
import type { PutInEventData, PutOnEventData } from '../actions/standard/putting/putting-events.js';
import type { LockedEventData } from '../actions/standard/locking/locking-events.js';
import type { UnlockedEventData } from '../actions/standard/unlocking/unlocking-events.js';
import type { WornEventData } from '../actions/standard/wearing/wearing-events.js';
import type { RemovedEventData as TakingOffRemovedData } from '../actions/standard/taking_off/taking-off-events.js';
import type { EnteredEventData } from '../actions/standard/entering/entering-events.js';
import type { ExitedEventData } from '../actions/standard/exiting/exiting-events.js';
import type { SwitchedOnEventData } from '../actions/standard/switching_on/switching_on-events.js';
import type { SwitchedOffEventData } from '../actions/standard/switching_off/switching_off-events.js';
import type { ScoreDisplayedEventData } from '../actions/standard/scoring/scoring-events.js';
import type { InventoryEventData } from '../actions/standard/inventory/inventory-events.js';
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
import type { ValidatedCommand } from './types.js';
import { ActionRegistry } from '../actions/registry.js';
import { ScopeResolver, ScopeLevel } from '../scope/types.js';
/**
 * Action metadata interface for declaring requirements
 */
export interface ActionMetadata {
    requiresDirectObject: boolean;
    requiresIndirectObject: boolean;
    directObjectScope?: ScopeLevel;
    indirectObjectScope?: ScopeLevel;
    validPrepositions?: string[];
    /**
     * Disambiguation preference (platform-issue-sweep Phase 6/10): when an
     * ambiguity ties and EXACTLY ONE candidate sits at this scope level, it
     * auto-resolves. Lets an action widen its resolution scope (so its own
     * refusal speaks for out-of-scope targets — e.g. dropping resolves
     * VISIBLE) without losing the classic preference ("drop book" with a
     * carried black book and a guidebook on the floor means the carried one).
     */
    preferredScope?: ScopeLevel;
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
    /** The current action's preferredScope, staged for resolveAmbiguity. */
    private currentPreferredScope?;
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
    private resolveTopic;
    /**
     * Find candidate entities the noun phrase matches at any tier
     * (ADR-231 D3). Rooms are skipped; the player IS resolvable here: a
     * player with an IdentityTrait ("yourself", aliases me/self/myself)
     * must match "examine me", "x yourself", etc. (ISSUE #154).
     */
    private findCandidates;
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
    private matchEntityName;
    /**
     * The entity's word-level matching vocabulary (PIN 2): name content
     * words + alias content words + authored adjectives (per-side for walls
     * via getEntityAdjectives). Always derived on demand from the CURRENT
     * name — never stored — so renames can't leave stale vocabulary and
     * Chord-loaded and TS-authored entities are uniform by construction.
     */
    private getEntityVocabulary;
    /**
     * Strip leading articles ("the", "a", "an") from query text, always
     * keeping at least one word.
     */
    private stripLeadingArticles;
    /**
     * Keep only the dominant (tier, wordsMatched) group of an already-sorted
     * scored list (PIN 2: higher tier wins; within a tier, more matched
     * words win; only true ties reach disambiguation).
     */
    private dominantMatches;
    /**
     * Filter entities by scope level
     */
    private filterByScope;
    /**
     * Score entities against a reference (ADR-231 D3 tiered model).
     *
     * The tier and matched-word count come from `matchEntityName` and carry
     * PIN 2's ranking; the numeric `score` is the within-tie heuristic
     * (modifier/visibility/inventory/author scope priority bonuses) that the
     * normal disambiguation flow uses to break residual ties.
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
import type { ScopeLevel, SenseType } from '../scope/types.js';
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
import { VerbVocabulary, DirectionVocabulary, SpecialVocabulary } from '../parser/index.js';
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
import { SaveRestoreCapabilitySchema, SaveRestoreData, SaveData } from './save-restore.js';
import { ConversationCapabilitySchema, ConversationData, ConversationStateData } from './conversation.js';
import { GameMetaCapabilitySchema, GameMetaData } from './game-meta.js';
import { CommandHistoryCapabilitySchema, CommandHistoryData, CommandHistoryEntry } from './command-history.js';
import { DebugCapabilitySchema, DebugData, DEBUG_CAPABILITY, isAnyDebugEnabled, createDefaultDebugData } from './debug.js';
export { SaveRestoreCapabilitySchema, SaveRestoreData, SaveData, ConversationCapabilitySchema, ConversationData, ConversationStateData, GameMetaCapabilitySchema, GameMetaData, CommandHistoryCapabilitySchema, CommandHistoryData, CommandHistoryEntry, DebugCapabilitySchema, DebugData, DEBUG_CAPABILITY, isAnyDebugEnabled, createDefaultDebugData };
/**
 * Map of standard capability names to their schemas
 */
export declare const StandardCapabilitySchemas: {
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
import { type IQueryHandler, type IPendingQuery, type IQueryResponse } from '@sharpee/core';
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
import { type IQueryHandler, type IPendingQuery, type IQueryResponse } from '@sharpee/core';
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
import { ScopeLevel, ScopeResolver } from './types.js';
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
     * Check if actor can physically reach the target.
     * Delegates to ReachabilityBehavior via WorldModel for the platform's one
     * reachability definition (ADR-273 D4) — sight precondition, carried
     * always reachable, closed containers block (transparent or not), another
     * actor's inventory blocked unless OpenInventoryTrait. Same delegation
     * shape as canSee above.
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
import { WitnessSystem, StateChange, WitnessRecord, EntityKnowledge, ScopeResolver } from './types.js';
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
import { type ISemanticEvent, type Presence } from '@sharpee/core';
import { IFEntity, type IWorldModel } from '@sharpee/world-model';
export type { Sense, Rendering, PerSenseRenderings, PerceptionBlockReason, PerceptionBlockedData, IPerceptionService, Presence, } from '@sharpee/if-services';
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
     * The observer's presence relative to where an event happened (ADR-328 D3).
     *
     * Co-location rules (the loader's former `playerPresentAt`): a room means
     * the observer is in that room; a region means the observer is in one of
     * its member rooms (transitive through nesting, ADR-236 D4); anything else
     * means the two share a containing room. Presence, not sight — the snake
     * speaks in darkness. A co-located observer carrying a concealed state is
     * `concealed` (ADR-144's eavesdropping case).
     */
    presenceOf(observer: IFEntity, locationId: string, world: IWorldModel): Presence;
    private isCoLocated;
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
 * NPC decision-layer types (ADR-070; ADR-328 D5).
 *
 * A behavior DECIDES what an NPC does each turn; the platform EXECUTES it.
 * The seam between the two is `NpcContext.act`: the behavior names a
 * standard action and its slots, and the engine runs that action's four
 * phases for the NPC through the same execution entry the player's
 * commands take (ADR-328 D1/D2). There is no second action universe — an
 * NPC's take can be refused by a trait, intercepted, witnessed, and
 * narrated exactly as the player's can, because it IS the same action.
 *
 * Public interface: NpcBehavior, NpcContext, ActSlots, ActResult,
 * ExecutionEntry.
 * Owner context: stdlib / npc (decision layer; the engine owns the tick).
 */
import { type ISemanticEvent, type EntityId, type RandomService } from '@sharpee/core';
import { IFEntity, WorldModel, type DirectionType } from '@sharpee/world-model';
/**
 * The resolved slots of an action an NPC performs. There is no parser
 * step, so the behavior has already chosen the entities; the action's own
 * `validate()` still applies every actor-relative check to them.
 */
export interface ActSlots {
    /** Direct object, if the action takes one */
    directObject?: IFEntity;
    /** Indirect object, if the action takes one */
    indirectObject?: IFEntity;
    /** Instrument (ADR-080), if the action takes one */
    instrument?: IFEntity;
    /** Direction of travel, for `if.action.going` */
    direction?: DirectionType;
}
/**
 * What came back from running an action as an NPC: whether the action
 * genuinely ran (false when `validate()` refused it) and the events it
 * produced. The engine's `TurnResult` satisfies this shape; the decision
 * layer sees only these two facts.
 */
export interface ActResult {
    /** True when the action ran its execute/report phases; false when refused */
    success: boolean;
    /** Every semantic event the action emitted (refusals included) */
    events: ISemanticEvent[];
}
/**
 * The execution entry as the actor phase sees it — `(actor, action, slots)`
 * to the four phases (ADR-328 D2). Supplied by the engine, which owns the
 * `CommandExecutor`; the decision layer never constructs one.
 */
export type ExecutionEntry = (actorId: EntityId, actionId: string, slots?: ActSlots) => ActResult;
/**
 * Context passed to NPC behavior hooks: what the NPC can see of the world,
 * plus the two things a behavior can DO — act, and narrate.
 */
export interface NpcContext {
    /** The NPC entity */
    npc: IFEntity;
    /** The world model */
    world: WorldModel;
    /** Seeded random number generator */
    random: RandomService;
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
    /** Get exits from the NPC's current room the NPC is allowed to take */
    getAvailableExits(): {
        direction: DirectionType;
        destination: EntityId;
    }[];
    /**
     * Perform a standard action as this NPC, right now, through the real
     * execution entry (ADR-328 D5). Runs synchronously: the world has
     * changed (or the action was refused) by the time this returns, so a
     * behavior can act on the outcome — a refused take is `success: false`.
     * The action's events join this turn's stream in the order acted.
     *
     * @param actionId - A standard action id, e.g. `if.action.taking`
     * @param slots - The entities (and direction) the action operates on
     * @returns Whether the action ran, and the events it emitted
     */
    act(actionId: string, slots?: ActSlots): ActResult;
    /**
     * Say something to the player about this NPC that is not an action —
     * a growl, a greeting, a blocking line. Emits one `game.message` fact
     * with this NPC as its actor at the NPC's current location, so presence
     * tagging (ADR-328 D3) decides whether the player witnesses it and actor
     * voice (D4) renders it in the NPC's person.
     *
     * @param message - A message id resolved by the language layer, or
     *   `{ text }` for a line the behavior has already written in full
     * @param params - Template parameters for a message id
     */
    narrate(message: string | {
        text: string;
    }, params?: Record<string, unknown>): void;
}
/**
 * NPC behavior interface — the decision layer.
 *
 * Each hook is called with an {@link NpcContext} and does its work through
 * `context.act` and `context.narrate`; hooks return nothing. A behavior
 * that wants to wait simply does neither.
 */
export interface NpcBehavior {
    /** Unique identifier for this behavior */
    id: string;
    /** Human-readable name for debugging */
    name?: string;
    /**
     * Called each turn for this NPC.
     * This is the main hook for autonomous NPC behavior.
     */
    onTurn(context: NpcContext): void;
    /**
     * Called when the player enters the NPC's room
     */
    onPlayerEnters?(context: NpcContext): void;
    /**
     * Called when the player leaves the NPC's room
     */
    onPlayerLeaves?(context: NpcContext): void;
    /**
     * Optional: Get serializable state for save/load
     */
    getState?(npc: IFEntity): Record<string, unknown>;
    /**
     * Optional: Restore state after load
     */
    setState?(npc: IFEntity, state: Record<string, unknown>): void;
}
```

### npc/npc-messages

```typescript
/**
 * NPC Message IDs (ADR-070; ADR-328 D5)
 *
 * The message ids the standard behaviors narrate through
 * `NpcContext.narrate`. Actual text is provided by the language layer.
 * An NPC's ACTIONS are no longer narrated from here: a take, a move, an
 * attack renders through the action's own messages in the actor's voice
 * (ADR-328 D4), so the old `npc.takes`/`npc.enters`/`npc.attacks` family
 * has no producer and is gone.
 *
 * Public interface: NpcMessages const, NpcMessageId type.
 * Owner context: stdlib / npc
 */
/**
 * Message IDs the standard behaviors narrate
 */
export declare const NpcMessages: {
    readonly NPC_NOTICES_PLAYER: "npc.notices_player";
    readonly NPC_FOLLOWS: "npc.follows";
    readonly GUARD_BLOCKS: "npc.guard.blocks";
};
/**
 * Type for NPC message IDs
 */
export type NpcMessageId = (typeof NpcMessages)[keyof typeof NpcMessages];
```

### npc/character-messages

```typescript
/**
 * Character model state-change event types (ADR-141; ADR-318 D11)
 *
 * AUTHOR-CHANNEL ONLY (ADR-310 D12, retired as player surface in the
 * ADR-310/318 Phase 2 integration): these event types are projected by
 * the `character` channel for authoring tools and have no language-layer
 * rendering — no ID here may ever gain a player-facing prose path.
 *
 * Public interface: CharacterMessages const, CharacterMessageId type.
 * Owner context: stdlib / npc
 */
/**
 * Event types for character model state changes, emitted when an NPC's
 * cognitive or emotional state changes and consumed by the `character`
 * author channel ("explain this NPC's turn").
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
 * NPC Service (ADR-070; ADR-328 D5) — the decision layer.
 *
 * Holds the registered behaviors and tick phases, decides which NPCs may
 * act this turn, and gives each behavior a context to act through. It
 * executes nothing itself: every act a behavior chooses runs through the
 * execution entry the engine supplies on the tick context (`act`), which
 * is the same four-phase path the player's commands take. The engine owns
 * the per-turn tick (`CLAUDE.md` Logic Location: the NPC turn phase is the
 * engine's); this service is what that phase calls.
 *
 * Public interface: NpcService / createNpcService, INpcService,
 * NpcTickContext, NpcTickPhase.
 * Owner context: stdlib / npc.
 */
import { type ISemanticEvent, type EntityId, type RandomService } from '@sharpee/core';
import type { ISound } from '@sharpee/if-domain';
import { IFEntity, WorldModel } from '@sharpee/world-model';
import { type NpcBehavior, type ExecutionEntry } from './types.js';
/**
 * A tick phase handler that runs during NPC turn processing.
 * Registered by higher-level packages (e.g., @sharpee/character).
 */
export type NpcTickPhase = (npcs: IFEntity[], context: NpcTickContext) => ISemanticEvent[];
/**
 * Context for one NPC tick — what the engine hands the service each turn.
 */
export interface NpcTickContext {
    world: WorldModel;
    turn: number;
    random: RandomService;
    playerLocation: EntityId;
    playerId: EntityId;
    /**
     * The execution entry (ADR-328 D2/D5): how a behavior's chosen act, and
     * a tick phase's, becomes a real `(action, actorId)` invocation. The
     * engine supplies it; the service curries it per NPC as `NpcContext.act`.
     */
    act: ExecutionEntry;
    /**
     * The player action's events this turn (ADR-310 Phase 5) — input for
     * observation-driven tick phases (the character model's observe
     * sub-step). Optional and additive: callers without action events
     * (tests, bare harnesses) simply produce no observations.
     */
    actionEvents?: ISemanticEvent[];
    /**
     * Feed the engine's per-turn sound buffer (ADR-172; ADR-320 Phase 8) —
     * NPC↔NPC scene moves emit conversation sounds through this seam so
     * eavesdropping rides the spatial propagation path. Optional and
     * additive: absent on callers without the sound subsystem.
     */
    emitSound?: (sound: ISound) => void;
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
    /** Per-NPC behaviour state not held in the world model, by entity id (#226). */
    getBehaviorStates?(): Record<string, Record<string, unknown>>;
    /** Restore per-NPC behaviour state saved by `getBehaviorStates`. */
    setBehaviorStates?(states: Record<string, Record<string, unknown>>): void;
    /** Register a tick phase handler (ADR-142/144/145/146) */
    registerTickPhase(name: string, handler: NpcTickPhase): void;
    /** Run the NPC turn: every eligible NPC's `onTurn`, then the tick phases */
    tick(context: NpcTickContext): ISemanticEvent[];
    /** Notify NPCs that player entered a room */
    onPlayerEnters(world: WorldModel, roomId: EntityId, random: RandomService, turn: number, act: ExecutionEntry): ISemanticEvent[];
    /** Notify NPCs that player left a room */
    onPlayerLeaves(world: WorldModel, roomId: EntityId, random: RandomService, turn: number, act: ExecutionEntry): ISemanticEvent[];
}
/**
 * NPC Service implementation
 */
export declare class NpcService implements INpcService {
    private behaviors;
    /** Latest world seen by `tick` — serialization needs one to enumerate NPCs. */
    private lastWorld?;
    private readonly tickPhases;
    registerBehavior(behavior: NpcBehavior): void;
    removeBehavior(id: string): void;
    getBehavior(id: string): NpcBehavior | undefined;
    /**
     * Register a tick phase handler (ADR-142/144/145/146).
     * Phases run in registration order after behavior onTurn processing.
     *
     * @param name - Phase name for debugging
     * @param handler - Function called with active NPCs and tick context
     */
    registerTickPhase(name: string, handler: NpcTickPhase): void;
    /**
     * Run the NPC turn. Each eligible NPC's behavior decides through its
     * context; the acts it chooses have already run, and their events sit
     * in the returned stream in the order they were acted, followed by the
     * registered tick phases' events.
     *
     * @param context - The engine's tick context for this turn
     * @returns The turn's NPC-sourced events, in order
     */
    tick(context: NpcTickContext): ISemanticEvent[];
    /**
     * Notify NPCs that player entered a room
     */
    onPlayerEnters(world: WorldModel, roomId: EntityId, random: RandomService, turn: number, act: ExecutionEntry): ISemanticEvent[];
    /**
     * Notify NPCs that player left a room
     */
    onPlayerLeaves(world: WorldModel, roomId: EntityId, random: RandomService, turn: number, act: ExecutionEntry): ISemanticEvent[];
    /**
     * Whether an NPC can take a turn: it is an NPC, it is not the character
     * currently being played (ADR-327 D9), and — if it carries life-state —
     * is alive and conscious. An NPC with no `HealthTrait` is active by default
     * (opt-in life-state, ADR-226 §3). Reads health data via `HealthBehavior`, never a
     * trait getter, so it survives `loadJSON()`. This is the single turn-eligibility
     * source that makes the combat-kill sync bug (ADR-226 AC-2) impossible.
     */
    private canNpcAct;
    /**
     * Per-NPC behaviour state the world model cannot express (issue #226).
     *
     * A patrol's waypoint cursor, direction and remaining dwell live in the
     * behaviour: an NPC standing in a room could be arriving, leaving, or
     * waiting there, and only the behaviour knows which. Keyed by ENTITY id
     * because `getState(npc)` takes an entity — one registered behaviour can
     * serve several NPCs, and keying by behaviour would collapse them.
     */
    getBehaviorStates(): Record<string, Record<string, unknown>>;
    /**
     * Restore per-NPC behaviour state. An NPC absent from the save is reset
     * through its own `setState(npc, {})` — a restore is a reset, not a merge.
     */
    setBehaviorStates(states: Record<string, Record<string, unknown>>): void;
    private getActiveNpcs;
    private getBehaviorForNpc;
    /**
     * Build one NPC's context. `act` curries the execution entry to this
     * NPC and appends the act's events to `sink`; `narrate` appends one
     * `game.message` sourced by the NPC at wherever it stands when it
     * speaks — after a move, that is the new room. Both write to the same
     * sink so the turn's stream keeps the order the behavior acted in.
     */
    private createNpcContext;
    private getExitsFromRoom;
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
import { type ISemanticEvent, type EntityId } from '@sharpee/core';
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
 * 3. Applies default state transition rules.
 * 4. Checks lucidity triggers.
 * 5. Injects hallucinated facts (augmented perception).
 * 6. Emits observable behavior events for state changes.
 *
 * Knowledge topics are NOT minted here (ADR-310 D10): raw event types are
 * platform wire vocabulary, not author-facing topics. Witnessed events
 * become knowledge only through act detection's derived topics
 * (@sharpee/character, D12a) and authored `knows` declarations.
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
import { type ISemanticEvent } from '@sharpee/core';
import { IFEntity, WorldModel, CharacterModelTrait, type DecayRate } from '@sharpee/world-model';
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
 * Standard NPC Behaviors (ADR-070; ADR-328 D5)
 *
 * Reusable behavior patterns for common NPC archetypes.
 * These are generic behaviors that can be used in any IF game.
 * Game-specific behaviors (thief, cyclops, etc.) should be defined in the story.
 *
 * Every act here is a real standard action run as the NPC through
 * `context.act` — a guard's attack is `if.action.attacking`, a wanderer's
 * step is `if.action.going` — so the world's rules apply to it exactly as
 * they apply to the player.
 *
 * Public interface: guardBehavior, passiveBehavior, createWandererBehavior,
 * createFollowerBehavior, createPatrolBehavior.
 * Owner context: stdlib / npc
 */
import { type NpcBehavior } from './types.js';
/**
 * Guard behavior - stationary NPC that blocks passage and fights back
 *
 * Guards:
 * - Don't move on their own
 * - Narrate a blocking line when the player enters
 * - Attack the player each turn while hostile and engaged
 */
export declare const guardBehavior: NpcBehavior;
/**
 * Wanderer behavior - NPC that moves randomly between rooms
 *
 * Wanderers:
 * - Move randomly with configurable probability
 * - Respect room restrictions
 * - Acknowledge the player's arrival
 *
 * Arrival in the player's room is narrated by the going action itself
 * (the player witnesses the NPC enter), not by the behavior.
 */
export declare function createWandererBehavior(options?: {
    /** Probability of moving each turn (0-1) */
    moveChance?: number;
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

### death/kill-player

```typescript
/**
 * `killPlayer` — the single Sharpee-Way player-death primitive (ADR-224 Decision 2).
 *
 * Every death mechanism (combat, a deadly-room verb-allowlist, a probabilistic
 * grue, a gas interceptor, a scheduler daemon) calls this instead of hand-mutating
 * a dead flag or hand-emitting an ad-hoc event. It applies the lethal transition to
 * the player's `HealthTrait` (the single mortality substrate, ADR-226) and returns
 * the canonical {@link PLAYER_DIED_EVENT}; the caller routes that event into its
 * event stream (an action's report list, an interceptor's effects, a daemon's
 * returned events). The engine observes the event and owns game-over routing.
 *
 * Public interface: `killPlayer`.
 * Owner context: `@sharpee/stdlib` — the player-death primitive (ADR-224).
 */
import type { ISemanticEvent } from '@sharpee/core';
import type { IFEntity, WorldModel } from '@sharpee/world-model';
/**
 * Options for {@link killPlayer}.
 */
export interface IKillPlayerOptions {
    /** Cause of death, recorded on the event and on `HealthTrait.causeOfDeath`. */
    cause: string;
    /** Optional death-text message id (language layer renders it — never English here). */
    messageId?: string;
    /**
     * Terminal-death intent (ADR-224 Q-2). Defaults to `true`. A story reincarnation
     * policy reads this off the event but the engine's decision is the player's derived
     * life-state after dispatch, so `terminal:false` alone does not keep the game running.
     */
    terminal?: boolean;
}
/**
 * Kill the player: apply a terminal lethal transition to the player's `HealthTrait`
 * and produce the canonical death event.
 *
 * Lazily attaches a `HealthTrait` if the player has none — a death-capable game must
 * always give `killPlayer`'s lethal transition a target (ADR-223 AC-1 caveat), so the
 * `HealthTrait` opt-in rule does not apply to the player in such a game.
 *
 * Idempotent: if the player is already flagged `dead`, this is a no-op that returns
 * `null`, so a second call in the same turn does not re-emit the event or double-route
 * game-over. The guard is the flag alone, never `health > 0`: combat that has already
 * driven the player's health to zero this turn still owes the canonical event, and this
 * is the one place the lethal flag is set for the player.
 *
 * @param world the world model (unused today; kept for signature stability and future scope resolution)
 * @param player the player entity to kill
 * @param opts cause, optional message id, terminal intent (default `true`)
 * @returns the canonical `if.event.player.died` event, or `null` if the player was already dead
 */
export declare function killPlayer(world: WorldModel, player: IFEntity, opts: IKillPlayerOptions): ISemanticEvent | null;
```

### death/player-death-events

```typescript
/**
 * Canonical player-death event — the single wire shape for ADR-224.
 *
 * One typed event, `if.event.player.died`, that both the emitter (`killPlayer`,
 * this module) and the consumers (the stdlib `death` channel and the engine's
 * game-over routing) import from here. Defining the type string and payload once,
 * imported by both sides, is the co-located wire-type discipline (DEVARCH rule 8b):
 * a change to the payload compiles — or fails to compile — every side in the same
 * commit, so the four-way event-name drift ADR-224 catalogued cannot recur.
 *
 * The engine (`@sharpee/engine`) depends on stdlib, not the reverse, so this is the
 * correct home: the lower layer owns the vocabulary, the runtime consumes it.
 *
 * Public interface: `PLAYER_DIED_EVENT`, `IPlayerDiedPayload`.
 * Owner context: `@sharpee/stdlib` — the player-death primitive (ADR-224).
 */
/**
 * The canonical death event type (ADR-224 Q-3). Lives in the platform
 * `if.event.*` namespace because death is not combat-specific — combat is one
 * `cause` among falls, grue, and gas. Retires the pre-ADR-224 split across
 * `combat.player_died`, `if.event.death` (player case), and the bare `player.died`.
 */
export declare const PLAYER_DIED_EVENT: "if.event.player.died";
/**
 * Payload of a {@link PLAYER_DIED_EVENT}. Carried on the event's `data` field.
 */
export interface IPlayerDiedPayload {
    /** What killed the player: `'combat'`, `'gas'`, `'grue'`, `'fall'`, etc. Also recorded on the player's `HealthTrait.causeOfDeath`. */
    cause: string;
    /**
     * Terminal-death intent (ADR-224 Q-2). `true` means the engine routes to
     * `game.lost` unless a story policy vetoes first. The engine's final word is
     * the player's derived life-state after dispatch, not this flag (see the
     * routing contract); the flag is the story policy's signal.
     */
    terminal: boolean;
    /** Optional message id for the death text (rendered by the language layer, never an English string here — ADR-158). */
    messageId?: string;
}
```

### death/probabilistic-death

```typescript
/**
 * Seeded probabilistic-death helper (ADR-224 Decision 3, ADR-293).
 *
 * A thin, intention-revealing wrapper so a probabilistic hazard (the grue: a
 * move in the dark is lethal only some of the time) draws on its own declared
 * choice point (ADR-293 D2/D3) and is replay-deterministic under a fixed
 * master seed. Centralising the roll here is also the enforcement point for
 * the project RNG policy: probabilistic death draws through the point handle
 * exclusively — `Math.random()` is never acceptable.
 *
 * Public interface: `rollLethal`, `PROBABILISTIC_DEATH_POINT`.
 * Owner context: `@sharpee/stdlib` — the player-death primitive (ADR-224).
 */
import { type RandomService } from '@sharpee/core';
/** The probabilistic-death hazard's choice point (single yes/no draw). */
export declare const PROBABILISTIC_DEATH_POINT: import("@sharpee/core").ChoicePoint<"yes" | "no">;
/**
 * Whether a probabilistic hazard is lethal this time. One draw on the
 * `stdlib.probabilistic-death.lethal` point's own stream.
 *
 * @param probability chance of death in `[0, 1]` (e.g. `0.75` = the grue's 75% kill)
 * @param random the session's per-point stream owner — the sole randomness source
 * @returns `true` with probability `probability`, deterministically for a given master seed
 */
export declare function rollLethal(probability: number, random: RandomService): boolean;
```

### death/deadly-room-transformer

```typescript
/**
 * Deadly-room command transformer (ADR-224 Decision 3).
 *
 * Runs after parse / before validate: while the player stands in a room carrying
 * `DeadlyRoomTrait`, a verb outside the room's safe allowlist is redirected to the
 * generic {@link DEADLY_ROOM_DEATH_ACTION_ID} action (whose `report()` calls
 * `killPlayer`). This is the seam MDL's Aragain Falls needs — "every verb but LOOK
 * is fatal here" catches objectless verbs (WAIT, INVENTORY) an ADR-208 action
 * interceptor could never see, because interceptors resolve on a direct object.
 *
 * The engine auto-registers this transformer (like a standard plugin), injecting
 * its seeded RNG for the probabilistic (`chance`) variant. The transformer is a
 * plain `(parsed, world) => parsed` function so stdlib need not import the engine's
 * `ParsedCommandTransformer` type — that would invert the dependency direction.
 *
 * Public interface: `createDeadlyRoomTransformer`, `DEADLY_ROOM_DEATH_ACTION_ID`,
 * `DEADLY_ROOM_CAUSE_KEY`, `DEADLY_ROOM_MESSAGE_KEY`.
 * Owner context: `@sharpee/stdlib` — the player-death primitive (ADR-224).
 */
import { type RandomService } from '@sharpee/core';
import type { IParsedCommand, WorldModel } from '@sharpee/world-model';
/**
 * The deadly room's probabilistic-lethality choice point (ADR-293). Only the
 * `chance` variant draws; safe verbs and always-lethal rooms are
 * deterministic short-circuits that sit outside the point and draw nothing
 * (D8).
 */
export declare const DEADLY_ROOM_LETHAL_POINT: import("@sharpee/core").ChoicePoint<"yes" | "no">;
/** The generic platform action a lethal deadly-room verb is redirected to. */
export declare const DEADLY_ROOM_DEATH_ACTION_ID = "if.action.deadly_room_death";
/** `extras` key carrying the death cause from the transformer to the death action. */
export declare const DEADLY_ROOM_CAUSE_KEY = "deadlyRoomCause";
/** `extras` key carrying the optional death message id. */
export declare const DEADLY_ROOM_MESSAGE_KEY = "deadlyRoomMessageId";
/**
 * Build the deadly-room transformer. Returns the parsed command unchanged unless
 * the player's room has a `DeadlyRoomTrait` and the command's verb is lethal there,
 * in which case it redirects to the generic death action, threading the cause and
 * message id through `extras`.
 *
 * @param random the session's per-point stream owner, used only for the probabilistic (`chance`) variant
 */
export declare function createDeadlyRoomTransformer(random?: RandomService): (parsed: IParsedCommand, world: WorldModel) => IParsedCommand;
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
export { OPENED_REVEALED_CHAIN_KEY } from './opened-revealed.js';
export { createOpenedRevealedChain } from './opened-revealed.js';
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
import { Action } from '../actions/enhanced-types.js';
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

### utils/noun-phrase

```typescript
/**
 * @file noun-phrase.ts
 * @module @sharpee/stdlib/utils
 *
 * Bridges world-model's `IFEntity` to a language-neutral `NounPhrase`
 * (ADR-192), replacing `entityInfoFrom` (ADR-158). stdlib is the only package
 * depending on both `@sharpee/world-model` (source of `IFEntity`) and
 * `@sharpee/if-domain` (home of the `Phrase` algebra), so the producer lives
 * here.
 *
 * Public interface: `nounPhraseFor(entity, ctx)`.
 *
 * Per ADR-192 §3 the field mapping is the producer's contract — every step is
 * named so none is silently dropped. The leading article hint from the template
 * (`{the item}`) overrides the `nounType`-derived `articleType` default; the
 * legacy `article: 'a'|'an'` literal is NOT mapped (the Assembler computes the
 * surface — D4).
 *
 * @see ADR-192 Phrase Algebra — Phrase Model & Assembler Core
 * @see ADR-158 (superseded) Entity-Valued Message Params Carry EntityInfo
 */
import { type NounPhrase, type RenderContext } from '@sharpee/if-domain';
import { IFEntity } from '@sharpee/world-model';
/** Options for {@link nounPhraseFor}. */
export interface NounPhraseOptions {
    /**
     * Prepend live state-derived adjectives ("open", "locked") from the entity's
     * traits (ADR-193). Default `false` — only producers that *describe* an object's
     * state opt in, avoiding redundancy like "open the open box".
     */
    stateAdjectives?: boolean;
}
/**
 * Build a `NounPhrase` from an `IFEntity` for use as a message-template
 * parameter value. With no `IdentityTrait`, returns a minimal indefinite
 * singular noun so callers need no null guards.
 *
 * @param entity any IFEntity — typically the noun, container, or target from an
 *               action's command or a capability behavior
 * @param _ctx the render context — reserved for computed names (ADR-193+); the
 *             mapping does not consult it yet
 * @param opts options — set `stateAdjectives` to prepend live trait-state adjectives
 * @returns a `NounPhrase` carrying the entity's grammatical metadata
 */
export declare function nounPhraseFor(entity: IFEntity, _ctx?: RenderContext, opts?: NounPhraseOptions): NounPhrase;
```

### channels/registry

```typescript
/**
 * @sharpee/stdlib/channels — channel registry instance.
 *
 * Owner context: stdlib language layer. Hosts the canonical
 * `IChannelRegistry` instance for Sharpee's channel-I/O system.
 * Engine bootstrap imports this instance, lets stories register their
 * channels onto it (`Story.registerChannels?.(registry)`), then hands
 * it to a fresh `ChannelService` (per ADR-163 §13, §14).
 *
 * The instance is populated at module init with the ten standard
 * channels and the eleven static media channels. The `Story.registerChannels`
 * hook may add story-specific channels or override standards by
 * re-registering with the same id (last-write-wins per ADR-163 §6).
 *
 * Lifecycle: a fresh `ChannelService` is created per session
 * (engine restart, RESTART command). The registry itself is reused —
 * stdlib's standard channels stay registered across sessions, and the
 * `ChannelService`'s per-session `prevValues` map provides the
 * isolation. The Story.registerChannels hook is invoked once per
 * engine bootstrap; if a story overrides a standard channel, that
 * override persists for the lifetime of the engine instance.
 *
 * Tests can construct their own `IChannelRegistry` instance for
 * isolation (unit tests should not depend on this singleton's
 * pre-populated state for behavior-specific assertions).
 *
 * @see ADR-163 — Channel-Service Platform — §6, §7, §13, §14
 */
import type { IChannelRegistry, IOChannel } from '@sharpee/if-domain';
/**
 * In-memory `IChannelRegistry` implementation. Last-write-wins on
 * `add(channel)` by `channel.id` — which is how stories override
 * platform standards (ADR-163 §6).
 */
export declare class StdlibChannelRegistry implements IChannelRegistry {
    private readonly channels;
    add(channel: IOChannel): void;
    get(id: string): IOChannel | undefined;
    all(): readonly IOChannel[];
    /**
     * Test-only helper: snapshot the current channel ids. Stable
     * iteration order matches insertion order (Map semantics).
     */
    ids(): readonly string[];
}
/**
 * The canonical channel registry instance for Sharpee. Pre-populated
 * with ten standard channels (`main`, `prompt`, `score`, `turn`,
 * `location`, `info`, `ifid`, `death`, `endgame`, `score_notify`)
 * plus eleven static media channels (`image:preload`,
 * `image:background`, `image:main`, `image:overlay`, `sound`,
 * `music`, `animation`, `animate`, `transition`, `layout`, `clear`).
 *
 * Engine bootstrap consumes this directly; stories extend through
 * the `Story.registerChannels?(registry)` hook.
 */
export declare const channelRegistry: IChannelRegistry;
```

### channels/standard

```typescript
/**
 * @sharpee/stdlib/channels — standard `IOChannel` definitions.
 *
 * Owner context: stdlib language layer. The platform-vocabulary
 * channels from ADR-163 §4 — co-located with stdlib because their
 * closures read stdlib data sources (capabilities, blocks the
 * text-service produces, world projections).
 *
 * Per ADR-300 D8 there is no `main`: the seven prose elements each have
 * their own channel and the turn's reading order rides `preferred-layout`
 * (D9). Nothing here is "the prose window" — assembling one is the
 * client's decision, and `composeProse` in `@sharpee/channel-service` is
 * the shared rule for clients that want the engine's own order.
 *
 * Per ADR-163 §6, channels are self-contained: each `IOChannel`
 * carries its identity, configuration, and a closure that computes
 * the channel's value for the current turn from the
 * `ChannelProduceContext`. There is no separate rule schema or
 * routing layer; closures are the routing.
 *
 * **Standard channels are NOT capability-gated** (per §6 — they exist
 * on every surface). Media channels gate; standards do not.
 *
 * @see ADR-163 — Channel-Service Platform — §4, §5, §6
 */
import type { IOChannel, ProseEntry } from '@sharpee/if-domain';
/**
 * Event types the standard channels listen for. Stories or extensions
 * that want to populate `death`, `endgame`, or `score_notify` emit
 * events of these types; stdlib does not emit them itself.
 *
 * The values align with what the engine and stdlib extensions actually
 * emit today:
 *
 * - `game.won` / `game.lost` — engine emits these from `engine.stop()`
 *   via `createGameWonEvent` / `createGameLostEvent` (core/events).
 * - `if.event.player.died` — the canonical player-death event (ADR-224),
 *   emitted by `killPlayer` from any death mechanism (combat, hazard,
 *   grue, gas). Re-pointed here from the pre-ADR-224 `combat.player_died`
 *   (a hard cutover — no alias; that name and its `@sharpee/ext-basic-combat`
 *   producer are retired). The `PLAYER_DIED` constant is the canonical
 *   `PLAYER_DIED_EVENT` imported from the `death` module so emitter and
 *   channel never drift (one wire shape).
 * - `game.score_changed` — no production emitter today. The channel
 *   listens for it, but it stays silent until a story or extension
 *   adopts the convention. Listed for forward-compatibility.
 *
 * Each event carries its message in `event.data.message` (string).
 */
export declare const STANDARD_CHANNEL_EVENTS: {
    readonly PLAYER_DIED: "if.event.player.died";
    readonly GAME_WON: "game.won";
    readonly GAME_LOST: "game.lost";
    readonly SCORE_CHANGED: "game.score_changed";
};
/** `room-name` — the room title line. */
export declare const roomNameChannel: IOChannel<ProseEntry>;
/** `room-description` — the room's body prose. */
export declare const roomDescriptionChannel: IOChannel<ProseEntry>;
/** `room-contents` — what is visible in the room. */
export declare const roomContentsChannel: IOChannel<ProseEntry>;
/** `action-result` — an action's success narration. */
export declare const actionResultChannel: IOChannel<ProseEntry>;
/** `action-blocked` — why an action refused. */
export declare const actionBlockedChannel: IOChannel<ProseEntry>;
/** `error` — parser and system errors. */
export declare const errorChannel: IOChannel<ProseEntry>;
/** `game-message` — story and game-level messages. */
export declare const gameMessageChannel: IOChannel<ProseEntry>;
/**
 * Every prose channel, in `PROSE_CHANNEL_IDS` order. Registration order,
 * not render order — see `preferredLayoutChannel`.
 */
export declare const PROSE_CHANNELS: ReadonlyArray<IOChannel<ProseEntry>>;
/**
 * `preferred-layout` — replace-mode reading order for this turn's prose
 * (ADR-300 D9).
 *
 * One entry per prose entry emitted this turn, naming the channel that
 * produced it, in block order. A channel id repeats when it produced
 * more than one entry, so the list reconstructs the engine's sequence
 * exactly — including the interleavings a fixed render order gets
 * wrong, like a move whose action result prints before the room name.
 *
 * It emits `always`, including the empty array on a turn that produced
 * no prose: a client composing from it needs to know the turn said
 * nothing, not re-render the previous turn.
 *
 * The engine's ordering knowledge does not vanish with `main` — it
 * stops being smuggled inside an append stream and becomes a signal a
 * client is free to disagree with.
 */
export declare const preferredLayoutChannel: IOChannel<string[]>;
/**
 * `prompt` — replace-mode input prompt. Defaults to `'> '` when no
 * prompt block is emitted, so the renderer always has a sensible
 * placeholder. Closure flattens the prompt block's content to plain
 * string (decorations stripped).
 */
export declare const promptChannel: IOChannel<string>;
/**
 * `location` — replace-mode status-line location name. Closure reads
 * the player's containing room from the world and returns its display
 * name. Returns `undefined` (the channel re-emits its prevValue) if
 * the world has no player or the room cannot be resolved.
 */
export declare const locationChannel: IOChannel<string>;
/**
 * `score` — replace-mode `{current, max}` payload.
 *
 * Reads the canonical ADR-129 score ledger first (`world.getScore()`
 * and `world.getMaxScore()`); falls back to the legacy `scoring`
 * capability's `scoreValue`/`maxScore` for older worlds that haven't
 * adopted the ledger. The fallback path also serves stories that
 * track score outside the ledger (rare; ADR-129 is the recommended
 * pattern).
 *
 * `max: null` (not `0`) signals an unbounded score per ADR-163 §4
 * commentary; `maxScore: 0` is treated as null since a 0-cap scoring
 * system has no usable progress fraction.
 *
 * Returns `undefined` only when the world is missing entirely (test
 * harness with a stub) — `always`-mode then re-emits prev.
 */
export declare const scoreChannel: IOChannel<{
    current: number;
    max: number | null;
}>;
/**
 * `turn` — replace-mode turn count. Closure returns `ctx.turn`
 * directly. Always emits because the turn counter changes every turn.
 */
export declare const turnChannel: IOChannel<number>;
/**
 * Wire shape for the `info` channel — full story metadata.
 *
 * Optional fields are omitted from the emitted payload when empty so
 * renderers can branch cleanly on presence. The engine populates the
 * underlying `storyInfo` capability from `StoryConfig` + `StoryInfoTrait`
 * during `setStory()`.
 */
export interface StoryInfoPayload {
    title?: string;
    authors?: string[];
    testers?: string[];
    version?: string;
    description?: string;
    buildDate?: string;
    engineVersion?: string;
    clientVersion?: string;
}
/**
 * `info` — replace-mode story metadata. Closure projects every
 * non-empty field from the `storyInfo` capability into a single
 * payload object. The same payload is consumed by the browser
 * `info` renderer (sets `document.title` + `data-*` attributes) and
 * by any author-supplied dashboards.
 */
export declare const infoChannel: IOChannel<StoryInfoPayload>;
/**
 * `ifid` — replace-mode IFID string. Closure reads `storyInfo.ifid`
 * and skips emission when the value is empty (sparse-suppress style),
 * so stories without an IFID don't emit empty strings into the
 * channel state.
 */
export declare const ifidChannel: IOChannel<string>;
/**
 * Structured opening banner (ADR-163 §channel content types).
 *
 * Each piece is its own property rather than a run of prose lines, so a client
 * decides how the title, the versions and the credits are laid out instead of
 * receiving somebody else's paragraph breaks. A test can name one piece.
 */
export interface BannerData {
    title?: string;
    storyVersion?: string;
    platformVersion?: string;
    subtitle?: string;
    credits?: string[];
    /** Story-supplied closing lines (`game.banner.story-tail`). */
    tail?: string[];
}
/**
 * `banner` — replace-mode opening banner, carried as structured JSON.
 *
 * Its own channel rather than part of `main` so the opening is addressable:
 * the banner, the prologue and the first command's response become three
 * things a transcript can check separately, and a client can put the banner
 * wherever it wants instead of wherever the prose happened to land.
 *
 * The engine builds these blocks once, from `game.started`, so a turn that
 * produces none emits nothing.
 */
export declare const bannerChannel: IOChannel<BannerData>;
/**
 * `prologue` — replace-mode pre-banner prologue text (ADR-298 D3).
 * Closure reads `storyInfo.prologue` — resolved text the engine wrote
 * at story start (phrase references already resolved through the
 * phrase machinery) — and skips emission when absent or empty
 * (sparse-suppress, same pattern as `ifidChannel`). Emitted once in
 * practice: the value is set before the first packet and replace-mode
 * carries it unchanged. The platform's default client rendering order
 * places it before the banner.
 */
export declare const prologueChannel: IOChannel<string>;
/**
 * `death` — event-mode death notification. Closure looks for the
 * canonical `if.event.player.died` event (ADR-224) in this turn's events
 * and projects its `data.message` field. Stories that want different death
 * handling register a replacement `IOChannel` with id `'death'`
 * (last-write-wins per ADR-163 §6).
 */
export declare const deathChannel: IOChannel<string>;
/**
 * `endgame` — event-mode endgame notification (game won OR game lost
 * — the closure folds both into one channel since renderers typically
 * present them similarly). Closure scans for either event type and
 * returns the message of the first match.
 */
export declare const endgameChannel: IOChannel<string>;
/**
 * `score_notify` — event-mode transient score-change announcement.
 * Closure scans for `if.event.score_changed` and emits its message.
 */
export declare const scoreNotifyChannel: IOChannel<string>;
/**
 * Discriminator values for `LifecyclePayload`.
 *
 * - `save_failed` — save handler reported failure or threw.
 * - `restore_failed` — restore handler returned no data, threw, or
 *   was not registered.
 * - `restore_completed` — restore succeeded; renderers should refresh
 *   any cached UI derived from world state.
 */
export type LifecycleEventKind = 'save_failed' | 'restore_failed' | 'restore_completed';
/**
 * Wire shape for the `lifecycle` channel. `message` is populated for
 * the failure kinds and copied verbatim from the platform event's
 * `payload.error` field. Successful kinds (`restore_completed`) carry
 * no message — they are pure signals.
 */
export interface LifecyclePayload {
    kind: LifecycleEventKind;
    message?: string;
}
/**
 * `lifecycle` — event-mode save/restore signals. Projects the trio of
 * platform completion events (`platform.save_failed`,
 * `platform.restore_failed`, `platform.restore_completed`) into a
 * single sparse channel.
 *
 * Renderers branch on `payload.kind`: failures display `payload.message`
 * (or a fallback string), `restore_completed` triggers UI refresh
 * without text. Sparse-emit semantics mean turns without a lifecycle
 * event suppress emission entirely — the channel value retains its
 * prior state on quiet turns.
 *
 * If multiple lifecycle events appear in one turn, the **last** one
 * wins. In practice this is unobservable since each save/restore
 * operation produces exactly one completion event, but the rule is
 * documented so test authors don't expect first-wins semantics.
 */
export declare const lifecycleChannel: IOChannel<LifecyclePayload>;
/**
 * The platform-standard channels in iteration order. Order is
 * preserved for stable diffing in tests and manifests; the
 * `ChannelService` itself does not depend on ordering.
 */
export declare const STANDARD_CHANNELS: ReadonlyArray<IOChannel>;
/**
 * Channel id literals for the platform-standard set. Used by tests
 * and consumers that need string-literal types.
 */
export declare const STANDARD_CHANNEL_IDS: {
    readonly ROOM_NAME: "room-name";
    readonly ROOM_DESCRIPTION: "room-description";
    readonly ROOM_CONTENTS: "room-contents";
    readonly ACTION_RESULT: "action-result";
    readonly ACTION_BLOCKED: "action-blocked";
    readonly ERROR: "error";
    readonly GAME_MESSAGE: "game-message";
    readonly PREFERRED_LAYOUT: "preferred-layout";
    readonly PROMPT: "prompt";
    readonly LOCATION: "location";
    readonly SCORE: "score";
    readonly TURN: "turn";
    readonly INFO: "info";
    readonly IFID: "ifid";
    readonly PROLOGUE: "prologue";
    readonly BANNER: "banner";
    readonly DEATH: "death";
    readonly ENDGAME: "endgame";
    readonly SCORE_NOTIFY: "score_notify";
    readonly LIFECYCLE: "lifecycle";
    readonly CHARACTER: "character";
    readonly SCENE: "scene";
    readonly EXCHANGE_AFFORDANCES: "exchange-affordances";
    readonly THREAD_AFFORDANCES: "thread-affordances";
};
export type StandardChannelId = (typeof STANDARD_CHANNEL_IDS)[keyof typeof STANDARD_CHANNEL_IDS];
```

### channels/character-author

```typescript
/**
 * The `character` author channel (ADR-318 D11; ADR-310 D12).
 *
 * The character model's introspection surface: projects the turn's
 * character-model events — arbiter bookkeeping (`character.author.*`)
 * and trait state transitions (`npc.character.*`) — into structured
 * per-NPC rows for authoring tools ("explain this NPC's turn"). Systemic
 * behavior that cannot be traced is indistinguishable from a bug.
 *
 * Isolation is the point (ADR-310 D12): these rows are raw model data,
 * never rendered as player prose — no row carries a message ID with a
 * player-facing rendering path. Clients that don't understand the
 * channel ignore it (additive channels don't bump the wire version).
 *
 * Public interface: characterAuthorChannel, CharacterAuthorRow.
 * Owner context: stdlib / channels
 */
import type { IOChannel } from '@sharpee/if-domain';
/** One author-channel row: one character-model event, attributed to its NPC. */
export interface CharacterAuthorRow {
    /** Turn the event fired on. */
    turn: number;
    /** The event type, e.g. 'character.author.ledger_mint'. */
    kind: string;
    /** The NPC the event is about (the event's actor). */
    npcId?: string;
    /** The event's payload, verbatim. */
    data: Record<string, unknown>;
}
/**
 * `character` — append-mode author-channel rows (ADR-318 D11). Carries,
 * per NPC turn: ledger mints and pins, pressure deposits and band
 * transitions, paralysis warnings (from `character.author.*`), and
 * mood/threat/lucidity/knowledge transitions (from `npc.character.*`).
 * Sparse: turns with no character-model activity emit nothing.
 */
export declare const characterAuthorChannel: IOChannel<CharacterAuthorRow>;
```

### channels/scene

```typescript
/**
 * The `scene` and `exchange-affordances` author channels (ADR-320 D12).
 *
 * The presentation-agnostic conversation wire, carried as channel data
 * under the ADR-163 discipline (data only, clients render):
 *
 *  - `scene` projects the turn's scene wire events — `character.scene.*`
 *    (the `SceneWireEvent` kinds plus dispatch diagnostics like
 *    `intrusion_blocked` / `exit_refused`) and `character.exchange.*` —
 *    into per-turn rows, the same projection idiom as the `character`
 *    channel.
 *  - `exchange-affordances` projects every live scene's open exchange
 *    advertised-response set (`ExchangeAffordances`) from the scene
 *    store — pure state projection, so a mid-exchange restore
 *    re-advertises correctly.
 *  - `thread-affordances` projects every live scene's active-thread
 *    continuability (`ThreadContinuability`, ADR-320 D14 — "Kemp has
 *    more to say") from the same store under the same pure-projection
 *    discipline, so a mid-beat restore re-advertises correctly.
 *
 * Isolation is the point (ADR-320 AC11, the ADR-310 D12/AC8 discipline):
 * both channels are gated by the `authorChannels` capability, so a
 * published player-facing story stream provably cannot carry scene
 * internals — the player sees rendered prose alone. A chat-style client
 * that renders the stream itself is a future, deliberate ungating
 * decision, not this channel's.
 *
 * Public interface: sceneChannel, SceneChannelRow,
 * exchangeAffordancesChannel, threadAffordancesChannel.
 * Owner context: stdlib / channels
 */
import type { IOChannel } from '@sharpee/if-domain';
import type { ExchangeAffordances, ThreadContinuability } from '@sharpee/world-model';
/** One scene-wire row: one `character.scene.*`/`character.exchange.*` event. */
export interface SceneChannelRow {
    /** Turn the event fired on. */
    turn: number;
    /** The event type, e.g. 'character.scene.utterance'. */
    kind: string;
    /** The event's payload, verbatim — a `SceneWireEvent` for wire kinds. */
    data: Record<string, unknown>;
}
/**
 * `scene` — append-mode scene wire stream (ADR-320 D12). Carries, per
 * turn: scene opens/closes, utterances with manner beats, floor changes,
 * interruptions, rendered silences (dispatch and NPC↔NPC alike), and
 * exchange lifecycle diagnostics. Sparse: turns with no scene activity
 * emit nothing.
 */
export declare const sceneChannel: IOChannel<SceneChannelRow>;
/**
 * `exchange-affordances` — replace-mode advertised-response sets (ADR-320
 * D12): one `ExchangeAffordances` per live scene with an open exchange,
 * in scene-store order; the empty array when no exchange is open. Emits
 * every turn so a consumer never renders a closed exchange's stale
 * choices. Reads the scene store (world state) rather than events — the
 * affordances are state of the open exchange, snapshotted onto
 * `ExchangeState.responses` at open time, so the projection survives
 * save/restore.
 */
export declare const exchangeAffordancesChannel: IOChannel<ExchangeAffordances[]>;
/**
 * `thread-affordances` — replace-mode active-thread continuability
 * (ADR-320 D14, additive to the D12 affordance surface): one
 * `ThreadContinuability` per live scene with an active thread, in
 * scene-store order; the empty array when none. Emits every turn so a
 * consumer never renders a parked or concluded thread's stale "more to
 * say". Reads the scene store — the snapshot is stamped at
 * open/beat/resume and cleared at park/conclude
 * (`stampThreadContinuability`), so the projection survives
 * save/restore exactly as `exchange-affordances` does.
 */
export declare const threadAffordancesChannel: IOChannel<ThreadContinuability[]>;
```

### channels/media

```typescript
/**
 * @sharpee/stdlib/channels — media `IOChannel` definitions.
 *
 * Owner context: stdlib language layer. The platform media-channel
 * vocabulary from ADR-163 §7. Each channel is capability-gated; the
 * `ChannelService` filters gated channels out of the per-client
 * manifest using `IOChannel.gatedBy`.
 *
 * Closures listen for the corresponding `media.*` event type on the
 * turn's `events` array and project the event's payload (with the two
 * ADR-163 §7 renames: `media.sound.play` `channel?` → `bus?`;
 * `media.image.show` hotspots `action` → `command`; and the §9 drop
 * of `media.animation.play.onComplete`).
 *
 * Hide/stop events (`media.image.hide`, `media.music.stop`,
 * `media.ambient.stop`) emit `null` on the corresponding replace-mode
 * media channel — the renderer interprets `null` as "hide / stop".
 *
 * **Dynamic channels** — `image:<layer>` (custom layer beyond
 * `image:background`/`image:main`/`image:overlay`) and `ambient:<id>`
 * are NOT registered here. Stories register them through their own
 * `Story.registerChannels` hook; `createAmbientChannel(id)` and
 * `createImageChannel(layer)` are convenience builders.
 *
 * @see ADR-163 — Channel-Service Platform — §6, §7, §9
 */
import type { IOChannel } from '@sharpee/if-domain';
import type { ISemanticEvent } from '@sharpee/core';
/**
 * Media event types from ADR-101 (folded into channel emissions per
 * ADR-163 §7).
 */
export declare const MEDIA_EVENT_TYPES: {
    readonly IMAGE_SHOW: "media.image.show";
    readonly IMAGE_HIDE: "media.image.hide";
    readonly IMAGE_PRELOAD: "media.image.preload";
    readonly SOUND_PLAY: "media.sound.play";
    readonly MUSIC_PLAY: "media.music.play";
    readonly MUSIC_STOP: "media.music.stop";
    readonly AMBIENT_PLAY: "media.ambient.play";
    readonly AMBIENT_STOP: "media.ambient.stop";
    readonly ANIMATION_PLAY: "media.animation.play";
    readonly ANIMATE: "media.animate";
    readonly TRANSITION: "media.transition";
    readonly LAYOUT_CONFIGURE: "media.layout.configure";
    readonly CLEAR: "media.clear";
};
export type MediaEventType = (typeof MEDIA_EVENT_TYPES)[keyof typeof MEDIA_EVENT_TYPES];
/**
 * Resolve the `image:<layer>` channel id from a `media.image.show` /
 * `media.image.hide` event payload. Defaults to `image:main`.
 */
export declare function imageChannelIdFromEvent(event: ISemanticEvent): string;
/**
 * Construct an `image:<layer>` `IOChannel`. Standard layers
 * (`background`, `main`, `overlay`) are pre-registered; stories add
 * additional layers via this builder.
 */
export declare function createImageChannel(layer: string): IOChannel;
export declare const imageBackgroundChannel: IOChannel;
export declare const imageMainChannel: IOChannel;
export declare const imageOverlayChannel: IOChannel;
/**
 * `image:preload` — event-mode preload trigger. Renderers download
 * the asset; not displayed.
 */
export declare const imagePreloadChannel: IOChannel;
/**
 * `sound` — event-mode sound effect.
 */
export declare const soundChannel: IOChannel;
/**
 * `music` — replace-mode music track. `null` emission (from
 * `media.music.stop`) signals "stop".
 */
export declare const musicChannel: IOChannel;
/**
 * Construct an `ambient:<id>` `IOChannel`. Ambient channels are
 * inherently story-defined (ADR-163 §7) — the platform has no
 * predetermined ambient ids. Stories call this once per ambient
 * layer they need.
 *
 * @param ambientId — suffix portion (e.g., `'wind'` registers
 *   `ambient:wind`).
 */
export declare function createAmbientChannel(ambientId: string): IOChannel;
/**
 * `animation` — event-mode CSS-style animation. Drops `onComplete`
 * per ADR-163 §9.
 */
export declare const animationChannel: IOChannel;
/**
 * `animate` — event-mode generic animation directive.
 */
export declare const animateChannel: IOChannel;
/**
 * `transition` — event-mode scene transition.
 */
export declare const transitionChannel: IOChannel;
/**
 * `layout` — replace-mode layout configuration. Persistent across
 * mid-session joins so a late-joining renderer sees the current
 * layout without waiting for a re-emission.
 */
export declare const layoutChannel: IOChannel;
/**
 * `clear` — event-mode truncation signal. Operates on append-mode
 * channels (notably `main`); ungated because every renderer needs to
 * be able to reset accumulated prose.
 */
export declare const clearChannel: IOChannel;
/**
 * Static media channels in iteration order — the ones the platform
 * pre-registers regardless of story. Dynamic image layers (beyond
 * the three above) and ambient channels are story-registered.
 */
export declare const MEDIA_CHANNELS: ReadonlyArray<IOChannel>;
/**
 * Channel id literals for the static media set.
 */
export declare const MEDIA_CHANNEL_IDS: {
    readonly IMAGE_PRELOAD: "image:preload";
    readonly IMAGE_BACKGROUND: "image:background";
    readonly IMAGE_MAIN: "image:main";
    readonly IMAGE_OVERLAY: "image:overlay";
    readonly SOUND: "sound";
    readonly MUSIC: "music";
    readonly ANIMATION: "animation";
    readonly ANIMATE: "animate";
    readonly TRANSITION: "transition";
    readonly LAYOUT: "layout";
    readonly CLEAR: "clear";
};
export type MediaChannelId = (typeof MEDIA_CHANNEL_IDS)[keyof typeof MEDIA_CHANNEL_IDS];
```

### channels/sound-events

```typescript
/**
 * @sharpee/stdlib/channels — spatial sound channel (ADR-172 Phase 5).
 *
 * Owner context: stdlib language layer. Defines:
 *
 *  - `SOUND_EVENT_TYPES` — semantic-event type constants the engine's
 *    sound dispatcher (Phase 6) emits when the propagation function
 *    delivers an `AudibilityEvent` to a listener.
 *  - `audibilityChannel` — the `IOChannel` that filters those events
 *    out of the per-turn event stream and projects their payloads.
 *
 * **Channel id is `'audibility'`, not `'sound'`.** The `'sound'` id is
 * reserved by ADR-163 for the media-cue channel (`media.sound.play`
 * payloads). ADR-172's per-listener audibility events are a distinct
 * concept (perception of a propagated sound, with prose+audio render
 * branches) so they ride a distinct channel id.
 *
 * The channel is **not** capability-gated. Per ADR-172 §Channel routing,
 * both text-only and audio-capable clients consume audibility events:
 * text-only renders descriptive prose ("muffled voices to the north"),
 * audio-capable additionally plays a cue at a tier-mapped playback
 * volume. The wire shape is the `AudibilityEvent`; clients render what
 * they can.
 *
 * @see ADR-172 — Spatial Sound Propagation §Channel routing
 * @see ADR-163 — Channel-Service Platform §6, §7 (closure-per-channel)
 */
import type { IOChannel } from '@sharpee/if-domain';
import type { IAudibilityEvent } from '@sharpee/if-domain';
/**
 * Semantic-event types emitted by the sound subsystem. Phase 6's
 * dispatcher fires `AUDIBILITY_HEARD` once per listener per propagated
 * sound; the event's `data` field carries the listener-specific
 * `IAudibilityEvent` payload.
 */
export declare const SOUND_EVENT_TYPES: {
    /**
     * A listener perceived a propagated sound. Event `data` is an
     * `IAudibilityEvent` (per-listener tier, source-room, optional
     * crossing wall, content if content-bearing).
     */
    readonly AUDIBILITY_HEARD: "sound.audibility.heard";
};
export type SoundEventType = typeof SOUND_EVENT_TYPES[keyof typeof SOUND_EVENT_TYPES];
/**
 * `audibility` — append-mode channel carrying every `AudibilityEvent`
 * delivered to listeners during the turn just executed.
 *
 * Mode is `append` because a single turn may produce multiple
 * `AUDIBILITY_HEARD` events (multiple emissions × multiple listeners
 * after dispatcher fan-out in Phase 6). Each turn's projected value is
 * the array of newly-heard events; quiet turns emit nothing under the
 * `sparse` policy.
 *
 * Renderers consume per their capability:
 *  - text-only — language layer maps `(kind, audibilityTier)` to
 *    descriptive prose (see `sound-messages` in lang-{locale}).
 *  - audio-capable — optionally plays an audio cue per the existing
 *    Web Audio infrastructure (ADR-169), playback volume mapped from
 *    `audibilityTier`.
 */
export declare const audibilityChannel: IOChannel<IAudibilityEvent>;
/**
 * Sound-subsystem channels. Currently a single entry; the constant
 * exists to match the `STANDARD_CHANNELS` / `MEDIA_CHANNELS`
 * registration pattern and to give future sound-related channels a
 * stable bucket.
 */
export declare const SOUND_CHANNELS: ReadonlyArray<IOChannel>;
export declare const SOUND_CHANNEL_IDS: readonly ["audibility"];
export type SoundChannelId = typeof SOUND_CHANNEL_IDS[number];
```

### channels/keys

```typescript
/**
 * @sharpee/stdlib/channels — block-key → channel-id routing for prose.
 *
 * Owner context: stdlib language layer. ADR-300 D8 dissolved the
 * catch-all `main` channel: each prose-shaped block key now has its own
 * channel, so a client receives `room-description` and `action-result`
 * as separate signals instead of one append stream it was expected to
 * concatenate. No channel means "the prose window" any more.
 *
 * `PROSE_CHANNEL_BY_BLOCK_KEY` is the whole routing table. It is the
 * single place the mapping lives: the seven prose channels' closures
 * read it, and so does `preferred-layout`'s (ADR-300 D9), which is what
 * keeps the ordering signal and the channels it orders from drifting
 * apart.
 *
 * Block keys absent from this map are NOT routed to a prose channel —
 * status keys are read from world state by the score/turn/location
 * channels, the banner has `BANNER_KEYS`, and stories extend by
 * registering their own `IOChannel` (last-write-wins on channel id) per
 * ADR-163 §6.
 *
 * The channel *ids* are wire vocabulary and live in
 * `@sharpee/if-domain` (`PROSE_CHANNEL_IDS`) so producer and consumers
 * cannot drift. What this file owns is the engine-side half: which text
 * block key routes to which of those ids.
 *
 * Public interface: `PROSE_CHANNEL_BY_BLOCK_KEY`, `BANNER_KEYS`.
 *
 * @see ADR-300 — Addressable Channels and the Canonical Transcript — D8, D9
 * @see ADR-163 — Channel-Service Platform — §6, §7, §14
 */
import type { ProseChannelId } from '@sharpee/if-domain';
/**
 * The prose routing table: which channel carries each prose-shaped
 * block key. Iteration order is the order the channels are registered
 * in `STANDARD_CHANNELS`, which is *not* a render order — the render
 * order is per-turn and rides `preferred-layout`.
 *
 * Typed on `ProseChannelId` so adding a route to an id that is not in
 * if-domain's wire vocabulary fails to compile rather than emitting a
 * channel no consumer knows how to render.
 */
export declare const PROSE_CHANNEL_BY_BLOCK_KEY: ReadonlyMap<string, ProseChannelId>;
/**
 * Block keys whose content flows into the `banner` channel.
 *
 * The opening banner used to ride `main`, which meant the title, the version
 * lines and the credits all arrived glued to whatever the first command
 * printed — one undivided lump that a test could only assert on as a whole.
 * On its own channel it is addressable: the banner, the prologue and the first
 * command's response become three things a transcript can check separately.
 */
export declare const BANNER_KEYS: ReadonlySet<string>;
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
export * from './actions/index.js';
export * from './events/index.js';
export * from './parser/index.js';
export * from './validation/index.js';
export * from './vocabulary/index.js';
export * from './capabilities/index.js';
export * from './query-handlers/index.js';
export * from './scope/index.js';
export * from './services/index.js';
export * from './npc/index.js';
export * from './combat/index.js';
export * from './death/index.js';
export * from './chains/index.js';
export * from './inference/index.js';
export * from './utils/index.js';
export * from './channels/index.js';
```
