/**
 * Closing action - closes containers and doors
 * 
 * This action delegates to the close sub-action for core functionality,
 * following the sub-actions pattern for better modularity.
 */

import { Action, ActionContext, ValidationResult } from '../../enhanced-types';
import { ISemanticEvent } from '@sharpee/core';
import { IFActions } from '../../constants';
import { ActionMetadata } from '../../../validation';
import { ScopeLevel } from '../../../scope/types';
import { closeSubAction } from './sub-actions/close';

export const closingAction: Action & { metadata: ActionMetadata } = {
  id: IFActions.CLOSING,
  requiredMessages: [
    'no_target',
    'not_closable', 
    'already_closed',
    'closed',
    'cant_reach',
    'prevents_closing'
  ],
  metadata: {
    requiresDirectObject: true,
    requiresIndirectObject: false,
    directObjectScope: ScopeLevel.REACHABLE
  },
  group: 'container_manipulation',
  
  /**
   * Validate whether the close action can be executed
   * Delegates to the close sub-action
   */
  validate(context: ActionContext): ValidationResult {
    return closeSubAction.validate(context);
  },
  
  /**
   * Execute the close action
   * Delegates to the close sub-action
   */
  execute(context: ActionContext): void {
    closeSubAction.execute(context);
  },

  /**
   * Report events after closing
   * Delegates to the close sub-action
   */
  report(context: ActionContext, validationResult?: ValidationResult, executionError?: Error): ISemanticEvent[] {
    return closeSubAction.report!(context, validationResult, executionError);
  }
};