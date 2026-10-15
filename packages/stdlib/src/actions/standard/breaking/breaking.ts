/**
 * Breaking — the consequence id fired when an action breaks a thing
 * (ADR-373 D3).
 *
 * `if.action.breaking` has no grammar and no action: `break X` is
 * attacking's. Whatever breaks a breakable thing — attacking it, dropping it
 * on a floor when it is fragile, throwing it when it is fragile — calls
 * `runBreakingLifecycle` once, at the end of its own report, after its own
 * line has spoken. That consults the thing's interceptors under the breaking
 * id (a Chord `after the player breaking` clause), runs their postExecute
 * and postReport, and returns the standard `if.event.broken` with whatever
 * the hooks added. A break is therefore one event however it happened.
 *
 * Public interface: breakingLifecycle, runBreakingLifecycle, BrokenEventData.
 * Owner context: stdlib / standard actions / object manipulation
 */

import { type ISemanticEvent } from '@sharpee/core';
import { type IFEntity } from '@sharpee/world-model';
import { ActionContext } from '../../enhanced-types.js';
import { IFActions } from '../../constants.js';
import {
  ActionLifecycleDescriptor,
  resolveLifecycle,
  runPostExecute,
  runPostReport
} from '../../lifecycle/index.js';

/** Payload of `if.event.broken`: the thing that broke and what broke it. */
export interface BrokenEventData {
  targetId: string;
  targetName: string;
  /** The action whose outcome broke it (attacking, dropping, throwing) */
  causeActionId: string;
}

/**
 * Interceptor surface (ADR-228): the broken thing is the only consultable
 * entity. Fired as a consequence, never executed.
 */
export const breakingLifecycle: ActionLifecycleDescriptor = {
  actionId: IFActions.BREAKING,
  reportEventType: 'if.event.broken',
  blockedEventType: 'if.event.break_blocked',
  contracts: { firedAsConsequence: true },
  slots: [
    {
      id: 'target',
      actionIds: [IFActions.BREAKING],
      // Bound by slotOverride in runBreakingLifecycle — the broken thing is
      // not necessarily the command's direct object (a thrown item is).
      resolve: () => undefined,
      seedData: (ctx, entity) => ({
        targetId: entity.id,
        targetName: entity.name,
        causeActionId: ctx.action.id
      })
    }
  ]
};

/**
 * Fire the breaking lifecycle on a thing that has just broken.
 *
 * Call once per break, from the causing action's report, after its own
 * events. Uses a slot override so the causing action's stored lifecycle
 * state is left untouched.
 *
 * @param context The causing action's context
 * @param broken The entity that broke
 * @returns `if.event.broken` followed by any events the hooks added
 */
export function runBreakingLifecycle(context: ActionContext, broken: IFEntity): ISemanticEvent[] {
  const state = resolveLifecycle(context, breakingLifecycle, {
    slotOverride: { slotId: 'target', entity: broken }
  });
  runPostExecute(context, state);
  const events: ISemanticEvent[] = [
    context.event('if.event.broken', {
      targetId: broken.id,
      targetName: broken.name,
      causeActionId: context.action.id
    } satisfies BrokenEventData)
  ];
  runPostReport(context, state, events, 'if.event.broken');
  return events;
}
