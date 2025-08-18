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

interface AboutState {
  displayMode: string;
}

export const aboutAction: Action & { metadata: ActionMetadata } = {
  id: IFActions.ABOUT,
  
  validate(context: ActionContext): ValidationResult {
    // About action always succeeds
    const displayMode = context.command.parsed.extras?.mode || 'standard';
    
    return {
      valid: true
    };
  },
  
  execute(context: ActionContext): ISemanticEvent[] {
    // Simply emit an event signaling that about info should be displayed
    // The text service will handle querying the story config and formatting
    const displayMode = context.command.parsed.extras?.mode || 'standard';
    const eventData: AboutDisplayedEventData = {
      displayMode
    };
    
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
