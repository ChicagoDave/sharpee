/**
 * About action - displays information about the game
 *
 * This is a meta action that signals the text service to display
 * game information. The text service will query the story config
 * directly for the information it needs.
 *
 * Uses four-phase pattern:
 * 1. validate: Always succeeds (no preconditions)
 * 2. execute: No world mutations
 * 3. blocked: Handle validation failures (n/a - always succeeds)
 * 4. report: Emit about event
 */

import { Action, ActionContext, ValidationResult } from '../../enhanced-types';
import { ISemanticEvent } from '@sharpee/core';
import { IFActions } from '../../constants';
import { ActionMetadata } from '../../../validation';
import { AboutDisplayedEventData } from './about-events';

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

  blocked(context: ActionContext, result: ValidationResult): ISemanticEvent[] {
    // About always succeeds, but include blocked for consistency
    return [context.event('action.blocked', {
      actionId: this.id,
      messageId: result.error,
      reason: result.error,
      params: result.params || {}
    })];
  },

  report(context: ActionContext): ISemanticEvent[] {
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
