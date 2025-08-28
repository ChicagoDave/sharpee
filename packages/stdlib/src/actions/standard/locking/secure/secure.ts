/**
 * Secure action - locks objects that can be locked
 * Part of the locking family of actions
 */

import { ActionContext, ValidationResult } from '../../../enhanced-types';
import { IFActions } from '../../../constants';
import { IFEntity, LockableBehavior, OpenableBehavior, TraitType } from '@sharpee/world-model';
import { ISemanticEvent } from '@sharpee/core';
import { LockingBaseAction } from '../locking-base';
import { SecuredEventData } from './secure-events';

/**
 * Secure action - locks lockable objects
 */
export class SecureAction extends LockingBaseAction {
  readonly id = IFActions.LOCKING;
  readonly name = 'secure';
  readonly aliases = ['lock'];
  readonly type = 'manipulation';
  protected readonly isSecuring = true;
  
  /**
   * Validates whether the secure action can be performed
   */
  validate(context: ActionContext): ValidationResult {
    const directObject = context.command.directObject?.entity;
    const indirectObject = context.command.indirectObject?.entity;
    
    // Need something to lock
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
    
    // Check if it can be locked
    if (!target.has(TraitType.LOCKABLE)) {
      return { 
        valid: false, 
        error: 'not_lockable',
        params: { item: target.name }
      };
    }
    
    // Check if it's already locked
    if (LockableBehavior.isLocked(target)) {
      return { 
        valid: false, 
        error: 'already_locked',
        params: { item: target.name }
      };
    }
    
    // For doors and containers, check if they're closed
    if (target.has(TraitType.OPENABLE) && OpenableBehavior.isOpen(target)) {
      return { 
        valid: false, 
        error: 'not_closed',
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
   * Executes the secure action
   */
  execute(context: ActionContext): ISemanticEvent[] {
    const target = context.command.directObject!.entity!;
    const key = context.command.indirectObject?.entity;
    
    // Lock the target (pass key if provided)
    const result = LockableBehavior.lock(target, key);
    
    // The validation should have caught any issues, but let's be safe
    if (!result.success) {
      throw new Error(`Lock failed unexpectedly: ${JSON.stringify(result)}`);
    }
    
    // Emit the secured event with minimal data
    const eventData: SecuredEventData = {
      target: target.id,
      targetName: target.name
    };
    
    if (key) {
      eventData.key = key.id;
      eventData.keyName = key.name;
    }
    
    const events: ISemanticEvent[] = [];
    
    // Add the secured event
    events.push(context.event('if.event.secured', eventData));
    
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