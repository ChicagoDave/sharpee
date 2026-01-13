/**
 * Examining action - looks at objects in detail
 *
 * This is a read-only action that provides detailed information about objects.
 * It validates visibility but doesn't change state.
 *
 * Uses four-phase pattern:
 * 1. validate: Check target exists and is visible
 * 2. execute: No mutations (read-only action)
 * 3. report: Generate success events with complete entity snapshot
 * 4. blocked: Generate error events when validation fails
 */

import { Action, ActionContext, ValidationResult } from '../../enhanced-types';
import { ISemanticEvent } from '@sharpee/core';
import { IFActions } from '../../constants';
import { ActionMetadata } from '../../../validation';
import { ScopeLevel } from '../../../scope/types';
import { captureEntitySnapshot } from '../../base/snapshot-utils';
import { buildEventData } from '../../data-builder-types';

// Import our data builder
import { examiningDataConfig, buildExaminingMessageParams } from './examining-data';
import { ExaminingMessages } from './examining-messages';

export const examiningAction: Action & { metadata: ActionMetadata } = {
  id: IFActions.EXAMINING,

  // Default scope requirements for this action's slots
  defaultScope: {
    target: ScopeLevel.VISIBLE
  },

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
        error: ExaminingMessages.NO_TARGET
      };
    }

    // Check scope - must be able to see the target (unless examining yourself)
    if (noun.id !== actor.id) {
      const scopeCheck = context.requireScope(noun, ScopeLevel.VISIBLE);
      if (!scopeCheck.ok) {
        return scopeCheck.error!;
      }
    }

    // Valid - all event data will be built in report()
    return { valid: true };
  },
  
  execute(context: ActionContext): void {
    // No mutations - examining is a read-only action
  },
  
  report(context: ActionContext): ISemanticEvent[] {
    // report() is only called on success - validation passed
    const noun = context.command.directObject!.entity!;

    // Use data builder to create event data
    const eventData = buildEventData(examiningDataConfig, context);

    // Get message parameters from the data
    const { messageId, params, contentsMessage } = buildExaminingMessageParams(eventData, noun);

    // Build events array
    const events: ISemanticEvent[] = [
      context.event('if.event.examined', eventData),
      context.event('action.success', {
        actionId: context.action.id,
        messageId: messageId,
        params: params
      })
    ];

    // Add contents message for containers/supporters with visible items
    if (contentsMessage) {
      events.push(context.event('action.success', {
        actionId: context.action.id,
        messageId: contentsMessage.messageId,
        params: contentsMessage.params
      }));
    }

    return events;
  },

  blocked(context: ActionContext, result: ValidationResult): ISemanticEvent[] {
    // blocked() is called when validation fails
    const noun = context.command.directObject?.entity;

    return [context.event('action.blocked', {
      actionId: context.action.id,
      messageId: result.error,
      params: {
        ...result.params,
        target: noun?.name
      }
    })];
  },

  group: "observation",
  
  metadata: {
    requiresDirectObject: true,
    requiresIndirectObject: false,
    directObjectScope: ScopeLevel.VISIBLE
  }
};
