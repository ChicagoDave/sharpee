/**
 * Unsecure action - unlocks objects that are locked
 * Part of the locking family of actions
 */

import { ActionContext, ValidationResult } from '../../../enhanced-types';
import { IFActions } from '../../../constants';
import { IFEntity, LockableBehavior, TraitType } from '@sharpee/world-model';
import { ISemanticEvent } from '@sharpee/core';
import { LockingBaseAction } from '../locking-base';
import { UnsecuredEventData } from './unsecure-events';

/**
 * Unsecure action - unlocks locked objects
 */
export class UnsecureAction extends LockingBaseAction {
  readonly id = IFActions.UNLOCKING;
  readonly name = 'unsecure';
  readonly aliases = ['unlock'];
  readonly type = 'manipulation';
  protected readonly isSecuring = false;
  
  /**
   * Validates whether the unsecure action can be performed
   */
  validate(context: ActionContext): ValidationResult {
    const directObject = context.command.directObject?.entity;
    const indirectObject = context.command.indirectObject?.entity;
    
    // Need something to unlock
    if (!directObject) {
      return { 
        valid: false, 
        error: 'no_target' 
      };
    }
    
    // Get the target and key entities
    const target = directObject;
    if (!target) {
      return { 
        valid: false, 
        error: 'target_not_found'
      };
    }
    
    // Check if it can be unlocked
    if (!target.has(TraitType.LOCKABLE)) {
      return { 
        valid: false, 
        error: 'not_lockable',
        params: { item: target.name }
      };
    }
    
    // Check if it's already unlocked
    if (!LockableBehavior.isLocked(target)) {
      return { 
        valid: false, 
        error: 'already_unlocked',
        params: { item: target.name }
      };
    }
    
    // Get the key if specified
    let key: IFEntity | undefined = indirectObject;
    
    // Validate key requirements
    const keyValidation = this.validateKeyRequirements(context, target, key);
    if (keyValidation) {
      return keyValidation;
    }
    
    return { valid: true };
  }
  
  /**
   * Executes the unsecure action
   */
  execute(context: ActionContext): ISemanticEvent[] {
    const target = context.command.directObject!.entity!;
    const key = context.command.indirectObject?.entity;
    
    // Unlock the target (pass key if provided)
    const result = LockableBehavior.unlock(target, key);
    
    // The validation should have caught any issues, but let's be safe
    if (!result.success) {
      throw new Error(`Unlock failed unexpectedly: ${JSON.stringify(result)}`);
    }
    
    // Emit the unsecured event with minimal data
    const eventData: UnsecuredEventData = {
      target: target.id,
      targetName: target.name
    };
    
    if (key) {
      eventData.key = key.id;
      eventData.keyName = key.name;
    }
    
    const events: ISemanticEvent[] = [];
    
    // Add the unsecured event
    events.push(context.event('if.event.unsecured', eventData));
    
    // Determine message and add success event
    const hasKey = !!key;
    const messageId = this.determineLockMessage(hasKey);
    
    events.push(context.event('action.success', {
      actionId: this.id,
      messageId: messageId,
      params: {
        item: target.name,
        key: key?.name
      }
    }));
    
    return events;
  }
}