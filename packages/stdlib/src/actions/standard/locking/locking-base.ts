/**
 * Base class for locking-related actions (secure/unsecure)
 * Provides shared validation and utility methods
 */

import { Action, ActionContext, ValidationResult } from '../../enhanced-types';
import { IFEntity, LockableBehavior, OpenableBehavior } from '@sharpee/world-model';
import { EntityId, ISemanticEvent } from '@sharpee/core';

/**
 * Analysis result for lock context
 */
export interface LockAnalysis {
  target: IFEntity;
  key?: IFEntity;
  requiresKey: boolean;
  keyHeld: boolean;
}

/**
 * Abstract base class for locking actions
 */
export abstract class LockingBaseAction implements Action {
  abstract readonly id: string;
  abstract readonly name: string;
  abstract readonly aliases?: string[];
  abstract readonly type: string;
  
  /**
   * Whether this action is securing (true) or unsecuring (false)
   */
  protected abstract readonly isSecuring: boolean;
  
  abstract validate(context: ActionContext): ValidationResult;
  abstract execute(context: ActionContext): ISemanticEvent[];

  /**
   * Analyzes the lock context to determine key requirements
   */
  protected analyzeLockContext(
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
      requiresKey,
      keyHeld
    };
  }

  /**
   * Validates key requirements for the action
   */
  protected validateKeyRequirements(
    context: ActionContext,
    target: IFEntity,
    key: IFEntity | undefined
  ): ValidationResult | null {
    if (!LockableBehavior.requiresKey(target)) {
      return null; // No key required, validation passes
    }
    
    // Key is required but not provided
    if (!key) {
      return { 
        valid: false, 
        error: 'no_key'
      };
    }
    
    // Check if player has the key
    const actor = context.player;
    const keyLocation = context.world.getLocation(key.id);
    if (keyLocation !== actor.id) {
      return { 
        valid: false, 
        error: 'key_not_held',
        params: { key: key.name }
      };
    }
    
    // Check if it's the right key
    const canUseKey = this.isSecuring 
      ? LockableBehavior.canLockWith(target, key.id)
      : LockableBehavior.canUnlockWith(target, key.id);
      
    if (!canUseKey) {
      return { 
        valid: false, 
        error: 'wrong_key',
        params: { 
          key: key.name, 
          item: target.name 
        }
      };
    }
    
    return null; // All key validations pass
  }

  /**
   * Determines the appropriate message based on the action and context
   */
  protected determineLockMessage(hasKey: boolean): string {
    if (this.isSecuring) {
      return hasKey ? 'locked_with' : 'locked';
    } else {
      return hasKey ? 'unlocked_with' : 'unlocked';
    }
  }
}