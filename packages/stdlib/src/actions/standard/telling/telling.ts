/**
 * Telling action (ADR-230 Phase 6, sketch ruling 4) — minimal interceptable
 * TELL :recipient ABOUT :topic.
 *
 * TELL is a core IF verb players constantly try, but there is no platform
 * conversation system yet: this action validates the social preconditions
 * and reports a helpful default ("X doesn't seem interested") that
 * per-entity interceptors (or a future conversation extension) override.
 * No world mutation, ever.
 *
 * Four-phase pattern; interceptor consultation through the shared
 * lifecycle engine (ADR-228) via `tellingLifecycle`.
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
 * Interceptor surface (ADR-228): the person told is the only consultable
 * entity of a TELL command.
 */
export const tellingLifecycle: ActionLifecycleDescriptor = {
  actionId: IFActions.TELLING,
  slots: [
    {
      id: 'target',
      actionIds: [IFActions.TELLING],
      resolve: (ctx) => ctx.command.directObject?.entity
    }
  ]
};

export const tellingAction: Action & { metadata: ActionMetadata } = {
  id: IFActions.TELLING,
  requiredMessages: ['no_target', 'not_visible', 'too_far', 'not_actor', 'not_interested'],
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

    const state = resolveLifecycle(context, tellingLifecycle);
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
      context.event('if.event.tell_blocked', {
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
      if (state) runOnBlocked(context, state, events, 'if.event.tell_blocked', result.error);
    }
    return events;
  },

  report(context: ActionContext): ISemanticEvent[] {
    const target = context.command.directObject!.entity!;
    // ADR-231 D4: the first-class validated topic — verbatim free text,
    // plus the EntityId when the topic named an in-scope entity (quiet
    // entity-first resolution; interceptors key on topicEntityId).
    const topic = context.command.topic?.text;

    const events: ISemanticEvent[] = [
      context.event('if.event.told', {
        messageId: `${context.action.id}.not_interested`,
        params: { target: nounPhraseFor(target), topic },
        targetId: target.id,
        targetName: target.name,
        topic,
        topicEntityId: context.command.topic?.entity
      })
    ];

    const state = getLifecycleState(context);
    if (state) runPostReport(context, state, events, 'if.event.told');
    return events;
  }
};
