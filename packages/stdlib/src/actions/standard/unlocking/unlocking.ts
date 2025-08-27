/**
 * Unlocking action - unlocks containers and doors
 * 
 * This action properly delegates to LockableBehavior for validation
 * and execution. It follows the validate/execute pattern.
 */

import { Action, ActionContext, ValidationResult } from '../../enhanced-types';
import { ActionMetadata } from '../../../validation';
import { ISemanticEvent } from '@sharpee/core';
import { TraitType, LockableBehavior, IUnlockResult } from '@sharpee/world-model';
import { IFActions } from '../../constants';
import { ScopeLevel } from '../../../scope';
import { UnlockedEventData } from './unlocking-events';
import { analyzeLockContext, validateKeyRequirements, createLockErrorEvent, determineLockMessage } from '../lock-shared';

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
    
    // Validate key requirements using shared helper
    const keyValidation = validateKeyRequirements(context, noun, withKey, false);
    if (keyValidation) {
      return keyValidation;
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
    const noun = context.command.directObject!.entity!; // Safe because validate ensures it exists
    const withKey = context.command.indirectObject?.entity;
    
    // Analyze the unlocking context
    const analysis = analyzeLockContext(context, noun, withKey);
    
    // Delegate to behavior for unlocking
    const result: IUnlockResult = LockableBehavior.unlock(noun, withKey);
    
    // Check if the behavior reported failure
    if (!result.success) {
      const errorEvent = createLockErrorEvent(context, result, noun, withKey, false);
      return errorEvent ? [errorEvent] : [];
    }
    
    // Unlocking succeeded - gather additional information
    const contents = analysis.isContainer ? context.world.getContents(noun.id) : [];
    
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
      isContainer: analysis.isContainer,
      isDoor: analysis.isDoor,
      requiresKey: analysis.requiresKey,
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
    const messageId = determineLockMessage(false, !!withKey);
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