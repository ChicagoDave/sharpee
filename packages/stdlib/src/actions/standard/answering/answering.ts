/**
 * Answering action (GH #346; publish-readiness P-26): answers the open
 * exchange in the player's live conversation scene — `answer yes`, `say
 * aye`, `reply norwich`. The questioner is resolved from the scene (an
 * exchange targets the player, so at most one is open for them) and the
 * response — the command's free-text topic slot — is offered to the
 * exchange's answer rows through the world's dialogue selector, exactly as
 * `ask <questioner> about <word>` is. Bare answers (`yes`) arrive here via
 * the engine's exchange offer; outside an open exchange the action refuses.
 *
 * Public interface: answeringAction, answeringLifecycle.
 * Owner context: stdlib / standard actions / social
 */

import { Action, ActionContext, ValidationResult } from '../../enhanced-types.js';
import { type ISemanticEvent } from '@sharpee/core';
import { IFEntity } from '@sharpee/world-model';
import { IFActions } from '../../constants.js';
import { ActionMetadata } from '../../../validation/index.js';
import { nounPhraseFor } from '../../../utils/index.js';
import {
  consultDialogueSelector,
  exchangeGrips,
  isExchangeGripped,
  markExchangeGripped,
  resolveOpenExchangeSpeaker,
  runConversationScene
} from '../../helpers/dialogue-selector.js';
import {
  ActionLifecycleDescriptor,
  resolveLifecycle,
  getLifecycleState,
  runPreValidate,
  runPostExecute,
  runPostReport,
  runOnBlocked,
  blockedMessageId
} from '../../lifecycle/index.js';

/**
 * Interceptor surface (ADR-228): the questioner is the consultable entity
 * of an ANSWER command; the response reaches its hooks through sharedData
 * exactly as asking's topic does.
 */
export const answeringLifecycle: ActionLifecycleDescriptor = {
  actionId: IFActions.ANSWERING,
  slots: [
    {
      id: 'target',
      actionIds: [IFActions.ANSWERING],
      resolve: (ctx) => resolveOpenExchangeSpeaker(ctx),
      seedData: (ctx) => ({
        response: ctx.command.topic?.text,
        topicEntityId: ctx.command.topic?.entity
      })
    }
  ]
};

/** The answer as a conversation intent — a `say` carrying the response text. */
function answerIntent(context: ActionContext) {
  return {
    type: 'say' as const,
    text: context.command.topic?.text,
    topicEntityId: context.command.topic?.entity
  };
}

export const answeringAction: Action & { metadata: ActionMetadata } = {
  id: IFActions.ANSWERING,
  requiredMessages: ['no_question', 'no_response', 'not_an_answer', 'answered'],
  group: 'social',
  metadata: {
    requiresDirectObject: false,
    requiresIndirectObject: false
  },

  validate(context: ActionContext): ValidationResult {
    const speaker = resolveOpenExchangeSpeaker(context);
    if (!speaker) {
      return { valid: false, error: 'no_question' };
    }
    context.sharedData.answeringSpeaker = speaker;

    const state = resolveLifecycle(context, answeringLifecycle);
    const preVeto = runPreValidate(context, state);
    if (preVeto) return preVeto;

    if (!context.command.topic?.text) {
      return { valid: false, error: 'no_response' };
    }

    // ADR-320 D16: the open exchange claiming the response grips the
    // firing — the innermost active context wins outright. A response it
    // does not claim is refused here rather than falling into the topic
    // table: the question is still standing.
    if (!exchangeGrips(context, speaker, answerIntent(context))) {
      return {
        valid: false,
        error: 'not_an_answer',
        params: { target: nounPhraseFor(speaker), response: context.command.topic.text }
      };
    }
    markExchangeGripped(context);
    return { valid: true };
  },

  execute(context: ActionContext): void {
    // No world mutation — answering is pure conversation surface.
    const state = getLifecycleState(context);
    if (state && !isExchangeGripped(context)) runPostExecute(context, state);
  },

  blocked(context: ActionContext, result: ValidationResult): ISemanticEvent[] {
    const speaker = context.sharedData.answeringSpeaker as IFEntity | undefined;
    const messageId = blockedMessageId(context, result);

    const events: ISemanticEvent[] = [
      context.event('if.event.answer_blocked', {
        blocked: true,
        messageId,
        params: { ...result.params, target: speaker ? nounPhraseFor(speaker) : undefined },
        reason: result.error,
        targetId: speaker?.id,
        targetName: speaker?.name
      })
    ];

    if (result.error) {
      const state = getLifecycleState(context);
      if (state) runOnBlocked(context, state, events, 'if.event.answer_blocked', result.error);
    }
    return events;
  },

  report(context: ActionContext): ISemanticEvent[] {
    const speaker = context.sharedData.answeringSpeaker as IFEntity;
    const response = context.command.topic?.text;

    // ADR-310 D15: the exchange answers through the world's dialogue
    // selector; the scene lifecycle (move stamp, the selection's
    // directives) runs through the registered scene runtime, never here.
    const selection = consultDialogueSelector(context, speaker, answerIntent(context));
    const sceneEvents = runConversationScene(context, speaker, selection);

    const events: ISemanticEvent[] = [
      context.event('if.event.answered', {
        messageId: selection?.messageId ?? `${context.action.id}.answered`,
        params: { target: nounPhraseFor(speaker), response, ...selection?.params },
        targetId: speaker.id,
        targetName: speaker.name,
        response,
        topicEntityId: context.command.topic?.entity
      }),
      // Author-channel events from the selection (ADR-318 D11).
      ...(selection?.authorEvents ?? []),
      ...sceneEvents
    ];

    const state = getLifecycleState(context);
    if (state && !isExchangeGripped(context)) runPostReport(context, state, events, 'if.event.answered');
    return events;
  }
};
