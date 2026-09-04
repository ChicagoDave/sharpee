/**
 * Saying-goodbye action (GH #300; publish-readiness P-27): the player ends
 * the live conversation on their own initiative — `goodbye`, `bye`, `say
 * goodbye to Kemp`. The scene closes on the `exit` boundary with the player
 * as leaver, through the registered scene runtime, so a parked thread's
 * authored `on parting` line renders exactly as it does when the NPC walks
 * away or the scene ages out. A greetings block's `on leaving` row is the
 * NPC's own departure and does not fire here.
 *
 * Public interface: sayingGoodbyeAction, sayingGoodbyeLifecycle.
 * Owner context: stdlib / standard actions / social
 */

import { Action, ActionContext, ValidationResult } from '../../enhanced-types.js';
import { type ISemanticEvent } from '@sharpee/core';
import { IFEntity, sceneWith } from '@sharpee/world-model';
import { IFActions } from '../../constants.js';
import { ActionMetadata } from '../../../validation/index.js';
import { ScopeLevel } from '../../../scope/types.js';
import { nounPhraseFor } from '../../../utils/index.js';
import { closeConversationScene } from '../../helpers/dialogue-selector.js';
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

/** The partner being left: the named person, else the other participant of the actor's scene. */
function farewellPartner(ctx: ActionContext): IFEntity | undefined {
  const named = ctx.command.directObject?.entity;
  if (named) return named;
  const scene = sceneWith(ctx.world, ctx.actor.id);
  const partnerId = scene?.participantIds.find((p) => p !== ctx.actor.id);
  return partnerId ? ctx.world.getEntity(partnerId) : undefined;
}

/**
 * Interceptor surface (ADR-228): the conversation partner is the
 * consultable entity of a GOODBYE command.
 */
export const sayingGoodbyeLifecycle: ActionLifecycleDescriptor = {
  actionId: IFActions.SAYING_GOODBYE,
  slots: [
    {
      id: 'target',
      actionIds: [IFActions.SAYING_GOODBYE],
      resolve: (ctx) => farewellPartner(ctx)
    }
  ]
};

export const sayingGoodbyeAction: Action & { metadata: ActionMetadata } = {
  id: IFActions.SAYING_GOODBYE,
  requiredMessages: ['not_talking', 'not_talking_to', 'said_goodbye'],
  group: 'social',
  metadata: {
    requiresDirectObject: false,
    requiresIndirectObject: false,
    directObjectScope: ScopeLevel.AWARE
  },

  validate(context: ActionContext): ValidationResult {
    const scene = sceneWith(context.world, context.actor.id);
    if (!scene) {
      return { valid: false, error: 'not_talking' };
    }
    const named = context.command.directObject?.entity;
    if (named && !scene.participantIds.includes(named.id)) {
      return { valid: false, error: 'not_talking_to', params: { target: nounPhraseFor(named) } };
    }
    const partner = farewellPartner(context);
    if (!partner) {
      return { valid: false, error: 'not_talking' };
    }
    context.sharedData.farewellPartner = partner;
    context.sharedData.farewellSceneId = scene.id;

    const state = resolveLifecycle(context, sayingGoodbyeLifecycle);
    const preVeto = runPreValidate(context, state);
    if (preVeto) return preVeto;
    const postVeto = runPostValidate(context, state);
    if (postVeto) return postVeto;

    return { valid: true };
  },

  execute(context: ActionContext): void {
    // The scene close is a report-phase runtime directive (the arbiter
    // discipline: the runtime mutates, and its wire rides the events).
    const state = getLifecycleState(context);
    if (state) runPostExecute(context, state);
  },

  blocked(context: ActionContext, result: ValidationResult): ISemanticEvent[] {
    const messageId = blockedMessageId(context, result);
    const events: ISemanticEvent[] = [
      context.event('if.event.goodbye_blocked', {
        blocked: true,
        messageId,
        params: result.params ?? {},
        reason: result.error
      })
    ];
    if (result.error) {
      const state = getLifecycleState(context);
      if (state) runOnBlocked(context, state, events, 'if.event.goodbye_blocked', result.error);
    }
    return events;
  },

  report(context: ActionContext): ISemanticEvent[] {
    const partner = context.sharedData.farewellPartner as IFEntity;
    const sceneId = context.sharedData.farewellSceneId as string;

    const events: ISemanticEvent[] = [
      context.event('if.event.said_goodbye', {
        messageId: `${context.action.id}.said_goodbye`,
        params: { target: nounPhraseFor(partner) },
        targetId: partner.id,
        targetName: partner.name,
        actorId: context.actor.id
      }),
      ...closeConversationScene(context, sceneId, context.actor.id)
    ];

    const state = getLifecycleState(context);
    if (state) runPostReport(context, state, events, 'if.event.said_goodbye');
    return events;
  }
};
