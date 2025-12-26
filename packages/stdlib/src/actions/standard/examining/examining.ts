/**
 * Examining action - looks at objects in detail
 * 
 * This is a read-only action that provides detailed information about objects.
 * It validates visibility but doesn't change state.
 * 
 * Uses three-phase pattern:
 * 1. validate: Check target exists and is visible
 * 2. execute: No mutations (read-only action)
 * 3. report: Generate events with complete entity snapshot
 */

import { Action, ActionContext, ValidationResult } from '../../enhanced-types';
import { ISemanticEvent } from '@sharpee/core';
import { IFActions } from '../../constants';
import { ActionMetadata } from '../../../validation';
import { ScopeLevel } from '../../../scope/types';
import { captureEntitySnapshot } from '../../base/snapshot-utils';
import { handleReportErrors } from '../../base/report-helpers';
import { buildEventData } from '../../data-builder-types';

// Import our data builder
import { examiningDataConfig, buildExaminingMessageParams } from './examining-data';

export const examiningAction: Action & { metadata: ActionMetadata } = {
  id: IFActions.EXAMINING,
  requiredMessages: [
    'no_target',
    'not_visible',
    'examined',
    'examined_self',
    'examined_container',
    'examined_supporter',
    'examined_readable',
    'examined_switchable',
    'examined_wearable',
    'examined_door',
    'nothing_special',
    'description',
    'brief_description'
  ],
  
  validate(context: ActionContext): ValidationResult {
    const actor = context.player;
    const noun = context.command.directObject?.entity;
    
    // Validate we have a target
    if (!noun) {
      return {
        valid: false,
        error: 'no_target',
        params: {}
      };
    }
    
    // Check if visible (unless examining yourself)
    if (noun.id !== actor.id && !context.canSee(noun)) {
      return {
        valid: false,
        error: 'not_visible',
        params: { target: noun.name }
      };
    }
    
    // Valid - all event data will be built in report()
    return { 
      valid: true
    };
  },
  
  execute(context: ActionContext): void {
    // No mutations - examining is a read-only action
  },
  
  report(context: ActionContext, validationResult?: ValidationResult, executionError?: Error): ISemanticEvent[] {
    // Handle validation and execution errors using shared helper
    const errorEvents = handleReportErrors(context, validationResult, executionError);
    if (errorEvents) return errorEvents;

    const noun = context.command.directObject?.entity;
    
    if (!noun) {
      // This shouldn't happen if validation passed, but handle it
      return [
        context.event('action.error', {
          actionId: context.action.id,
          error: 'no_target',
          messageId: 'no_target',
          params: {}
        })
      ];
    }
    
    // Use data builder to create event data
    const eventData = buildEventData(examiningDataConfig, context);
    
    // Get message parameters from the data
    const { messageId, params } = buildExaminingMessageParams(eventData, noun);
    
    // Return both the domain event and success message
    return [
      context.event('if.event.examined', eventData),
      context.event('action.success', {
        actionId: context.action.id,
        messageId: messageId,
        params: params
      })
    ];
  },
  
  group: "observation",
  
  metadata: {
    requiresDirectObject: true,
    requiresIndirectObject: false,
    directObjectScope: ScopeLevel.VISIBLE
  }
};
