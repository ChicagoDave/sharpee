/**
 * Version action - displays version information about the game and engine
 *
 * This is a meta action that emits version information for display.
 * The text service will render the version info based on story config
 * and engine version data.
 *
 * Uses four-phase pattern:
 * 1. validate: Always succeeds (no preconditions)
 * 2. execute: No world mutations
 * 3. blocked: Handle validation failures (n/a - always succeeds)
 * 4. report: Emit version event with version data
 */

import { Action, ActionContext, ValidationResult } from '../../enhanced-types';
import { ISemanticEvent } from '@sharpee/core';
import { IFActions } from '../../constants';
import { ActionMetadata } from '../../../validation';
import { VersionDisplayedEventData } from './version-events';

/** Engine version - update this when engine version changes */
export const ENGINE_VERSION = '0.9.43-beta.1';

export const versionAction: Action & { metadata: ActionMetadata } = {
  id: IFActions.VERSION,

  validate(context: ActionContext): ValidationResult {
    // Version action always succeeds
    return {
      valid: true
    };
  },

  execute(context: ActionContext): void {
    // No state mutations needed for this meta action
  },

  blocked(context: ActionContext, result: ValidationResult): ISemanticEvent[] {
    // Version always succeeds, but include blocked for consistency
    return [context.event('action.blocked', {
      actionId: this.id,
      messageId: result.error,
      reason: result.error,
      params: result.params || {}
    })];
  },

  report(context: ActionContext): ISemanticEvent[] {
    // Get version info from world/story config
    const world = context.world;
    const storyConfig = (world as any).storyConfig || {};
    const versionInfo = (world as any).versionInfo || {};

    const storyTitle = storyConfig.title || 'Unknown';
    const storyVersion = versionInfo.version || storyConfig.version || '0.0.0';
    const engineVersion = versionInfo.engineVersion || ENGINE_VERSION;
    const buildDate = versionInfo.buildDate;

    // Construct the version message
    let message = `${storyTitle} v${storyVersion}\nSharpee Engine v${engineVersion}`;
    if (buildDate) {
      message += `\nBuilt: ${buildDate}`;
    }

    const eventData: VersionDisplayedEventData = {
      storyTitle,
      storyVersion,
      engineVersion,
      buildDate,
      message // Include pre-formatted message for text service
    };

    return [
      context.event('if.action.version', eventData)
    ];
  },

  group: "meta",

  metadata: {
    requiresDirectObject: false,
    requiresIndirectObject: false
  }
};
