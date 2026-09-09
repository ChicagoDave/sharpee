/**
 * Runs an action's four phases with the interceptor lifecycle around them.
 *
 * The one place the ADR-228 hooks are called for a standard action: the
 * command executor runs every action through these four functions, so an
 * action whose descriptor is in the registry is consulted at all four
 * phase boundaries on every path, and an action without one runs alone.
 * Validate is preValidate, the action's own validation, then postValidate
 * after ALL standard validation; execute and report each end with their
 * hook; blocked ends with onBlocked. A descriptor's `earlyRefusal` runs
 * ahead of preValidate, and its `contracts` name the two exceptions: a
 * hook the action runs itself at a point inside its phase, and a
 * multi-object command the action handles per item. The conversation
 * actions declare postValidate too, because a gripped input (ADR-320
 * D16) must never reach the topic table's occurrence bump.
 *
 * Tests that drive an action's phases directly call these functions too,
 * so they see the same hook placement the executor gives a real turn.
 *
 * Public interface: `runValidatePhase`, `runExecutePhase`,
 * `runReportPhase`, `runBlockedPhase`.
 * Owner: stdlib standard-action infrastructure.
 *
 * References: ADR-337 D1 (the executor as the one call site), ADR-228
 * (the lifecycle engine and its rulings), ADR-228 D4 (the per-item
 * multi-object remainder).
 */

import type { ISemanticEvent } from '@sharpee/core';
import type { Action, ActionContext, ValidationResult } from '../enhanced-types.js';
import type { ActionLifecycleDescriptor } from './descriptor.js';
import {
  resolveLifecycle,
  getLifecycleState,
  runPreValidate,
  runPostValidate,
  runPostExecute,
  runPostReport,
  runOnBlocked
} from './lifecycle-engine.js';
import { lifecycleDescriptorFor } from './registry.js';

/**
 * The descriptor the executor applies for this command: the action's own,
 * unless the command is multi-object and the action runs the per-item
 * lifecycle itself (ADR-228 D4), in which case none of the single-object
 * hooks run here.
 */
function lifecycleFor(action: Action, context: ActionContext): ActionLifecycleDescriptor | undefined {
  const descriptor = lifecycleDescriptorFor(action.id);
  if (!descriptor) return undefined;
  if (descriptor.contracts?.handlesMultiObject) {
    const directObject = context.command.parsed.structure.directObject;
    if (directObject?.isAll || directObject?.isList) return undefined;
  }
  return descriptor;
}

/** Whether the action declared that it runs the named hook itself. */
function runsOwnHook(descriptor: ActionLifecycleDescriptor, hook: 'postValidate' | 'postExecute' | 'postReport'): boolean {
  return descriptor.contracts?.runsOwnHooks?.includes(hook) ?? false;
}

/**
 * Validate with the lifecycle's validate-phase hooks around the action's
 * own `validate`: `earlyRefusal` first, then preValidate, then the action,
 * then postValidate. The resolved state is stored on the context for the
 * later phases.
 * @param action - the action being run
 * @param context - the action context (the original or an inferred one)
 * @returns the validation result the later phases branch on
 */
export function runValidatePhase(action: Action, context: ActionContext): ValidationResult {
  const descriptor = lifecycleFor(action, context);
  if (!descriptor) return action.validate(context);
  const state = resolveLifecycle(context, descriptor);
  const early = descriptor.earlyRefusal?.(context);
  if (early && !early.valid) return early;
  const preVeto = runPreValidate(context, state);
  if (preVeto) return preVeto;
  const standard = action.validate(context);
  if (!standard.valid || runsOwnHook(descriptor, 'postValidate')) return standard;
  const postVeto = runPostValidate(context, state);
  if (postVeto) return postVeto;
  return standard;
}

/**
 * Execute, then run postExecute for every consultation unless the action
 * runs that hook itself.
 * @param action - the action being run
 * @param context - the context `runValidatePhase` validated
 * @returns whatever the action's `execute` returned (events, for the
 *   pre-report pattern; otherwise nothing)
 */
export function runExecutePhase(action: Action, context: ActionContext): ReturnType<Action['execute']> {
  const result = action.execute(context);
  const descriptor = lifecycleFor(action, context);
  const state = descriptor ? getLifecycleState(context) : undefined;
  if (descriptor && state && !runsOwnHook(descriptor, 'postExecute')) {
    runPostExecute(context, state);
  }
  return result;
}

/**
 * Report, then run postReport against the action's primary event unless
 * the action runs that hook itself.
 * @param action - the action being run
 * @param context - the context `runExecutePhase` ran
 * @returns the action's success events, decorated by the interceptors
 */
export function runReportPhase(action: Action, context: ActionContext): ISemanticEvent[] {
  if (!action.report) {
    throw new Error(`Action ${action.id} uses new pattern but lacks report()`);
  }
  const events = action.report(context);
  const descriptor = lifecycleFor(action, context);
  const state = descriptor ? getLifecycleState(context) : undefined;
  if (descriptor && state && !runsOwnHook(descriptor, 'postReport')) {
    const primary = descriptor.reportEventType;
    runPostReport(context, state, events, typeof primary === 'function' ? primary(context) : primary);
  }
  return events;
}

/**
 * Report a refusal, then run onBlocked against the action's blocked event.
 * The standard blocked event always survives (ADR-228 D2).
 * @param action - the action being run
 * @param context - the context `runValidatePhase` refused
 * @param result - the failing validation result
 * @returns the action's blocked events, decorated by the interceptors
 */
export function runBlockedPhase(action: Action, context: ActionContext, result: ValidationResult): ISemanticEvent[] {
  if (!action.blocked) {
    throw new Error(`Action ${action.id} has no blocked()`);
  }
  const events = action.blocked(context, result);
  const descriptor = lifecycleFor(action, context);
  const state = descriptor ? getLifecycleState(context) : undefined;
  if (descriptor && state && result.error) {
    runOnBlocked(context, state, events, descriptor.blockedEventType, result.error);
  }
  return events;
}
