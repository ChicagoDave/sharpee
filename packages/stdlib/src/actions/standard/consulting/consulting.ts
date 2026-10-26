/**
 * Consulting action — looking a topic up in a readable thing (ADR-372 D4).
 *
 * `consult <source> about <topic>` (and `look up <topic> in <source>`)
 * validates that the source is present and readable, mutates nothing, and
 * reports one `if.event.consulted` whose stock line says nothing was found.
 * A story answers from the source's topic table — a Chord `define topics`
 * on a readable thing, matched exactly as a person's table is for `ask` —
 * or from an `on the player consulting` clause on the source; either speaks
 * in the stock line's place.
 *
 * Uses four-phase pattern:
 * 1. validate: a source and a topic are present; the source is readable
 * 2. execute: no world mutations
 * 3. blocked: a refusal or a story's veto
 * 4. report: emits if.event.consulted with the stock line
 *
 * Interceptor consultation (ADR-118) runs through the shared lifecycle
 * engine (ADR-228) via `consultingLifecycle`: the source is the one
 * consultable entity, seeded with the topic as asking seeds its target
 * (ADR-239), so a topic table reads it the same way.
 *
 * Public interface: consultingAction, consultingLifecycle.
 * Owner context: stdlib / standard actions / reference
 */

import { Action, ActionContext, ValidationResult } from '../../enhanced-types.js';
import { type ISemanticEvent } from '@sharpee/core';
import { TraitType, type IFEntity } from '@sharpee/world-model';
import { IFActions } from '../../constants.js';
import { ActionMetadata } from '../../../validation/index.js';
import { ScopeLevel } from '../../../scope/types.js';
import { nounPhraseFor } from '../../../utils/index.js';
import { ConsultedEventData } from './consulting-events.js';
import {
  ActionLifecycleDescriptor,
  blockedMessageId
} from '../../lifecycle/index.js';

/**
 * The thing consulted. The parser seats slots by position, so in the
 * topic-first forms (`look up <topic> in <source>`) the source is the
 * second slot and lands in the indirect-object seat; in `consult <source>
 * about <topic>` it is the direct object.
 *
 * @param context - The action context.
 * @returns The source entity, or undefined when the command names none.
 */
function sourceOf(context: ActionContext): IFEntity | undefined {
  return context.command.directObject?.entity ?? context.command.indirectObject?.entity;
}

/**
 * Interceptor surface (ADR-228): the source consulted is the only
 * consultable entity; the topic reaches its hooks through sharedData.
 */
export const consultingLifecycle: ActionLifecycleDescriptor = {
  actionId: IFActions.CONSULTING,
  reportEventType: 'if.event.consulted',
  blockedEventType: 'if.event.consult_blocked',
  slots: [
    {
      id: 'source',
      actionIds: [IFActions.CONSULTING],
      resolve: (ctx) => sourceOf(ctx),
      seedData: (ctx) => ({
        topic: ctx.command.topic?.text,
        topicEntityId: ctx.command.topic?.entity
      })
    }
  ]
};

export const consultingAction: Action & { metadata: ActionMetadata } = {
  id: IFActions.CONSULTING,

  defaultScope: {
    source: ScopeLevel.VISIBLE
  },

  requiredMessages: [
    'no_target',
    'no_topic',
    'not_consultable',
    'nothing_found'
  ],

  group: 'observation',

  metadata: {
    requiresDirectObject: true,
    requiresIndirectObject: false,
    directObjectScope: ScopeLevel.VISIBLE
  },

  validate(context: ActionContext): ValidationResult {
    const source = sourceOf(context);
    if (!source) {
      return { valid: false, error: 'no_target' };
    }
    if (!source.has(TraitType.READABLE)) {
      return { valid: false, error: 'not_consultable', params: { source: nounPhraseFor(source) } };
    }
    if (!context.command.topic?.text) {
      return { valid: false, error: 'no_topic', params: { source: nounPhraseFor(source) } };
    }
    return { valid: true };
  },

  execute(_context: ActionContext): void {
    // Consulting mutates nothing — the source's table or clause answers in report.
  },

  blocked(context: ActionContext, result: ValidationResult): ISemanticEvent[] {
    const source = sourceOf(context);
    return [context.event('if.event.consult_blocked', {
      blocked: true,
      messageId: blockedMessageId(context, result),
      // params carry EntityInfo for the formatter chain (ADR-158)
      params: { ...result.params, source: source ? nounPhraseFor(source) : undefined },
      reason: result.error,
      sourceId: source?.id
    })];
  },

  report(context: ActionContext): ISemanticEvent[] {
    const source = sourceOf(context)!;
    const topic = context.command.topic?.text;

    // The stock line — a matched topic row or a clause replaces it.
    return [context.event('if.event.consulted', {
      messageId: `${context.action.id}.nothing_found`,
      params: { source: nounPhraseFor(source), topic },
      sourceId: source.id,
      sourceName: source.name,
      topic,
      topicEntityId: context.command.topic?.entity
    } as ConsultedEventData & { messageId: string; params: Record<string, unknown> })];
  }
};
