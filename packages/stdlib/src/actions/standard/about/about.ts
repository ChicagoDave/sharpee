/**
 * About action - displays information about the game
 * 
 * This is a meta action that signals the text service to display
 * game information. The text service will query the story config
 * directly for the information it needs.
 */

import { Action, ActionContext } from '../../enhanced-types';
import { SemanticEvent } from '@sharpee/core';
import { IFActions } from '../../constants';
import { ActionMetadata } from '../../../validation';
import { AboutDisplayedEventData } from './about-events';

export const aboutAction: Action & { metadata: ActionMetadata } = {
  id: IFActions.ABOUT,
  
  execute(context: ActionContext): SemanticEvent[] {
    // Simply emit an event signaling that about info should be displayed
    // The text service will handle querying the story config and formatting
    const eventData: AboutDisplayedEventData = {
      // Optional: include any command modifiers
      displayMode: context.command.parsed.extras?.mode || 'standard'
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
