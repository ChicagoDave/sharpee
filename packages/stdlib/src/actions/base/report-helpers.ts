/**
 * Report phase helpers for reducing boilerplate across actions
 *
 * These helpers standardize error event generation in the report phase,
 * ensuring consistent error handling across all stdlib actions.
 */

import { ActionContext, ValidationResult } from '../enhanced-types';
import { ISemanticEvent } from '@sharpee/core';
import { captureEntitySnapshot } from './snapshot-utils';

/**
 * Options for error event generation
 */
export interface ErrorEventOptions {
  /**
   * Whether to include a snapshot of the direct object entity.
   * Defaults to true if the entity exists.
   */
  includeTargetSnapshot?: boolean;

  /**
   * Whether to include a snapshot of the indirect object entity.
   * Defaults to true if the entity exists.
   */
  includeIndirectSnapshot?: boolean;
}

/**
 * Handle validation errors in report phase
 *
 * Creates standardized error events when validation fails.
 * Returns null if validation passed (valid === true).
 *
 * @param context The action context
 * @param validationResult The result from the validate phase
 * @param options Optional configuration for snapshot capture
 * @returns Array of error events if validation failed, null otherwise
 *
 * @example
 * report(context, validationResult, executionError) {
 *   const errorEvents = handleValidationError(context, validationResult);
 *   if (errorEvents) return errorEvents;
 *
 *   // ... success logic
 * }
 */
export function handleValidationError(
  context: ActionContext,
  validationResult?: ValidationResult,
  options: ErrorEventOptions = {}
): ISemanticEvent[] | null {
  if (!validationResult || validationResult.valid) {
    return null;
  }

  const errorParams = { ...(validationResult.params || {}) };

  // Optionally capture entity snapshots for richer error context
  if (options.includeTargetSnapshot !== false && context.command.directObject?.entity) {
    errorParams.targetSnapshot = captureEntitySnapshot(
      context.command.directObject.entity,
      context.world,
      false
    );
  }

  if (options.includeIndirectSnapshot !== false && context.command.indirectObject?.entity) {
    errorParams.indirectTargetSnapshot = captureEntitySnapshot(
      context.command.indirectObject.entity,
      context.world,
      false
    );
  }

  return [
    context.event('action.error', {
      actionId: context.action.id,
      error: validationResult.error || 'validation_failed',
      reason: validationResult.error || 'validation_failed',
      messageId: validationResult.messageId || validationResult.error || 'action_failed',
      params: errorParams
    })
  ];
}

/**
 * Handle execution errors in report phase
 *
 * Creates standardized error events when execution throws an error.
 * Returns null if no execution error occurred.
 *
 * @param context The action context
 * @param executionError Error thrown during execute phase (if any)
 * @returns Array of error events if execution failed, null otherwise
 *
 * @example
 * report(context, validationResult, executionError) {
 *   const errorEvents = handleExecutionError(context, executionError);
 *   if (errorEvents) return errorEvents;
 *
 *   // ... success logic
 * }
 */
export function handleExecutionError(
  context: ActionContext,
  executionError?: Error
): ISemanticEvent[] | null {
  if (!executionError) {
    return null;
  }

  return [
    context.event('action.error', {
      actionId: context.action.id,
      error: 'execution_failed',
      messageId: 'action_failed',
      params: { error: executionError.message }
    })
  ];
}

/**
 * Combined helper - handles both validation and execution errors
 *
 * This is the recommended helper for most actions. It checks validation
 * first, then execution errors, returning error events for whichever
 * failed first (or null if both succeeded).
 *
 * @param context The action context
 * @param validationResult The result from the validate phase
 * @param executionError Error thrown during execute phase (if any)
 * @param options Optional configuration for snapshot capture
 * @returns Array of error events if any error occurred, null otherwise
 *
 * @example
 * report(context, validationResult, executionError) {
 *   const errorEvents = handleReportErrors(context, validationResult, executionError);
 *   if (errorEvents) return errorEvents;
 *
 *   // All clear - generate success events
 *   const noun = context.command.directObject!.entity!;
 *   return [
 *     context.event('if.event.taken', { item: noun.name }),
 *     context.event('action.success', { actionId: this.id, messageId: 'taken' })
 *   ];
 * }
 */
export function handleReportErrors(
  context: ActionContext,
  validationResult?: ValidationResult,
  executionError?: Error,
  options: ErrorEventOptions = {}
): ISemanticEvent[] | null {
  // Check validation errors first
  const validationEvents = handleValidationError(context, validationResult, options);
  if (validationEvents) return validationEvents;

  // Then check execution errors
  const executionEvents = handleExecutionError(context, executionError);
  if (executionEvents) return executionEvents;

  // No errors
  return null;
}
