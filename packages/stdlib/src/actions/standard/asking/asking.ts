/**
 * Asking action (ADR-230 Phase 6, sketch ruling 4) — minimal interceptable
 * ASK :recipient ABOUT :topic.
 *
 * ASK is a core IF verb players constantly try, but there is no platform
 * conversation system yet: this action validates the social preconditions
 * and reports a helpful default ("I don't know anything about that") that
 * per-entity interceptors (or a future conversation extension) override.
 * No world mutation, ever.
 *
 * Four-phase pattern; interceptor consultation through the shared
 * lifecycle engine (ADR-228) via `askingLifecycle`.
 */

import { Action, ActionContext, ValidationResult } from '../../enhanced-types';
import { ISemanticEvent } from '@sharpee/core';
import { TraitType } from '@sharpee/world-model';
import { IFActions } from '../../constants';
import { ActionMetadata } from '../../../validation';
import { ScopeLevel } from '../../../scope/types';
import { nounPhraseFor } from '../../../utils';
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
} from '../../lifecycle';

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
      resolve: (ctx) => ctx.command.directObject?.entity
    }
  ]
};

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

    const postVeto = runPostValidate(context, state);
    if (postVeto) return postVeto;

    return { valid: true };
  },

  execute(context: ActionContext): void {
    // No world mutation — asking is pure conversation surface.
    const state = getLifecycleState(context);
    if (state) runPostExecute(context, state);
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
    const topic = context.command.indirectObject?.parsed?.text ??
      (context.command.parsed?.structure as { extras?: { topic?: string } } | undefined)?.extras?.topic;

    const events: ISemanticEvent[] = [
      context.event('if.event.asked', {
        messageId: `${context.action.id}.unknown_topic`,
        params: { target: nounPhraseFor(target), topic },
        targetId: target.id,
        targetName: target.name,
        topic
      })
    ];

    const state = getLifecycleState(context);
    if (state) runPostReport(context, state, events, 'if.event.asked');
    return events;
  }
};
