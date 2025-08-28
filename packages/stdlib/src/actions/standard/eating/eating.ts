/**
 * Eating action - consume edible items
 * 
 * This action delegates to the eat sub-action for core functionality,
 * following the sub-actions pattern for better modularity.
 */

import { Action, ActionContext, ValidationResult } from '../../enhanced-types';
import { ISemanticEvent } from '@sharpee/core';
import { IFActions } from '../../constants';
import { ActionMetadata } from '../../../validation';
import { ScopeLevel } from '../../../scope/types';
import { eatSubAction } from './sub-actions/eat';

export const eatingAction: Action & { metadata: ActionMetadata } = {
  id: IFActions.EATING,
  requiredMessages: [
    'no_item',
    'not_visible',
    'not_reachable',
    'not_edible',
    'is_drink',
    'already_consumed',
    'eaten',
    'eaten_all',
    'eaten_some',
    'eaten_portion',
    'delicious',
    'tasty',
    'bland',
    'awful',
    'filling',
    'still_hungry',
    'satisfying',
    'poisonous',
    'nibbled',
    'tasted',
    'devoured',
    'munched'
  ],
  metadata: {
    requiresDirectObject: true,
    requiresIndirectObject: false,
    directObjectScope: ScopeLevel.REACHABLE
  },
  
  /**
   * Validate whether the eat action can be executed
   * Delegates to the eat sub-action
   */
  validate(context: ActionContext): ValidationResult {
    return eatSubAction.validate(context);
  },
  
  /**
   * Execute the eat action
   * Delegates to the eat sub-action
   */
  execute(context: ActionContext): void {
    eatSubAction.execute(context);
  },

  /**
   * Report events after eating
   * Delegates to the eat sub-action
   */
  report(context: ActionContext, validationResult?: ValidationResult, executionError?: Error): ISemanticEvent[] {
    return eatSubAction.report!(context, validationResult, executionError);
  },
  
  group: "interaction"
};