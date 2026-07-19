/**
 * Action Interceptor interface (ADR-118)
 *
 * Interceptors allow entities to hook into stdlib action phases
 * without replacing standard logic. This is the "Before/After" pattern
 * from Inform 6/7, complementing the full delegation pattern in
 * capability behaviors.
 *
 * Key difference from CapabilityBehavior:
 * - CapabilityBehavior: Full delegation, trait owns ALL logic (LOWER, RAISE)
 * - ActionInterceptor: Hooks into phases, action owns core logic (ENTER, PUT)
 */

import { ISemanticEvent } from '@sharpee/core';
import { IFEntity } from '../entities/index.js';
import { WorldModel } from '../world/index.js';
import { CapabilityEffect } from './types.js';

/**
 * Shared data object for passing data between interceptor phases.
 * Mirrors CapabilitySharedData pattern from capability-behavior.ts.
 *
 * Interceptors can store data here during earlier phases (e.g., postValidate)
 * and access it in later phases (e.g., postExecute, postReport).
 */
export type InterceptorSharedData = Record<string, unknown>;

/**
 * Result from interceptor validation hooks.
 * Returning null means "continue with standard logic".
 * Returning a result blocks or modifies the action.
 */
export interface InterceptorResult {
  /** Whether the action can proceed */
  valid: boolean;
  /** Error code if validation failed (for message lookup) */
  error?: string;
  /** Additional context for error messages */
  params?: Record<string, unknown>;
}

/**
 * Result returned by `ActionInterceptor.postReport` (ISSUE-074).
 *
 * Distinguishes two semantically different intents that the old
 * entity-`on` system collapsed onto a single `Effect[]` shape:
 *
 * 1. `override` — replace the primary domain event's `messageId`
 *    (and optional params). Use when the interceptor's narration
 *    *substitutes* for the action's standard message. Example: rug push
 *    reveals the trap door — the rug-reveal text replaces the generic
 *    "you give the rug a push" line.
 *
 * 2. `emit` — additional events to render alongside the action's
 *    standard ones. Use for side-channel narration (multi-line
 *    consequences) or events that are not message overrides.
 *
 * Both fields are optional and independent. Return `{}` (or simply
 * an empty object literal) when the interceptor has nothing to do.
 *
 * Mirrors the override semantic that `event-processor.invokeEntityHandlers()`
 * applies to single `game.message` reactions from story-level handlers
 * (ADR-106), making the same intent explicit at the interceptor contract.
 *
 * @see applyInterceptorReportResult
 */
export interface InterceptorReportResult {
  /** Override the primary domain event's messageId (and optional params/text).
   *
   *  - `messageId`: replaces the primary event's `data.messageId`.
   *  - `params` (optional): replaces the primary event's `data.params`.
   *  - `text` (optional): replaces the primary event's `data.text`. Used
   *    when the interceptor has a pre-rendered string and wants the
   *    text-service to fall back to it if `messageId` doesn't resolve
   *    to a language template (mirrors the inline-text fallback in
   *    `event-processor.ts`'s entity-handler override path).
   *
   *  Multiple interceptors returning `override` for the same action is a
   *  hard error mirroring ADR-106's "multiple game.message reactions" rule. */
  override?: {
    messageId: string;
    params?: Record<string, unknown>;
    text?: string;
  };

  /** Emit additional events alongside the action's standard events. */
  emit?: CapabilityEffect[];
}

/**
 * Result returned by `ActionInterceptor.onBlocked` (ADR-228, D2).
 *
 * Structurally symmetric with `InterceptorReportResult` so the whole
 * interceptor API is teachable as one pattern:
 *
 * 1. `override` — swap the standard blocked event's `messageId` (and
 *    optional params/text). The blocked event's **type survives intact**
 *    (`if.event.take_blocked` etc.), so tests and state machines keyed on
 *    blocked events keep working while the interceptor controls the
 *    refusal's presentation.
 *
 * 2. `emit` — additional effects appended after the standard blocked
 *    event (side-channel narration, death events, etc.).
 *
 * Returning `null` or `{}` means standard blocked handling.
 *
 * The bare `CapabilityEffect[]` form (replace-the-event, with `[]`
 * silently suppressing it) is retired: the standard blocked event is the
 * machine-readable record of the refusal and can no longer be eaten.
 * Note the primary custom-refusal path is unchanged and does not go
 * through onBlocked at all: a pre/postValidate hook returning
 * `{valid: false, error: customMessageId}` renders that message on the
 * blocked event (the white-hot-axe pattern).
 *
 * @see applyInterceptorBlockedResult
 */
export interface InterceptorBlockedResult {
  /** Override the standard blocked event's messageId (and optional params/text).
   *  The event type is preserved. */
  override?: {
    messageId: string;
    params?: Record<string, unknown>;
    text?: string;
  };

  /** Emit additional effects after the standard blocked event. */
  emit?: CapabilityEffect[];
}

/**
 * Minimal context shape required by `applyInterceptorReportResult`.
 *
 * Real action contexts (both the engine's closure-based factory and the
 * stdlib's class-based `EnhancedActionContext`) satisfy this structurally
 * by exposing `event(type, data)`. Passing the *context object* — rather
 * than an unbound `context.event` callback — preserves `this` for the
 * class-based implementation, which would otherwise crash inside
 * `createEventInternal`. Callers cannot forget to bind because there is
 * nothing to bind.
 */
export interface InterceptorEventContext {
  event(type: string, data: Record<string, any>): ISemanticEvent;
}

/**
 * Apply an interceptor's `postReport` result to an action's emitted events.
 *
 * - If `result.override` is set, copies `messageId` (and optional `params`/`text`)
 *   onto the data of the event whose type matches `primaryEventType`.
 * - If `result.emit` is set, converts each effect to an `ISemanticEvent`
 *   via `context.event(...)` and appends to `events`.
 *
 * The action's `report()` phase is responsible for calling this helper
 * with the events array it has built so far, the event type that
 * carries the standard message (e.g. `'if.event.pushed'`), and the
 * action context whose `event(...)` method produces events with proper
 * entity bindings.
 *
 * @param events - The action's events array; mutated in place.
 * @param primaryEventType - The event type whose `messageId` an `override`
 *                           should replace (e.g. `'if.event.pushed'`).
 * @param result - The value returned from `interceptor.postReport`.
 * @param context - The action context (any object exposing
 *                  `event(type, data)`).
 * @param options - `searchFrom`: index in `events` from which override
 *                  targeting searches (default 0). Per-item applications
 *                  in multi-object commands (ADR-228 D4) pass the index
 *                  where the item's report began so the override lands on
 *                  that item's event, not an earlier item's.
 *
 * @example
 * ```typescript
 * // In the pushing action's report() phase, after pushing the standard
 * // if.event.pushed onto events:
 * if (interceptor?.postReport) {
 *   const result = interceptor.postReport(target, world, actorId, interceptorData);
 *   applyInterceptorReportResult(events, 'if.event.pushed', result, context);
 * }
 * ```
 */
export function applyInterceptorReportResult(
  events: ISemanticEvent[],
  primaryEventType: string,
  result: InterceptorReportResult,
  context: InterceptorEventContext,
  options?: { searchFrom?: number }
): void {
  if (result.override) {
    const primary = events.find(
      (e, i) => i >= (options?.searchFrom ?? 0) && e.type === primaryEventType
    );
    if (primary) {
      const data = primary.data as Record<string, unknown>;
      data.messageId = result.override.messageId;
      if (result.override.params) {
        data.params = result.override.params;
      }
      if (result.override.text) {
        data.text = result.override.text;
      }
    } else {
      // Defensive: an interceptor asked for an override but the action
      // didn't emit a primary event of that type. Either the action's
      // contract changed or the interceptor is misconfigured.
      console.warn(
        `applyInterceptorReportResult: override requested for primary event type ` +
        `"${primaryEventType}" but no event of that type was found in the events array.`
      );
    }
  }

  if (result.emit) {
    for (const effect of result.emit) {
      events.push(context.event(effect.type, effect.payload));
    }
  }
}

/**
 * Apply an interceptor's `onBlocked` result to an action's blocked events.
 *
 * - If `result.override` is set, copies `messageId` (and optional `params`/`text`)
 *   onto the data of the event whose type matches `blockedEventType`. The
 *   event itself — the machine-readable record of the refusal — survives.
 * - If `result.emit` is set, converts each effect to an `ISemanticEvent`
 *   via `context.event(...)` and appends to `events`.
 *
 * The action's `blocked()` phase calls this helper with the events array
 * it has built (containing the standard blocked event), the blocked event
 * type (e.g. `'if.event.take_blocked'`), and the action context.
 *
 * @param events - The action's blocked events array; mutated in place.
 * @param blockedEventType - The event type whose `messageId` an `override`
 *                           should replace (e.g. `'if.event.take_blocked'`).
 * @param result - The value returned from `interceptor.onBlocked`.
 * @param context - The action context (any object exposing
 *                  `event(type, data)`).
 * @param options - `searchFrom`: index in `events` from which override
 *                  targeting searches (default 0). See
 *                  `applyInterceptorReportResult` for the ADR-228 D4
 *                  per-item rationale.
 */
export function applyInterceptorBlockedResult(
  events: ISemanticEvent[],
  blockedEventType: string,
  result: InterceptorBlockedResult,
  context: InterceptorEventContext,
  options?: { searchFrom?: number }
): void {
  if (result.override) {
    const blocked = events.find(
      (e, i) => i >= (options?.searchFrom ?? 0) && e.type === blockedEventType
    );
    if (blocked) {
      const data = blocked.data as Record<string, unknown>;
      data.messageId = result.override.messageId;
      if (result.override.params) {
        data.params = result.override.params;
      }
      if (result.override.text) {
        data.text = result.override.text;
      }
    } else {
      // Defensive: an interceptor asked for an override but the action
      // didn't emit a blocked event of that type. Either the action's
      // contract changed or the interceptor is misconfigured.
      console.warn(
        `applyInterceptorBlockedResult: override requested for blocked event type ` +
        `"${blockedEventType}" but no event of that type was found in the events array.`
      );
    }
  }

  if (result.emit) {
    for (const effect of result.emit) {
      events.push(context.event(effect.type, effect.payload));
    }
  }
}

/**
 * Action interceptor interface.
 *
 * Interceptors hook into stdlib action phases to customize behavior
 * without reimplementing standard logic. All hooks are optional.
 *
 * Phase order:
 * 1. preValidate - Before standard validation
 * 2. (standard validation runs)
 * 3. postValidate - After standard validation passes
 * 4. (standard execute runs)
 * 5. postExecute - After standard execution
 * 6. (standard report runs)
 * 7. postReport - Additional effects after standard report
 *
 * If validation fails at any point:
 * - onBlocked - Called instead of execute/report phases
 *
 * @example
 * ```typescript
 * // Boat puncture interceptor - checks for sharp objects when entering
 * const InflatableEnteringInterceptor: ActionInterceptor = {
 *   postValidate(entity, world, actorId, sharedData) {
 *     const inventory = world.getContents(actorId);
 *     const sharpObject = inventory.find(item => item.puncturesBoat);
 *     if (sharpObject) {
 *       sharedData.willPuncture = true;
 *       sharedData.punctureItem = sharpObject.name;
 *     }
 *     return null; // Allow entering to proceed
 *   },
 *
 *   postExecute(entity, world, actorId, sharedData) {
 *     if (!sharedData.willPuncture) return;
 *     // Deflate the boat, eject player
 *     const trait = entity.get(InflatableTrait);
 *     trait.isInflated = false;
 *     world.moveEntity(actorId, world.getLocation(entity.id));
 *   },
 *
 *   postReport(entity, world, actorId, sharedData) {
 *     if (!sharedData.willPuncture) return [];
 *     return [createEffect('dungeo.boat.punctured', { item: sharedData.punctureItem })];
 *   }
 * };
 * ```
 */
export interface ActionInterceptor {
  /**
   * Called BEFORE standard validation.
   *
   * Use this to block actions early based on entity-specific conditions.
   * Return an InterceptorResult to block the action.
   * Return null to continue with standard validation.
   *
   * @example
   * // Troll blocks entering the Troll Room
   * preValidate(entity, world, actorId, sharedData) {
   *   if (trollIsAlive(world)) {
   *     return { valid: false, error: 'dungeo.troll.blocks_path' };
   *   }
   *   return null;
   * }
   */
  preValidate?(
    entity: IFEntity,
    world: WorldModel,
    actorId: string,
    sharedData: InterceptorSharedData
  ): InterceptorResult | null;

  /**
   * Called AFTER standard validation passes.
   *
   * Use this to add entity-specific conditions that should block
   * an otherwise valid action, or to set up data for postExecute.
   * Return an InterceptorResult to block the action.
   * Return null to continue with execution.
   *
   * @example
   * // Check if player is carrying something that will puncture the boat
   * postValidate(entity, world, actorId, sharedData) {
   *   const sharp = findSharpObject(world, actorId);
   *   if (sharp) {
   *     sharedData.willPuncture = true;
   *     sharedData.punctureItem = sharp.name;
   *   }
   *   return null; // Still allow entering
   * }
   */
  postValidate?(
    entity: IFEntity,
    world: WorldModel,
    actorId: string,
    sharedData: InterceptorSharedData
  ): InterceptorResult | null;

  /**
   * Called AFTER standard execution completes.
   *
   * Use this to perform additional mutations based on the action.
   * Cannot prevent the action (use postValidate for that).
   * Access data stored in sharedData during validation phases.
   *
   * @example
   * // Glacier melts when torch is thrown at it
   * postExecute(entity, world, actorId, sharedData) {
   *   if (!sharedData.willMelt) return;
   *   meltGlacier(world, entity.id);
   *   openPassage(world, 'glacier-passage');
   * }
   */
  postExecute?(
    entity: IFEntity,
    world: WorldModel,
    actorId: string,
    sharedData: InterceptorSharedData
  ): void;

  /**
   * Called AFTER standard report.
   *
   * Return an `InterceptorReportResult` that declares either:
   * - `override`: replace the primary domain event's `messageId` (so the
   *   interceptor's narration *substitutes* for the standard message), or
   * - `emit`: additional events to render alongside the standard ones, or
   * - both, or neither (return `{}` for no-op).
   *
   * Use `override` when the interceptor's message should *replace* the
   * action's default text. Use `emit` for side-channel narration or
   * non-message events.
   *
   * The action's `report()` phase applies the result via
   * `applyInterceptorReportResult` (see helper below).
   *
   * @example
   * // Override: rug push reveals trap door — the rug-reveal text
   * // replaces the generic "you give the rug a push" message.
   * postReport(entity, world, actorId, sharedData) {
   *   if (!sharedData.rugRevealed) return {};
   *   return { override: { messageId: 'dungeo.rug.moved.reveal_trapdoor' } };
   * }
   *
   * @example
   * // Emit: ghost ritual narrates two consecutive lines.
   * postReport(entity, world, actorId, sharedData) {
   *   if (!sharedData.ritualCompleted) return {};
   *   return {
   *     emit: [
   *       createEffect('game.message', { messageId: 'dungeo.ghost.appears' }),
   *       createEffect('game.message', { messageId: 'dungeo.ghost.canvas_spawns' })
   *     ]
   *   };
   * }
   */
  postReport?(
    entity: IFEntity,
    world: WorldModel,
    actorId: string,
    sharedData: InterceptorSharedData
  ): InterceptorReportResult;

  /**
   * Called when action is blocked (validation failed).
   *
   * Return an `InterceptorBlockedResult` (ADR-228, D2) that declares either:
   * - `override`: swap the standard blocked event's `messageId` — the event
   *   type survives as the machine-readable record of the refusal, or
   * - `emit`: additional effects appended after the standard blocked event
   *   (side-channel narration, death events), or
   * - both, or `null`/`{}` for standard blocked handling.
   *
   * The action's `blocked()` phase applies the result via
   * `applyInterceptorBlockedResult`.
   *
   * @example
   * // Override: richer refusal presentation, record event intact
   * onBlocked(entity, world, actorId, error, sharedData) {
   *   if (error === 'dungeo.troll.blocks_path') {
   *     return { override: { messageId: 'dungeo.troll.snarls' } };
   *   }
   *   return null; // Use standard blocked handling
   * }
   *
   * @example
   * // Emit: refusal has side effects (poison death on blocked take)
   * onBlocked(entity, world, actorId, error, sharedData) {
   *   if (!sharedData.poisonDeath) return null;
   *   killPlayer(world, world.getPlayer()!, { cause: 'poison', terminal: true });
   *   return { emit: [createEffect(PLAYER_DIED_EVENT, { cause: 'poison', terminal: true })] };
   * }
   */
  onBlocked?(
    entity: IFEntity,
    world: WorldModel,
    actorId: string,
    error: string,
    sharedData: InterceptorSharedData
  ): InterceptorBlockedResult | null;
}
