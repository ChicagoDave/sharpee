/**
 * Unlocking action - unlocks containers and doors
 * 
 * This action properly delegates to LockableBehavior for validation
 * and execution. It follows the validate/execute pattern.
 */

import { Action, ActionContext, ValidationResult } from '../../enhanced-types';
import { ActionMetadata } from '../../../validation';
import { ISemanticEvent, EntityId } from '@sharpee/core';
import { TraitType, LockableBehavior, IUnlockResult } from '@sharpee/world-model';
import { IFActions } from '../../constants';
import { ScopeLevel } from '../../../scope';
import { UnlockedEventData } from './unlocking-events';

export const unlockingAction: Action & { metadata: ActionMetadata } = {
  id: IFActions.UNLOCKING,
  requiredMessages: [
    'no_target',
    'not_lockable',
    'no_key',
    'wrong_key',
    'already_unlocked',
    'unlocked',
    'unlocked_with',
    'cant_reach',
    'key_not_held',
    'still_locked'
  ],
  group: 'lock_manipulation',
  
  /**
   * Validate whether the unlock action can be executed
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
    
    // Use behavior's canUnlock method for validation
    if (!LockableBehavior.canUnlock(noun)) {
      return { 
        valid: false, 
        error: 'already_unlocked',
        params: { item: noun.name }
      };
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
      if (!LockableBehavior.canUnlockWith(noun, withKey.id)) {
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
   * Execute the unlock action
   * Assumes validation has already passed - no validation logic here
   * Delegates to LockableBehavior for actual state changes
   */
  execute(context: ActionContext): ISemanticEvent[] {
    // Assume validation has passed - no checks needed
    const actor = context.player;
    const noun = context.command.directObject!.entity!; // Safe because validate ensures it exists
    const withKey = context.command.indirectObject?.entity;
    
    // Delegate to behavior for unlocking
    const result: IUnlockResult = LockableBehavior.unlock(noun, withKey);
    
    // Check if the behavior reported failure
    if (!result.success) {
      if (result.alreadyUnlocked) {
        return [context.event('action.error', {
          actionId: context.action.id,
          messageId: 'already_unlocked',
          reason: 'already_unlocked',
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
        messageId: 'cannot_unlock',
        reason: 'cannot_unlock',
        params: { item: noun.name }
      })];
    }
    
    // Unlocking succeeded - gather information about what we're unlocking
    const isContainer = noun.has(TraitType.CONTAINER);
    const isDoor = noun.has(TraitType.DOOR);
    const contents = isContainer ? context.world.getContents(noun.id) : [];
    const requiresKey = LockableBehavior.requiresKey(noun);
    
    // Check for auto-open behavior
    let willAutoOpen = false;
    if (noun.has(TraitType.OPENABLE)) {
      const openableTrait = noun.get(TraitType.OPENABLE) as any;
      willAutoOpen = openableTrait.autoOpenOnUnlock || false;
    }
    
    // Build the event data
    const eventData: UnlockedEventData = {
      targetId: noun.id,
      targetName: noun.name,
      containerId: noun.id,
      containerName: noun.name,
      isContainer,
      isDoor,
      requiresKey,
      hasContents: contents.length > 0,
      contentsCount: contents.length,
      contentsIds: contents.map(e => e.id),
      sound: result.unlockSound,
      willAutoOpen
    };
    
    // Add key information if used
    if (withKey) {
      eventData.keyId = withKey.id;
      eventData.keyName = withKey.name;
    }
    
    // Determine message
    const messageId = withKey ? 'unlocked_with' : 'unlocked';
    const params: Record<string, any> = {
      item: noun.name
    };
    if (withKey) {
      params.key = withKey.name;
    }
    
    // Create the UNLOCKED event and success message
    return [
      context.event('if.event.unlocked', eventData),
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
