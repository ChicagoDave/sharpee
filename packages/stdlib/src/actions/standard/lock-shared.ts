/**
 * Shared logic for locking and unlocking actions
 */

import { ActionContext, ValidationResult } from '../enhanced-types';
import { IFEntity, TraitType, LockableBehavior, OpenableBehavior } from '@sharpee/world-model';
import { ISemanticEvent } from '@sharpee/core';

/**
 * Shared message constants for lock/unlock validation
 */
export const LOCK_MESSAGES = {
  NO_KEY: 'You need a key to do that.',
  KEY_NOT_HELD: 'You\'re not holding {key}.',
  WRONG_KEY: 'That key doesn\'t fit {item}.',
};

export interface LockAnalysis {
  target: IFEntity;
  key?: IFEntity;
  isContainer: boolean;
  isDoor: boolean;
  requiresKey: boolean;
  keyHeld: boolean;
}

/**
 * Analyzes the lock/unlock context to determine object types and key requirements
 */
export function analyzeLockContext(
  context: ActionContext,
  target: IFEntity,
  key?: IFEntity
): LockAnalysis {
  const actor = context.player;
  const requiresKey = LockableBehavior.requiresKey(target);
  let keyHeld = false;
  
  if (key) {
    const keyLocation = context.world.getLocation(key.id);
    keyHeld = keyLocation === actor.id;
  }
  
  return {
    target,
    key,
    isContainer: target.has(TraitType.CONTAINER),
    isDoor: target.has(TraitType.DOOR),
    requiresKey,
    keyHeld
  };
}

/**
 * Validates key requirements for locking/unlocking
 * Returns validation result with appropriate error if validation fails
 */
export function validateKeyRequirements(
  context: ActionContext,
  target: IFEntity,
  key: IFEntity | undefined,
  isLocking: boolean
): ValidationResult | null {
  if (!LockableBehavior.requiresKey(target)) {
    return null; // No key required, validation passes
  }

  // Key is required but not provided
  if (!key) {
    return {
      valid: false,
      error: LOCK_MESSAGES.NO_KEY
    };
  }

  // Check if player has the key
  const actor = context.player;
  const keyLocation = context.world.getLocation(key.id);
  if (keyLocation !== actor.id) {
    return {
      valid: false,
      error: LOCK_MESSAGES.KEY_NOT_HELD,
      params: { key: key.name }
    };
  }

  // Check if it's the right key
  const canUseKey = isLocking
    ? LockableBehavior.canLockWith(target, key.id)
    : LockableBehavior.canUnlockWith(target, key.id);

  if (!canUseKey) {
    return {
      valid: false,
      error: LOCK_MESSAGES.WRONG_KEY,
      params: {
        key: key.name,
        item: target.name
      }
    };
  }

  return null; // All key validations pass
}

/**
 * Creates error events based on lock/unlock result
 */
export function createLockErrorEvent(
  context: ActionContext,
  result: any,
  target: IFEntity,
  key: IFEntity | undefined,
  isLocking: boolean
): ISemanticEvent | null {
  const actionId = context.action.id;
  
  if (isLocking) {
    if (result.alreadyLocked) {
      return context.event('action.error', {
        actionId,
        messageId: 'already_locked',
        reason: 'already_locked',
        params: { item: target.name }
      });
    }
    if (result.notClosed) {
      return context.event('action.error', {
        actionId,
        messageId: 'not_closed',
        reason: 'not_closed',
        params: { item: target.name }
      });
    }
  } else {
    if (result.alreadyUnlocked) {
      return context.event('action.error', {
        actionId,
        messageId: 'already_unlocked',
        reason: 'already_unlocked',
        params: { item: target.name }
      });
    }
  }
  
  // Common errors for both
  if (result.noKey) {
    return context.event('action.error', {
      actionId,
      messageId: 'no_key',
      reason: 'no_key'
    });
  }
  
  if (result.wrongKey) {
    return context.event('action.error', {
      actionId,
      messageId: 'wrong_key',
      reason: 'wrong_key',
      params: { 
        key: key?.name || 'key', 
        item: target.name 
      }
    });
  }
  
  // Fallback error
  return context.event('action.error', {
    actionId,
    messageId: isLocking ? 'cannot_lock' : 'cannot_unlock',
    reason: isLocking ? 'cannot_lock' : 'cannot_unlock',
    params: { item: target.name }
  });
}

/**
 * Determines the appropriate message based on lock/unlock action
 */
export function determineLockMessage(
  isLocking: boolean,
  hasKey: boolean
): string {
  if (isLocking) {
    return hasKey ? 'locked_with' : 'locked';
  } else {
    return hasKey ? 'unlocked_with' : 'unlocked';
  }
}