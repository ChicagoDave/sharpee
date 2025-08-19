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
    
    // Check key requirements
    if (LockableBehavior.requiresKey(noun)) {
      // No key specified
      if (!withKey) {
        return { 
          valid: false, 
          error: 'no_key'
        };
      }
      
      // Check if player has the key
      const actor = context.player;
      const keyLocation = context.world.getLocation(withKey.id);
      if (keyLocation !== actor.id) {
        return { 
          valid: false, 
          error: 'key_not_held',
          params: { key: withKey.name }
        };
      }
      
      // Check if it's the right key
      if (!LockableBehavior.canLockWith(noun, withKey.id)) {
        return { 
          valid: false, 
          error: 'wrong_key',
          params: { 
            key: withKey.name, 
            item: noun.name 
          }
        };
      }
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
    const actor = context.player;
    const noun = context.command.directObject!.entity!; // Safe because validate ensures it exists
    const withKey = context.command.indirectObject?.entity;
    
    // Delegate to behavior for locking
    const result: ILockResult = LockableBehavior.lock(noun, withKey);
    
    // Check if the behavior reported failure
    if (!result.success) {
      if (result.alreadyLocked) {
        return [context.event('action.error', {
          actionId: context.action.id,
          messageId: 'already_locked',
          reason: 'already_locked',
          params: { item: noun.name }
        })];
      }
      if (result.notClosed) {
        return [context.event('action.error', {
          actionId: context.action.id,
          messageId: 'not_closed',
          reason: 'not_closed',
          params: { item: noun.name }
        })];
      }
      if (result.noKey) {
        return [context.event('action.error', {
          actionId: context.action.id,
          messageId: 'no_key',
          reason: 'no_key'
        })];
      }
      if (result.wrongKey) {
        return [context.event('action.error', {
          actionId: context.action.id,
          messageId: 'wrong_key',
          reason: 'wrong_key',
          params: { 
            key: withKey?.name || 'key', 
            item: noun.name 
          }
        })];
      }
      // Shouldn't happen if validate() was called, but handle it
      return [context.event('action.error', {
        actionId: context.action.id,
        messageId: 'cannot_lock',
        reason: 'cannot_lock',
        params: { item: noun.name }
      })];
    }
    
    // Locking succeeded - build the event data
    const eventData: LockedEventData = {
      targetId: noun.id,
      targetName: noun.name
    };
    
    // Add type information
    if (noun.has(TraitType.CONTAINER)) {
      eventData.isContainer = true;
    }
    
    if (noun.has(TraitType.DOOR)) {
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
    let messageId = 'locked';
    const params: Record<string, any> = {
      item: noun.name
    };
    
    // Add container/door info
    if (noun.has(TraitType.CONTAINER)) {
      params.isContainer = true;
    }
    if (noun.has(TraitType.DOOR)) {
      params.isDoor = true;
    }
    
    if (withKey) {
      messageId = 'locked_with';
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
