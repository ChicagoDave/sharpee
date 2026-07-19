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

import { Action, ActionContext, ValidationResult } from '../../enhanced-types.js';
import { ISemanticEvent } from '@sharpee/core';
import { IFActions } from '../../constants.js';
import { ActionMetadata } from '../../../validation/index.js';
import { ScopeLevel } from '../../../scope/types.js';
import { captureEntitySnapshot } from '../../base/snapshot-utils.js';
import { emitIllustrations } from '../../helpers/emit-illustrations.js';
import { buildEventData } from '../../data-builder-types.js';
import { getStateClauses } from '@sharpee/world-model';
import {
  ActionLifecycleDescriptor,
  resolveLifecycle,
  getLifecycleState,
  runPreValidate,
  runPostValidate,
  runPostExecute,
  runPostReport,
  runOnBlocked,
  blockedMessageId
} from '../../lifecycle/index.js';

/**
 * Interceptor surface (ADR-228): the examined target is the only
 * consultable entity of an EXAMINE command.
 */
export const examiningLifecycle: ActionLifecycleDescriptor = {
  actionId: IFActions.EXAMINING,
  slots: [
    {
      id: 'target',
      actionIds: [IFActions.EXAMINING],
      resolve: (ctx) => ctx.command.directObject?.entity
    }
  ]
};

// Import our data builder
import { examiningDataConfig, buildExaminingMessageParams } from './examining-data.js';
import { ExaminingMessages } from './examining-messages.js';
import { nounPhraseFor } from '../../../utils/index.js';

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
    'examined_wall',
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

    const state = resolveLifecycle(context, examiningLifecycle);
    const preVeto = runPreValidate(context, state);
    if (preVeto) return preVeto;

    // Check scope - must be able to see the target (unless examining yourself)
    if (noun.id !== actor.id) {
      const scopeCheck = context.requireScope(noun, ScopeLevel.VISIBLE);
      if (!scopeCheck.ok) {
        return scopeCheck.error!;
      }
    }

    // Canonical placement (ADR-228): postValidate runs after ALL standard validation
    const postVeto = runPostValidate(context, state);
    if (postVeto) return postVeto;

    // Valid - all event data will be built in report()
    return { valid: true };
  },

  execute(context: ActionContext): void {
    // No standard mutations - examining is a read-only action.
    // Interceptor postExecute hooks may still mutate (ADR-228).
    const state = getLifecycleState(context);
    if (state) runPostExecute(context, state);
  },
  
  report(context: ActionContext): ISemanticEvent[] {
    // report() is only called on success - validation passed
    const noun = context.command.directObject!.entity!;

    // Use data builder to create event data
    const eventData = buildEventData(examiningDataConfig, context);

    // Get message parameters from the data
    const { messageId, params, contentsMessage } = buildExaminingMessageParams(eventData, noun);

    // ADR-195 S2: collect state-derived detail clauses from the examined object's
    // traits (the `state-clauses` registry) and stage them into this message's
    // `{slot:detail}` channel. The slot (clause mode) owns the connective grammar;
    // each clause is bare content. Plain phrase data, so it survives save/replay.
    const detailClauses = getStateClauses(noun);
    if (detailClauses.length > 0) {
      (params as Record<string, unknown>).__slots__ = {
        detail: detailClauses.map((text) => ({ kind: 'literal', text })),
      };
    }

    // Build events array - emit domain event with messageId for text rendering
    const examinedEvent = context.event('if.event.examined', {
      messageId: `${context.action.id}.${messageId}`,
      params,
      ...eventData
    });
    const events: ISemanticEvent[] = [examinedEvent];

    // Emit illustration events for the examined entity (ADR-124)
    events.push(...emitIllustrations(noun, 'on-examine', examinedEvent.id, context));

    // Add contents message for containers/supporters with visible items
    if (contentsMessage) {
      events.push(context.event('if.event.examined', {
        messageId: `${context.action.id}.${contentsMessage.messageId}`,
        params: contentsMessage.params,
        isContentsMessage: true
      }));
    }

    const state = getLifecycleState(context);
    if (state) runPostReport(context, state, events, 'if.event.examined');

    return events;
  },

  blocked(context: ActionContext, result: ValidationResult): ISemanticEvent[] {
    // blocked() is called when validation fails
    const noun = context.command.directObject?.entity;

    const events: ISemanticEvent[] = [context.event('if.event.examined', {
      blocked: true,
      messageId: blockedMessageId(context, result),
      // params carry EntityInfo for the formatter chain (ADR-158);
      // top-level fields stay strings for handlers.
      params: { target: noun ? nounPhraseFor(noun) : undefined, ...result.params },
      reason: result.error,
      targetId: noun?.id,
      targetName: noun?.name
    })];

    if (result.error) {
      const state = getLifecycleState(context);
      if (state) runOnBlocked(context, state, events, 'if.event.examined', result.error);
    }

    return events;
  },

  group: "observation",
  
  metadata: {
    requiresDirectObject: true,
    requiresIndirectObject: false,
    directObjectScope: ScopeLevel.VISIBLE
  }
};
