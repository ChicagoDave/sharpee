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

import { IFEntity, WorldModel, TraitType } from '@sharpee/world-model';
import { Action } from '../actions/enhanced-types';
import { ScopeResolver, ScopeLevel } from '../scope/types';

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
export function meetsActionRequirements(
  entity: IFEntity,
  action: Action,
  world: WorldModel
): boolean {
  const requirements = action.targetRequirements;
  if (!requirements) {
    // No requirements defined - entity is valid
    return true;
  }

  // Check trait requirement
  if (requirements.trait) {
    if (!entity.has(requirements.trait as TraitType)) {
      return false;
    }

    // Check condition if specified
    if (requirements.condition) {
      const trait = entity.get(requirements.trait as TraitType) as any;
      if (!trait) return false;

      switch (requirements.condition) {
        case 'not_open':
          // For opening: must not be already open
          return trait.isOpen !== true;

        case 'is_open':
          // For closing: must be currently open
          return trait.isOpen === true;

        case 'not_locked':
          // For unlocking: must be locked
          return trait.isLocked === true;

        case 'is_locked':
          // For locking: must not be locked
          return trait.isLocked !== true;

        case 'not_on':
          // For switching on: must be off
          return trait.isOn !== true;

        case 'is_on':
          // For switching off: must be on
          return trait.isOn === true;

        default:
          // Unknown condition - treat as met
          return true;
      }
    }
  }

  return true;
}

/**
 * Get all entities in scope that meet action requirements
 *
 * @param action The action to check requirements for
 * @param scope Entities currently in scope
 * @param world The world model
 * @returns Array of entities that meet requirements
 */
export function findValidTargets(
  action: Action,
  scope: IFEntity[],
  world: WorldModel
): IFEntity[] {
  return scope.filter(entity => meetsActionRequirements(entity, action, world));
}

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
export function tryInferTarget(
  originalTarget: IFEntity,
  wasPronoun: boolean,
  action: Action,
  scope: IFEntity[],
  world: WorldModel
): InferenceResult {
  // CRITICAL: Only infer when pronouns are used
  if (!wasPronoun) {
    return {
      inferred: false,
      originalTarget,
      failureReason: 'not_pronoun'
    };
  }

  // CRITICAL: If the pronoun resolved to a specific entity, respect the player's intent.
  // Don't override "read it" (where it=mat) with a different readable item.
  // The player explicitly referenced the mat via pronoun context, so show the
  // error for the mat ("nothing written on it") rather than inferring an alternative.
  //
  // This makes pronouns behave predictably: "get X; read it" always refers to X.
  //
  // DESIGN NOTE: This disables ADR-104 inference. If inference is needed in the
  // future, it should only trigger when the pronoun resolution was truly ambiguous
  // (e.g., no clear referent from recent context), not when the player clearly
  // referenced a specific entity.
  return {
    inferred: false,
    originalTarget,
    failureReason: 'not_pronoun'
  };
}
