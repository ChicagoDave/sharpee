/**
 * Drinking action - consume drinkable items
 * 
 * This action delegates to the drink sub-action for core functionality,
 * following the sub-actions pattern for better modularity.
 */

import { Action, ActionContext, ValidationResult } from '../../enhanced-types';
import { ISemanticEvent } from '@sharpee/core';
import { IFActions } from '../../constants';
import { ActionMetadata } from '../../../validation';
import { ScopeLevel } from '../../../scope/types';
import { drinkSubAction } from './sub-actions/drink';

export const drinkingAction: Action & { metadata: ActionMetadata } = {
  id: IFActions.DRINKING,
  group: "interaction",
  
  metadata: {
    requiresDirectObject: true,
    requiresIndirectObject: false,
    directObjectScope: ScopeLevel.REACHABLE
  },
  
  requiredMessages: [
    'no_item',
    'not_visible',
    'not_reachable',
    'not_drinkable',
    'already_consumed',
    'container_closed',
    'drunk',
    'drunk_all',
    'drunk_some',
    'drunk_from',
    'refreshing',
    'satisfying',
    'bitter',
    'sweet',
    'strong',
    'thirst_quenched',
    'still_thirsty',
    'magical_effects',
    'healing',
    'from_container',
    'empty_now',
    'some_remains',
    'sipped',
    'quaffed',
    'gulped'
  ],
  
  /**
   * Validate whether the drink action can be executed
   * Delegates to the drink sub-action
   */
  validate(context: ActionContext): ValidationResult {
    return drinkSubAction.validate(context);
  },
  
  /**
   * Execute the drink action
   * Delegates to the drink sub-action
   */
  execute(context: ActionContext): void {
    drinkSubAction.execute(context);
  },

  /**
   * Report events after drinking
   * Delegates to the drink sub-action
   */
  report(context: ActionContext, validationResult?: ValidationResult, executionError?: Error): ISemanticEvent[] {
    return drinkSubAction.report!(context, validationResult, executionError);
  }
};