/**
 * Typed constants for sharedData keys used by the engine orchestration.
 *
 * SharedData is passed between action phases (validate/execute/report/blocked)
 * and allows phases to communicate without modifying the context directly.
 *
 * This file defines only engine-level keys. Actions define their own
 * action-specific keys as needed.
 */

import type { ISemanticEvent } from '@sharpee/core';
import type { IFEntity } from '@sharpee/world-model';
import type { ValidationResult } from '@sharpee/stdlib';

/**
 * Constants for engine-level sharedData keys.
 * Using constants prevents typos and enables IDE autocomplete.
 */
export const SharedDataKeys = {
  /** Whether pronoun inference was performed (ADR-104) */
  INFERENCE_PERFORMED: 'inferencePerformed',

  /** The original target entity before inference */
  ORIGINAL_TARGET: 'originalTarget',

  /** The inferred target entity after inference */
  INFERRED_TARGET: 'inferredTarget',

  /** Events from implicit take actions (ADR-104) */
  IMPLICIT_TAKE_EVENTS: 'implicitTakeEvents',

  /** Validation result from the validate phase */
  VALIDATION_RESULT: 'validationResult',
} as const;

/**
 * Type for the value type of a SharedDataKey
 */
export type SharedDataKeyType = typeof SharedDataKeys[keyof typeof SharedDataKeys];

/**
 * Typed interface for engine-level shared data.
 *
 * Note: Actions can store additional keys beyond these.
 * This interface covers only the engine orchestration keys.
 */
export interface EngineSharedData {
  /** Whether pronoun inference was performed */
  [SharedDataKeys.INFERENCE_PERFORMED]?: boolean;

  /** The original target entity before inference */
  [SharedDataKeys.ORIGINAL_TARGET]?: IFEntity;

  /** The inferred target entity after inference */
  [SharedDataKeys.INFERRED_TARGET]?: IFEntity;

  /** Events from implicit take actions */
  [SharedDataKeys.IMPLICIT_TAKE_EVENTS]?: ISemanticEvent[];

  /** Validation result from the validate phase */
  [SharedDataKeys.VALIDATION_RESULT]?: ValidationResult;

  /** Allow additional action-specific keys */
  [key: string]: unknown;
}
