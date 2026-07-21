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

import { ISemanticEvent } from '@sharpee/core';
import {
  IFEntity,
  InterceptorSharedData,
  applyInterceptorReportResult,
  applyInterceptorBlockedResult
} from '@sharpee/world-model';
import type { ActionInterceptor } from '@sharpee/world-model';
import { ActionContext, ValidationResult } from '../enhanced-types.js';
import { ActionLifecycleDescriptor } from './descriptor.js';

/**
 * Reserved sharedData key holding the command's resolved lifecycle state.
 * Actions never read or write this key directly — they hold the state
 * returned by `resolveLifecycle` or fetch it via `getLifecycleState`.
 */
const LIFECYCLE_KEY = '_lifecycle';

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
  slotOverride?: { slotId: string; entity: IFEntity };
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
export function resolveLifecycle(
  context: ActionContext,
  descriptor: ActionLifecycleDescriptor,
  options?: ResolveLifecycleOptions
): LifecycleState {
  const consultations: ResolvedConsultation[] = [];

  for (const slot of descriptor.slots) {
    const isOverrideSlot = options?.slotOverride?.slotId === slot.id;
    const entity = isOverrideSlot
      ? options!.slotOverride!.entity
      : slot.resolve(context);
    if (!entity) continue;

    for (const actionId of slot.actionIds) {
      const lookup = context.world.getInterceptorForAction(entity, actionId);
      if (!lookup) continue;

      // In a per-item resolution (D4), non-item slots' seedData receives
      // the current item so shared entities (e.g. the container) can seed
      // per-item context like the item id.
      const multiObjectItem = !isOverrideSlot ? options?.slotOverride?.entity : undefined;
      const data: InterceptorSharedData = slot.seedData
        ? { ...slot.seedData(context, entity, multiObjectItem) }
        : {};
      consultations.push({
        slotId: slot.id,
        actionId,
        entity,
        interceptor: lookup.interceptor,
        data
      });
    }
  }

  const state: LifecycleState = { descriptor, consultations };
  if (!options?.slotOverride) {
    context.sharedData[LIFECYCLE_KEY] = state;
  }
  return state;
}

/**
 * Fetch the lifecycle state stored by `resolveLifecycle` for this command.
 *
 * @param context - The action context.
 * @returns The state, or `undefined` if `resolveLifecycle` has not run.
 */
export function getLifecycleState(context: ActionContext): LifecycleState | undefined {
  return context.sharedData[LIFECYCLE_KEY] as LifecycleState | undefined;
}

/**
 * D1 veto test: a hook result acts iff it is non-null AND `valid === false`.
 * Everything else — null, `{valid: true}`, any truthy shape — falls through.
 *
 * Every veto is marked `errorQualified: true` (ADR-231 D1): an
 * interceptor-originated error key is a fully-qualified message id —
 * story-registered keys resolve as the author wrote them — and
 * `blockedMessageId` must never prefix it with the action id.
 */
function vetoOf(result: { valid: boolean; error?: string; params?: Record<string, unknown> } | null): ValidationResult | null {
  if (result !== null && result.valid === false) {
    return { valid: false, error: result.error, errorQualified: true, params: result.params };
  }
  return null;
}

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
export function blockedMessageId(context: ActionContext, result: ValidationResult): string {
  const error = result.error ?? 'action_failed';
  return result.errorQualified === true ? error : `${context.action.id}.${error}`;
}

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
export function runPreValidate(
  context: ActionContext,
  state: LifecycleState
): ValidationResult | null {
  for (const c of state.consultations) {
    if (!c.interceptor.preValidate) continue;
    const veto = vetoOf(
      c.interceptor.preValidate(c.entity, context.world, context.player.id, c.data)
    );
    if (veto) return veto;
  }
  return null;
}

/**
 * Run every consultation's `postValidate` hook in order (D3-B).
 *
 * Canonical placement (ADR-228): after ALL standard validation has
 * passed. First veto wins; returns `null` when no hook vetoes.
 *
 * @param context - The action context.
 * @param state - The resolved lifecycle state.
 */
export function runPostValidate(
  context: ActionContext,
  state: LifecycleState
): ValidationResult | null {
  for (const c of state.consultations) {
    if (!c.interceptor.postValidate) continue;
    const veto = vetoOf(
      c.interceptor.postValidate(c.entity, context.world, context.player.id, c.data)
    );
    if (veto) return veto;
  }
  return null;
}

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
export function runPostExecute(context: ActionContext, state: LifecycleState): void {
  for (const c of state.consultations) {
    c.interceptor.postExecute?.(c.entity, context.world, context.player.id, c.data);
  }
}

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
export function runPostReport(
  context: ActionContext,
  state: LifecycleState,
  events: ISemanticEvent[],
  primaryEventType: string,
  searchFrom: number = 0
): void {
  let overrideSeen = false;
  for (const c of state.consultations) {
    if (!c.interceptor.postReport) continue;
    const result = c.interceptor.postReport(c.entity, context.world, context.player.id, c.data);
    if (!result) continue;
    if (result.override) {
      if (overrideSeen) {
        throw new Error(
          `Interceptor lifecycle (${state.descriptor.actionId}): multiple consultations ` +
          `returned a postReport override — at most one interceptor may override the ` +
          `primary message (slot '${c.slotId}', action '${c.actionId}').`
        );
      }
      overrideSeen = true;
    }
    applyInterceptorReportResult(events, primaryEventType, result, context, { searchFrom });
  }
}

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
export function runOnBlocked(
  context: ActionContext,
  state: LifecycleState,
  events: ISemanticEvent[],
  blockedEventType: string,
  error: string,
  searchFrom: number = 0
): void {
  let overrideSeen = false;
  for (const c of state.consultations) {
    if (!c.interceptor.onBlocked) continue;
    const result = c.interceptor.onBlocked(c.entity, context.world, context.player.id, error, c.data);
    if (!result) continue;
    if (result.override) {
      if (overrideSeen) {
        throw new Error(
          `Interceptor lifecycle (${state.descriptor.actionId}): multiple consultations ` +
          `returned an onBlocked override — at most one interceptor may override the ` +
          `blocked message (slot '${c.slotId}', action '${c.actionId}').`
        );
      }
      overrideSeen = true;
    }
    applyInterceptorBlockedResult(events, blockedEventType, result, context, { searchFrom });
  }
}
