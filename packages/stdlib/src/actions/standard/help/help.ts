/**
 * Help action - displays help information
 * 
 * This is a meta action that provides gameplay instructions
 * and command information to the player.
 * 
 * Updated to support automated help generation from LanguageProvider.
 * The action emits events with the requested help type/action,
 * and the text service retrieves the actual help content.
 */

import { Action, ActionContext, ValidationResult } from '../../enhanced-types';
import { ISemanticEvent } from '@sharpee/core';
import { IFActions } from '../../constants';
import { ActionMetadata } from '../../../validation';
import { HelpDisplayedEventData } from './help-events';

interface HelpState {
  topic: string | null;
  eventData: HelpDisplayedEventData;
}

export const helpAction: Action & { metadata: ActionMetadata } = {
  id: IFActions.HELP,
  requiredMessages: [
    'general_help',
    'help_topic',
    'unknown_topic',
    'help_movement',
    'help_objects',
    'help_special',
    'first_time_help',
    'hints_available',
    'hints_disabled',
    'stuck_help',
    'help_footer'
  ],
  
  validate(context: ActionContext): ValidationResult {
    const eventData: HelpDisplayedEventData = {};
    
    // Check if the user asked for help on a specific topic
    const topic = context.command.parsed.extras?.topic || 
                  context.command.indirectObject?.parsed.text ||
                  context.command.directObject?.parsed.text ||
                  null;
    
    if (topic) {
      eventData.specificHelp = true;
      eventData.helpRequest = topic; // What the user asked for help about
    } else {
      // General help (no topic specified)
      eventData.generalHelp = true;
      eventData.helpType = 'general';
      
      // Check if this is the first time help was requested
      const sharedData = (context.world as any).getSharedData?.() || {};
      const helpRequested = sharedData.helpRequested || false;
      
      if (!helpRequested) {
        eventData.firstTime = true;
      }
      
      // Include game-specific help sections
      const helpSections = sharedData.helpSections || [
        'basic_commands',
        'movement',
        'objects',
        'special_commands'
      ];
      eventData.sections = helpSections;
      
      // Include hints availability
      const hintsEnabled = sharedData.hintsEnabled ?? true;
      eventData.hintsAvailable = hintsEnabled;
    }
    
    return {
      valid: true
    };
  },
  
  execute(context: ActionContext): ISemanticEvent[] {
    const eventData: HelpDisplayedEventData = {};
    
    // Check if the user asked for help on a specific topic
    const topic = context.command.parsed.extras?.topic || 
                  context.command.indirectObject?.parsed.text ||
                  context.command.directObject?.parsed.text ||
                  null;
    
    if (topic) {
      eventData.specificHelp = true;
      eventData.helpRequest = topic; // What the user asked for help about
    } else {
      // General help (no topic specified)
      eventData.generalHelp = true;
      eventData.helpType = 'general';
      
      // Check if this is the first time help was requested
      const sharedData = (context.world as any).getSharedData?.() || {};
      const helpRequested = sharedData.helpRequested || false;
      
      if (!helpRequested) {
        eventData.firstTime = true;
      }
      
      // Include game-specific help sections
      const helpSections = sharedData.helpSections || [
        'basic_commands',
        'movement',
        'objects',
        'special_commands'
      ];
      eventData.sections = helpSections;
      
      // Include hints availability
      const hintsEnabled = sharedData.hintsEnabled ?? true;
      eventData.hintsAvailable = hintsEnabled;
    }
    
    return [context.event('if.event.help_displayed', eventData)];
  },
  
  group: "meta",
  
  metadata: {
    requiresDirectObject: false,
    requiresIndirectObject: false
  }
};
