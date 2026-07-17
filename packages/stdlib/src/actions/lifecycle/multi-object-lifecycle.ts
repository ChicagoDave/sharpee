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

import { ISemanticEvent } from '@sharpee/core';
import { IFEntity } from '@sharpee/world-model';
import { ActionContext, ValidationResult } from '../enhanced-types';
import { ActionLifecycleDescriptor } from './descriptor';
import {
  LifecycleState,
  resolveLifecycle,
  runPreValidate,
  runPostValidate,
  runPostExecute,
  runPostReport,
  runOnBlocked
} from './lifecycle-engine';

/**
 * Reserved sharedData key holding the command's per-item lifecycle states.
 * Actions never touch this key directly — they hold the array returned by
 * `runMultiObjectValidate` or fetch it via `getMultiObjectLifecycle`.
 */
const MULTI_LIFECYCLE_KEY = '_lifecycleMulti';

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
export function runMultiObjectValidate(
  context: ActionContext,
  descriptor: ActionLifecycleDescriptor,
  multiObjectSlotId: string,
  items: IFEntity[],
  validateItem: (context: ActionContext, item: IFEntity, itemData: Record<string, unknown>) => ValidationResult
): MultiObjectItemState[] {
  const results: MultiObjectItemState[] = items.map((item) => {
    const state = resolveLifecycle(context, descriptor, {
      slotOverride: { slotId: multiObjectSlotId, entity: item }
    });
    const itemData: Record<string, unknown> = {};

    const preVeto = runPreValidate(context, state);
    if (preVeto) {
      return { entity: item, success: false, error: preVeto.error, errorQualified: preVeto.errorQualified, errorParams: preVeto.params, state, itemData };
    }

    const standard = validateItem(context, item, itemData);
    if (!standard.valid) {
      return { entity: item, success: false, error: standard.error, errorQualified: standard.errorQualified, errorParams: standard.params, state, itemData };
    }

    const postVeto = runPostValidate(context, state);
    if (postVeto) {
      return { entity: item, success: false, error: postVeto.error, errorQualified: postVeto.errorQualified, errorParams: postVeto.params, state, itemData };
    }

    return { entity: item, success: true, state, itemData };
  });

  context.sharedData[MULTI_LIFECYCLE_KEY] = results;
  return results;
}

/**
 * Fetch the per-item states stored by `runMultiObjectValidate`.
 *
 * @param context - The action context.
 * @returns The item states, or `undefined` if the command was not
 *   validated as a multi-object command.
 */
export function getMultiObjectLifecycle(context: ActionContext): MultiObjectItemState[] | undefined {
  return context.sharedData[MULTI_LIFECYCLE_KEY] as MultiObjectItemState[] | undefined;
}

/**
 * Execute every successful item: the action's `executeItem`, then that
 * item's postExecute hooks (D4 — hooks fire per item, so e.g. a trophy
 * case's postExecute awards score for EVERY deposited treasure).
 *
 * @param context - The action context.
 * @param itemStates - The states from `runMultiObjectValidate`.
 * @param executeItem - The action's standard single-item mutation.
 */
export function runMultiObjectExecute(
  context: ActionContext,
  itemStates: MultiObjectItemState[],
  executeItem: (context: ActionContext, item: IFEntity, itemData: Record<string, unknown>) => void
): void {
  for (const itemState of itemStates) {
    if (!itemState.success) continue;
    executeItem(context, itemState.entity, itemState.itemData);
    runPostExecute(context, itemState.state);
  }
}

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
export function runMultiObjectReport(
  context: ActionContext,
  itemStates: MultiObjectItemState[],
  events: ISemanticEvent[],
  primaryEventType: string,
  blockedEventType: string,
  reportSuccess: (context: ActionContext, item: IFEntity, itemData: Record<string, unknown>, events: ISemanticEvent[]) => void,
  reportBlocked: (context: ActionContext, item: IFEntity, result: ValidationResult, events: ISemanticEvent[]) => void
): void {
  for (const itemState of itemStates) {
    const searchFrom = events.length;
    if (itemState.success) {
      reportSuccess(context, itemState.entity, itemState.itemData, events);
      runPostReport(context, itemState.state, events, primaryEventType, searchFrom);
    } else {
      reportBlocked(
        context,
        itemState.entity,
        { valid: false, error: itemState.error ?? '', errorQualified: itemState.errorQualified, params: itemState.errorParams },
        events
      );
      runOnBlocked(context, itemState.state, events, blockedEventType, itemState.error ?? '', searchFrom);
    }
  }
}
