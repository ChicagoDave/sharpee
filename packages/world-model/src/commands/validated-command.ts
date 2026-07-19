/**
 * Command types for the validation phase
 * These types represent fully resolved and validated commands
 * with entities and action IDs identified
 */

import type { EntityId } from '@sharpee/core';
import type { IParsedObjectReference, IParsedCommand } from './parsed-command.js';
import type { IFEntity } from '../entities/if-entity.js';

/**
 * Resolved entity reference after validation
 */
export interface IValidatedObjectReference {
  /** The resolved entity */
  entity: IFEntity;
  
  /** Original parsed reference */
  parsed: IParsedObjectReference;
}

/**
 * Result of validation phase - fully resolved and checked
 */
export interface IValidatedCommand {
  /** Original parsed command */
  parsed: IParsedCommand;

  /** ID of the action that will handle this command */
  actionId: string;

  /** Resolved direct object if present */
  directObject?: IValidatedObjectReference;

  /** Resolved indirect object if present */
  indirectObject?: IValidatedObjectReference;

  /**
   * Resolved instrument if present (ADR-080)
   * For patterns using .instrument() to mark a slot as a tool/weapon
   * e.g., "attack troll with sword" where sword is the instrument
   */
  instrument?: IValidatedObjectReference;

  /**
   * Conversation topic if present (ADR-231 D4)
   * Entity-first resolution with text fallback: `entity` is the EntityId of
   * the single in-scope entity the topic text named (resolved quietly — no
   * disambiguation prompt, never a scope rejection); free text flows
   * through with `entity` undefined.
   */
  topic?: {
    /** Verbatim topic text as typed */
    text: string;
    /** Resolved in-scope entity, when the text named exactly one */
    entity?: EntityId;
  };

  /** Validation metadata */
  metadata?: {
    /** Time taken to validate */
    validationTime?: number;

    /** Any warnings during validation */
    warnings?: string[];
  };
}

/**
 * Errors that can occur during validation
 */
export interface IValidationError {
  type: 'VALIDATION_ERROR';
  code: 'ENTITY_NOT_FOUND' | 'ENTITY_NOT_VISIBLE' | 'ACTION_NOT_AVAILABLE' | 'PRECONDITION_FAILED' | 'AMBIGUOUS_ENTITY';
  parsed: IParsedCommand;
  details?: Record<string, any>;
}
