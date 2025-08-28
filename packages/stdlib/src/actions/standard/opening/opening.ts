/**
 * Opening action - opens containers and doors
 * 
 * This action delegates to the open sub-action for core functionality,
 * following the sub-actions pattern for better modularity.
 */

import { Action, ActionContext, ValidationResult } from '../../enhanced-types';
import { ISemanticEvent } from '@sharpee/core';
import { IFActions } from '../../constants';
import { ActionMetadata } from '../../../validation';
import { ScopeLevel } from '../../../scope/types';
import { openSubAction } from './sub-actions/open';

export const openingAction: Action & { metadata: ActionMetadata } = {
  id: IFActions.OPENING,
  requiredMessages: [
    'no_target',
    'not_openable',
    'already_open',
    'locked',
    'opened',
    'revealing',
    'its_empty',
    'cant_reach'
  ],
  metadata: {
    requiresDirectObject: true,
    requiresIndirectObject: false,
    directObjectScope: ScopeLevel.REACHABLE
  },
  group: 'container_manipulation',
  
  /**
   * Validate whether the open action can be executed
   * Delegates to the open sub-action
   */
  validate(context: ActionContext): ValidationResult {
    return openSubAction.validate(context);
  },
  
  /**
   * Execute the open action
   * Delegates to the open sub-action
   */
  execute(context: ActionContext): void {
    openSubAction.execute(context);
  },

  /**
   * Report events after opening
   * Delegates to the open sub-action
   */
  report(context: ActionContext, validationResult?: ValidationResult, executionError?: Error): ISemanticEvent[] {
    return openSubAction.report!(context, validationResult, executionError);
  }
};