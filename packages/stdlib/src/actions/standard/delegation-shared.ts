/**
 * delegation-shared.ts — one action carried out by another (ADR-228 D6-B).
 *
 * Inserting is putting `in`; lighting a switchable light is switching it on,
 * and putting one out is switching it off (ADR-374 D9). The outer action's
 * own hooks run in the executor like any action's. The inner action never
 * reaches the executor (ADR-337 D1), so its hooks run here, on a context
 * made for it, in the published order: outer preValidate (executor), inner
 * preValidate, inner validate, inner postValidate, outer postValidate
 * (executor); then inner execute and postExecute; then inner report and
 * postReport. Both ids' hooks fire for the one physical operation, as
 * ADR-228 D6 requires.
 *
 * Public interface: Delegation, delegateValidate, delegateExecute, delegateReport,
 *   inDelegateWords.
 * Owner context: stdlib standard actions.
 */

import { type ISemanticEvent } from '@sharpee/core';
import { Action, ActionContext, ValidationResult } from '../enhanced-types.js';
import { createActionContext } from '../enhanced-context.js';
import { ValidatedCommand } from '../../validation/types.js';
import {
  ActionLifecycleDescriptor,
  resolveLifecycle,
  getLifecycleState,
  runPreValidate,
  runPostValidate,
  runPostExecute,
  runPostReport
} from '../lifecycle/index.js';

/** The inner action and the context it runs in, carried from validate to report. */
export interface Delegation {
  readonly action: Action;
  readonly lifecycle: ActionLifecycleDescriptor;
  readonly context: ActionContext;
}

/**
 * Validate the inner action on its own context, running its pre- and
 * post-validate hooks around it.
 *
 * @param outer - The outer action's context (world, actor, random stream)
 * @param action - The inner action
 * @param lifecycle - The inner action's interceptor surface
 * @param command - The command the inner action sees; the outer one by default
 * @returns The delegation to carry forward, and the inner verdict (a hook's
 *   veto or the inner action's refusal, else valid)
 */
export function delegateValidate(
  outer: ActionContext,
  action: Action,
  lifecycle: ActionLifecycleDescriptor,
  command: ValidatedCommand = outer.command
): { delegation: Delegation; result: ValidationResult } {
  // Inherits the outer context's action RNG stream (ADR-231 D6).
  const context = createActionContext(outer.world, outer.actor, action, command, outer.random);
  const delegation: Delegation = { action, lifecycle, context };
  const state = resolveLifecycle(context, lifecycle);
  const preVeto = runPreValidate(context, state);
  if (preVeto) return { delegation, result: preVeto };
  const result = action.validate(context);
  if (!result.valid) return { delegation, result };
  const postVeto = runPostValidate(context, state);
  if (postVeto) return { delegation, result: postVeto };
  return { delegation, result: { valid: true } };
}

/**
 * Execute the inner action, then its postExecute hooks.
 *
 * @param delegation - From delegateValidate
 */
export function delegateExecute(delegation: Delegation): void {
  delegation.action.execute(delegation.context);
  const state = getLifecycleState(delegation.context);
  if (state) runPostExecute(delegation.context, state);
}

/**
 * Report the inner action, then its postReport hooks against its own primary
 * event type.
 *
 * @param delegation - From delegateValidate
 * @returns The inner action's events, as its hooks left them
 */
export function delegateReport(delegation: Delegation): ISemanticEvent[] {
  const { action, lifecycle, context } = delegation;
  const events = action.report ? action.report(context) : [];
  const state = getLifecycleState(context);
  if (state) {
    const primary = typeof lifecycle.reportEventType === 'function' ? lifecycle.reportEventType(context) : lifecycle.reportEventType;
    runPostReport(context, state, events, primary);
  }
  return events;
}

/**
 * A refusal from the inner action, in that action's own words: its error
 * qualified with the inner action's id, so the outer action's blocked event
 * renders the inner line (lighting a torch with no battery says what
 * switching on says). An action that speaks its own refusals — inserting —
 * does not call this.
 *
 * @param result - The verdict from delegateValidate
 * @param delegation - The delegation it came from
 * @returns The verdict, with any unqualified error qualified
 */
export function inDelegateWords(result: ValidationResult, delegation: Delegation): ValidationResult {
  if (result.valid || result.errorQualified) return result;
  return { ...result, error: `${delegation.action.id}.${result.error ?? 'action_failed'}`, errorQualified: true };
}
