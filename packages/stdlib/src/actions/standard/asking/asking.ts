/**
 * Asking action (ADR-230 Phase 6, sketch ruling 4) — minimal interceptable
 * ASK :recipient ABOUT :topic.
 *
 * ASK is a core IF verb players constantly try. This action validates the
 * social preconditions and reports a helpful default ("I don't know
 * anything about that") that per-entity interceptors override — or, for
 * character-modeled NPCs, the world's dialogue selector answers (ADR-310
 * D15). The stdlib layer itself never mutates world state; the character
 * package's selector callback may mutate the NPC's trait (ledger, pressure)
 * in the report path by design (contracts.md §4).
 *
 * Four-phase pattern; interceptor consultation through the shared
 * lifecycle engine (ADR-228) via `askingLifecycle`.
 */

import { Action, ActionContext, ValidationResult } from '../../enhanced-types.js';
import { type ISemanticEvent } from '@sharpee/core';
import { TraitType } from '@sharpee/world-model';
import { IFActions } from '../../constants.js';
import { ActionMetadata } from '../../../validation/index.js';
import { ScopeLevel } from '../../../scope/types.js';
import { nounPhraseFor } from '../../../utils/index.js';
import {
  consultDialogueSelector,
  exchangeGrips,
  isExchangeGripped,
  markExchangeGripped,
  runConversationScene,
  resolveSceneIntrusion
} from '../../helpers/dialogue-selector.js';
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
 * Interceptor surface (ADR-228): the person asked is the only consultable
 * entity of an ASK command.
 */
export const askingLifecycle: ActionLifecycleDescriptor = {
  actionId: IFActions.ASKING,
  slots: [
    {
      id: 'target',
      actionIds: [IFActions.ASKING],
      resolve: (ctx) => ctx.command.directObject?.entity,
      // ADR-239 (approved by David 2026-07-18): the asked topic reaches the
      // target's hooks through sharedData — the ADR-231 D4 first-class
      // topic, mirrored exactly as report() puts it on `if.event.asked`.
      seedData: (ctx) => ({
        topic: ctx.command.topic?.text,
        topicEntityId: ctx.command.topic?.entity
      })
    }
  ]
};

/** The ASK intent for the selection surface (ADR-231 D4's first-class topic). */
function askIntent(context: ActionContext) {
  return {
    type: 'ask' as const,
    text: context.command.topic?.text,
    topicEntityId: context.command.topic?.entity
  };
}

export const askingAction: Action & { metadata: ActionMetadata } = {
  id: IFActions.ASKING,
  requiredMessages: ['no_target', 'not_visible', 'too_far', 'not_actor', 'unknown_topic'],
  group: 'social',
  metadata: {
    requiresDirectObject: true,
    requiresIndirectObject: false,
    directObjectScope: ScopeLevel.AWARE
  },

  validate(context: ActionContext): ValidationResult {
    const target = context.command.directObject?.entity;
    if (!target) {
      return { valid: false, error: 'no_target' };
    }

    const state = resolveLifecycle(context, askingLifecycle);
    const preVeto = runPreValidate(context, state);
    if (preVeto) return preVeto;

    if (!context.canSee(target)) {
      return { valid: false, error: 'not_visible' };
    }
    if (context.world.getLocation(target.id) !== context.world.getLocation(context.player.id)) {
      return { valid: false, error: 'too_far' };
    }
    if (!target.has(TraitType.ACTOR)) {
      return { valid: false, error: 'not_actor', params: { target: nounPhraseFor(target) } };
    }

    // ADR-320 D16: an open exchange claiming this input grips the firing —
    // the innermost active context wins outright, so the interceptor
    // phases (the topic table's dispatch path) are skipped for it and no
    // table bookkeeping runs. The probe is pure; selection happens in report.
    if (exchangeGrips(context, target, askIntent(context))) {
      markExchangeGripped(context);
    } else {
      const postVeto = runPostValidate(context, state);
      if (postVeto) return postVeto;
    }

    return { valid: true };
  },

  execute(context: ActionContext): void {
    // No world mutation — asking is pure conversation surface.
    const state = getLifecycleState(context);
    if (state && !isExchangeGripped(context)) runPostExecute(context, state);
  },

  blocked(context: ActionContext, result: ValidationResult): ISemanticEvent[] {
    const target = context.command.directObject?.entity;
    const messageId = blockedMessageId(context, result);

    const events: ISemanticEvent[] = [
      context.event('if.event.ask_blocked', {
        blocked: true,
        messageId,
        params: { ...result.params, target: target ? nounPhraseFor(target) : undefined },
        reason: result.error,
        targetId: target?.id,
        targetName: target?.name
      })
    ];

    if (result.error) {
      const state = getLifecycleState(context);
      if (state) runOnBlocked(context, state, events, 'if.event.ask_blocked', result.error);
    }
    return events;
  },

  report(context: ActionContext): ISemanticEvent[] {
    const target = context.command.directObject!.entity!;
    // ADR-231 D4: the first-class validated topic — verbatim free text,
    // plus the EntityId when the topic named an in-scope entity (quiet
    // entity-first resolution; interceptors key on topicEntityId).
    const topic = context.command.topic?.text;

    // ADR-320 D10 (Phase 8): addressing an NPC seated in a foreign scene
    // challenges that scene first — `blocks` refuses the consult and the
    // default response stands; `yields`/`protests` close it and the
    // address proceeds.
    const intrusion = resolveSceneIntrusion(context, target);

    // ADR-310 D15: character-modeled NPCs answer through the world's
    // dialogue selector; no selection falls through to the default.
    const selection = intrusion.blocks
      ? undefined
      : consultDialogueSelector(context, target, askIntent(context));

    // ADR-320 D4: the address drives scene lifecycle (open on first
    // contact, move stamp, the selection's directives) — mutations run
    // through the world's registered scene runtime, never here.
    const sceneEvents = intrusion.blocks ? [] : runConversationScene(context, target, selection);

    const events: ISemanticEvent[] = [
      ...intrusion.events,
      context.event('if.event.asked', {
        messageId: selection?.messageId ?? `${context.action.id}.unknown_topic`,
        params: { target: nounPhraseFor(target), topic, ...selection?.params },
        targetId: target.id,
        targetName: target.name,
        topic,
        topicEntityId: context.command.topic?.entity
      }),
      // Author-channel events from the selection (ADR-318 D11) — no
      // message ID, projected by the `character` channel, never prose.
      ...(selection?.authorEvents ?? []),
      ...sceneEvents
    ];

    const state = getLifecycleState(context);
    if (state && !isExchangeGripped(context)) runPostReport(context, state, events, 'if.event.asked');
    return events;
  }
};
