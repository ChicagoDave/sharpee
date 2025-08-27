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
import { PulledEventData } from './pulling-events';
import { ActionMetadata } from '../../../validation';
import { ScopeLevel } from '../../../scope/types';

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
    if (pullable.state === 'pulled') {
      return { valid: false, error: 'already_pulled', params: { target: target.name } };
    }
    
    return { valid: true };
  },
  
  execute(context: ActionContext): ISemanticEvent[] {
    const target = context.command.directObject!.entity!;
    const pullable = target.get(TraitType.PULLABLE) as PullableTrait;
    
    // Build event data
    const eventData: PulledEventData = {
      target: target.id,
      targetName: target.name,
      pullCount: pullable.pullCount || 0,
      pullType: pullable.pullType
    };
    
    const events: ISemanticEvent[] = [];
    
    // Update the state
    pullable.state = 'pulled';
    pullable.pullCount = (pullable.pullCount || 0) + 1;
    
    // Emit the pulled event for story handlers
    events.push(context.event('if.event.pulled', eventData));
    
    // Simple success message
    events.push(context.event('action.success', {
      actionId: this.id,
      messageId: 'pulled',
      params: { target: target.name }
    }));
    
    return events;
  }
};