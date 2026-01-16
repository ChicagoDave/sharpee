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

  // Check if action has requirements to infer against
  if (!action.targetRequirements) {
    return {
      inferred: false,
      originalTarget,
      failureReason: 'no_requirements'
    };
  }

  // Check if inference is explicitly disabled for this action
  if (action.allowImplicitInference === false) {
    return {
      inferred: false,
      originalTarget,
      failureReason: 'no_requirements' // Treated as no requirements
    };
  }

  // Check if original target already meets requirements
  if (meetsActionRequirements(originalTarget, action, world)) {
    return {
      inferred: false,
      originalTarget,
      failureReason: 'original_valid'
    };
  }

  // Find all entities in scope that meet requirements
  // Exclude the original target from consideration
  const validTargets = findValidTargets(action, scope, world)
    .filter(e => e.id !== originalTarget.id);

  // No valid targets - can't infer
  if (validTargets.length === 0) {
    return {
      inferred: false,
      originalTarget,
      failureReason: 'no_valid_targets'
    };
  }

  // Multiple valid targets - ambiguous, don't infer
  if (validTargets.length > 1) {
    return {
      inferred: false,
      originalTarget,
      failureReason: 'multiple_valid_targets'
    };
  }

  // Exactly ONE valid target - infer it!
  const inferredTarget = validTargets[0];
  return {
    inferred: true,
    originalTarget,
    inferredTarget,
    reason: `only ${action.targetRequirements.description} in scope`
  };
}
