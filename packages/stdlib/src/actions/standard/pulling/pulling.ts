/**
 * Pulling action - pull objects that have the PULLABLE trait
 * 
 * This is a minimal action that validates pulling is possible
 * and emits an event. Story authors handle specific pulling logic.
 */

import { Action, ActionContext, ValidationResult } from '../../enhanced-types';
import { ISemanticEvent } from '@sharpee/core';
import { TraitType, PullableTrait } from '@sharpee/world-model';
import { IFActions } from '../../constants';
import { ActionMetadata } from '../../../validation';
import { ScopeLevel } from '../../../scope/types';
import { pullSubAction } from './sub-actions/pull';

export const pullingAction: Action & { metadata: ActionMetadata } = {
  id: IFActions.PULLING,
  group: "interaction",
  
  metadata: {
    requiresDirectObject: true,
    requiresIndirectObject: false,
    directObjectScope: ScopeLevel.REACHABLE
  },
  
  requiredMessages: [
    'no_target',
    'not_visible',
    'not_reachable',
    'cant_pull_that',
    'worn',
    'pulled',
    'nothing_happens',
    'already_pulled'
  ],
  
  validate(context: ActionContext): ValidationResult {
    const target = context.command.directObject?.entity;
    
    // Must have something to pull
    if (!target) {
      return { valid: false, error: 'no_target' };
    }
    
    // Check if object is pullable
    if (!target.has(TraitType.PULLABLE)) {
      return { valid: false, error: 'cant_pull_that', params: { target: target.name } };
    }
    
    // Can't pull worn items
    if (target.has(TraitType.WEARABLE)) {
      const wearable = target.get(TraitType.WEARABLE) as any;
      if (wearable?.isWorn) {
        return { valid: false, error: 'worn', params: { target: target.name } };
      }
    }
    
    // Check state of pullable
    const pullable = target.get(TraitType.PULLABLE) as PullableTrait;
    if (pullable.state === 'pulled' && !pullable.repeatable) {
      return { valid: false, error: 'already_pulled', params: { target: target.name } };
    }
    
    // Delegate additional validation to sub-action
    return pullSubAction.validate(context);
  },
  
  execute(context: ActionContext): void {
    pullSubAction.execute(context);
  },
  
  report(context: ActionContext, validationResult?: ValidationResult, executionError?: Error): ISemanticEvent[] {
    return pullSubAction.report!(context, validationResult, executionError);
  }
};