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

import { Action, ActionContext, ValidationResult } from '../../enhanced-types.js';
import { blockedMessageId } from '../../lifecycle/index.js';
import { ISemanticEvent } from '@sharpee/core';
import { TraitType, StoryInfoTrait } from '@sharpee/world-model';
import { IFActions } from '../../constants.js';
import { ActionMetadata } from '../../../validation/index.js';
import { VersionDisplayedEventData } from './version-events.js';
// Stamped by ./repokit build (never hand-edited): the lockstep platform
// version — the banner fallback when a story carries no engineVersion
// (every Chord .story file). Re-exported for existing consumers.
import { ENGINE_VERSION } from './engine-version.js';

export { ENGINE_VERSION };

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
    return [context.event('if.event.version_displayed', {
      messageId: blockedMessageId(context, result),
      params: result.params || {},
      blocked: true,
      reason: result.error
    })];
  },

  report(context: ActionContext): ISemanticEvent[] {
    const world = context.world;
    const storyInfoEntities = world.findByTrait(TraitType.STORY_INFO);
    const trait = storyInfoEntities[0]?.getTrait(StoryInfoTrait);

    const storyTitle = trait?.title || 'Unknown';
    const storyVersion = trait?.version || '0.0.0';
    const engineVersion = trait?.engineVersion || ENGINE_VERSION;
    const clientVersion = trait?.clientVersion || 'N/A';
    const buildDate = trait?.buildDate;
    const author = trait?.author || 'Unknown';

    // Determine messageId based on available data
    // Use existing lang-en-us keys: version_full, version_no_date
    const messageId = buildDate
      ? 'if.action.version.version_full'
      : 'if.action.version.version_no_date';

    // Event data with messageId for text-service lookup
    const eventData: VersionDisplayedEventData = {
      messageId,
      params: {
        storyTitle,
        storyVersion,
        engineVersion,
        clientVersion,
        buildDate,
        title: storyTitle,
        version: storyVersion,
        author: Array.isArray(author) ? author.join(', ') : author
      },
      // Domain data for event handlers
      storyTitle,
      storyVersion,
      engineVersion,
      clientVersion,
      buildDate
    };

    return [
      context.event('if.event.version_displayed', eventData)
    ];
  },

  group: "meta",

  metadata: {
    requiresDirectObject: false,
    requiresIndirectObject: false
  }
};
