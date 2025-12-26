/**
 * About action - displays information about the game
 * 
 * This is a meta action that signals the text service to display
 * game information. The text service will query the story config
 * directly for the information it needs.
 */

import { Action, ActionContext, ValidationResult } from '../../enhanced-types';
import { ISemanticEvent } from '@sharpee/core';
import { IFActions } from '../../constants';
import { ActionMetadata } from '../../../validation';
import { AboutDisplayedEventData } from './about-events';
import { handleReportErrors } from '../../base/report-helpers';

export const aboutAction: Action & { metadata: ActionMetadata } = {
  id: IFActions.ABOUT,
  
  validate(context: ActionContext): ValidationResult {
    // About action always succeeds
    return {
      valid: true
    };
  },
  
  execute(context: ActionContext): void {
    // No state mutations needed for this meta action
    // The text service will construct output from story config
  },
  
  report(context: ActionContext, validationResult?: ValidationResult, executionError?: Error): ISemanticEvent[] {
    const errorEvents = handleReportErrors(context, validationResult, executionError);
    if (errorEvents) return errorEvents;

    // Simply emit an event signaling that about info should be displayed
    const eventData: AboutDisplayedEventData = {};
    
    return [
      context.event('if.action.about', eventData)
    ];
  },
  
  group: "meta",
  
  metadata: {
    requiresDirectObject: false,
    requiresIndirectObject: false
  }
};
