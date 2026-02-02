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
    return [context.event('if.event.about_displayed', {
      messageId: `if.action.about.${result.error}`,
      params: result.params || {},
      blocked: true,
      reason: result.error
    })];
  },

  report(context: ActionContext): ISemanticEvent[] {
    // Get story info from StoryInfoTrait (or fall back to legacy (world as any))
    const world = context.world;
    const storyInfoEntities = world.findByTrait('storyInfo' as any);
    const trait = storyInfoEntities[0]?.get<any>('storyInfo');
    const storyConfig = trait || (world as any).storyConfig || {};

    const eventData: AboutDisplayedEventData = {
      messageId: 'if.action.about.success',
      params: {
        title: storyConfig.title || 'Unknown',
        author: Array.isArray(storyConfig.author) ? storyConfig.author.join(', ') : (storyConfig.author || 'Unknown'),
        version: storyConfig.version || '0.0.0',
        description: storyConfig.description || '',
        engineVersion: storyConfig.engineVersion || '',
        buildDate: storyConfig.buildDate || '',
        clientVersion: storyConfig.clientVersion || '',
        portedBy: storyConfig.portedBy || ''
      }
    };

    return [
      context.event('if.event.about_displayed', eventData)
    ];
  },
  
  group: "meta",
  
  metadata: {
    requiresDirectObject: false,
    requiresIndirectObject: false
  }
};
