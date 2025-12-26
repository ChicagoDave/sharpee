/**
 * Help action - displays help information
 *
 * This is a meta action that provides gameplay instructions
 * and command information to the player.
 *
 * Updated to support automated help generation from LanguageProvider.
 * The action emits events with the requested help type/action,
 * and the text service retrieves the actual help content.
 *
 * Uses three-phase pattern:
 * 1. validate: Always succeeds (no preconditions)
 * 2. execute: Analyze help request (no world mutations)
 * 3. report: Emit help_displayed event
 */

import { Action, ActionContext, ValidationResult } from '../../enhanced-types';
import { ISemanticEvent } from '@sharpee/core';
import { IFActions } from '../../constants';
import { ActionMetadata } from '../../../validation';
import { HelpDisplayedEventData } from './help-events';

/**
 * Shared data passed between execute and report phases
 */
interface HelpSharedData {
  eventData?: HelpDisplayedEventData;
}

function getHelpSharedData(context: ActionContext): HelpSharedData {
  return context.sharedData as HelpSharedData;
}

interface HelpState {
  topic: string | null;
  eventData: HelpDisplayedEventData;
}

/**
 * Analyzes the help request and builds the event data
 */
function analyzeHelpRequest(context: ActionContext): HelpState {
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
    topic,
    eventData
  };
}

export const helpAction: Action & { metadata: ActionMetadata } = {
  id: IFActions.HELP,
  group: "meta",
  
  metadata: {
    requiresDirectObject: false,
    requiresIndirectObject: false
  },
  
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
    // Help is always valid - no preconditions to check
    return { valid: true };
  },

  execute(context: ActionContext): void {
    // Help has NO world mutations
    // Analyze help request and store in sharedData for report phase
    const state = analyzeHelpRequest(context);
    const sharedData = getHelpSharedData(context);

    sharedData.eventData = state.eventData;
  },

  report(context: ActionContext): ISemanticEvent[] {
    const sharedData = getHelpSharedData(context);

    // Emit the help event with the prepared data
    if (sharedData.eventData) {
      return [context.event('if.event.help_displayed', sharedData.eventData)];
    }

    return [];
  }
};