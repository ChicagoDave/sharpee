/**
 * Locking action - locks containers and doors
 * 
 * This action properly delegates to LockableBehavior for validation
 * and execution. It follows the validate/execute pattern.
 */

import { Action, ActionContext, ValidationResult } from '../../enhanced-types';
import { ActionMetadata } from '../../../validation';
import { ISemanticEvent } from '@sharpee/core';
import { TraitType, LockableBehavior, OpenableBehavior, ILockResult } from '@sharpee/world-model';
import { IFActions } from '../../constants';
import { ScopeLevel } from '../../../scope';
import { LockedEventData } from './locking-events';
import { analyzeLockContext, validateKeyRequirements, createLockErrorEvent, determineLockMessage } from '../lock-shared';

export const lockingAction: Action & { metadata: ActionMetadata } = {
  id: IFActions.LOCKING,
  requiredMessages: [
    'no_target',
    'not_lockable',
    'no_key',
    'wrong_key',
    'already_locked',
    'not_closed',
    'locked',
    'locked_with',
    'cant_reach',
    'key_not_held'
  ],
  group: 'lock_manipulation',
  
  /**
   * Validate whether the lock action can be executed
   * Uses behavior validation methods to check preconditions
   */
  validate(context: ActionContext): ValidationResult {
    const noun = context.command.directObject?.entity;
    const withKey = context.command.indirectObject?.entity;
    
    // Validate we have a target
    if (!noun) {
      return { 
        valid: false, 
        error: 'no_target'
      };
    }
    
    // Check if it's lockable
    if (!noun.has(TraitType.LOCKABLE)) {
      return { 
        valid: false, 
        error: 'not_lockable',
        params: { item: noun.name }
      };
    }
    
    // Use behavior's canLock method for validation
    if (!LockableBehavior.canLock(noun)) {
      // Check specific reason why it can't be locked
      if (LockableBehavior.isLocked(noun)) {
        return { 
          valid: false, 
          error: 'already_locked',
          params: { item: noun.name }
        };
      }
      if (noun.has(TraitType.OPENABLE) && OpenableBehavior.isOpen(noun)) {
        return { 
          valid: false, 
          error: 'not_closed',
          params: { item: noun.name }
        };
      }
    }
    
    // Validate key requirements using shared helper
    const keyValidation = validateKeyRequirements(context, noun, withKey, true);
    if (keyValidation) {
      return keyValidation;
    }
    
    return { valid: true };
  },
  
  /**
   * Execute the lock action
   * Assumes validation has already passed - no validation logic here
   * Delegates to LockableBehavior for actual state changes
   */
  execute(context: ActionContext): ISemanticEvent[] {
    // Assume validation has passed - no checks needed
    const noun = context.command.directObject!.entity!; // Safe because validate ensures it exists
    const withKey = context.command.indirectObject?.entity;
    
    // Analyze the locking context
    const analysis = analyzeLockContext(context, noun, withKey);
    
    // Delegate to behavior for locking
    const result: ILockResult = LockableBehavior.lock(noun, withKey);
    
    // Check if the behavior reported failure
    if (!result.success) {
      const errorEvent = createLockErrorEvent(context, result, noun, withKey, true);
      return errorEvent ? [errorEvent] : [];
    }
    
    // Locking succeeded - build the event data
    const eventData: LockedEventData = {
      targetId: noun.id,
      targetName: noun.name
    };
    
    // Add type information from analysis
    if (analysis.isContainer) {
      eventData.isContainer = true;
    }
    
    if (analysis.isDoor) {
      eventData.isDoor = true;
    }
    
    // Add key information
    if (withKey) {
      eventData.keyId = withKey.id;
      eventData.keyName = withKey.name;
    }
    
    // Add sound information from result
    if (result.lockSound) {
      eventData.sound = result.lockSound;
    }
    
    // Determine success message
    const messageId = determineLockMessage(true, !!withKey);
    const params: Record<string, any> = {
      item: noun.name
    };
    
    // Add container/door info
    if (analysis.isContainer) {
      params.isContainer = true;
    }
    if (analysis.isDoor) {
      params.isDoor = true;
    }
    
    if (withKey) {
      params.key = withKey.name;
    }
    
    // Create the LOCKED event and success message
    return [
      context.event('if.event.locked', eventData),
      context.event('action.success', {
        actionId: context.action.id,
        messageId,
        params: params
      })
    ];
  },
  
  metadata: {
    requiresDirectObject: true,
    requiresIndirectObject: false,
    directObjectScope: ScopeLevel.REACHABLE
  }
};