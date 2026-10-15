/**
 * Extinguishing action — put out a lantern, blow out a candle (ADR-374 D9).
 *
 * A flame light is put out by `LightSourceBehavior.extinguish`. A switchable
 * light is switched off: extinguishing delegates to switching off
 * (delegation-shared.ts, ADR-228 D6-B), so its lines and its
 * `on the player switching_off` hooks hold, and a refusal speaks in switching
 * off's words. When the actor's room goes dark, the line says so.
 *
 * Four-phase pattern (ADR-051):
 * 1. validate: a light source in reach; delegate, or lit
 * 2. execute: delegate, or put it out
 * 3. report: delegate, or if.event.extinguished
 * 4. blocked: if.event.extinguish_blocked
 *
 * Public interface: extinguishingAction, extinguishingLifecycle, ExtinguishedEventData.
 * Owner context: stdlib / standard actions / device manipulation
 */

import { type ISemanticEvent } from '@sharpee/core';
import { TraitType, LightSourceBehavior } from '@sharpee/world-model';
import { Action, ActionContext, ValidationResult } from '../../enhanced-types.js';
import { IFActions } from '../../constants.js';
import { ActionMetadata } from '../../../validation/index.js';
import { ScopeLevel } from '../../../scope/types.js';
import { nounPhraseFor } from '../../../utils/index.js';
import { ActionLifecycleDescriptor, blockedMessageId } from '../../lifecycle/index.js';
import { switchingOffAction, switchingOffLifecycle } from '../switching_off/switching_off.js';
import { Delegation, delegateValidate, delegateExecute, delegateReport, inDelegateWords } from '../delegation-shared.js';
import { darkForActor } from '../illumination-shared.js';

/** Payload of `if.event.extinguished`. */
export interface ExtinguishedEventData {
  targetId: string;
  targetName: string;
  /** Whether the actor's room went dark with it */
  darkened: boolean;
}

/** Interceptor surface (ADR-228): the light is the only consultable entity. */
export const extinguishingLifecycle: ActionLifecycleDescriptor = {
  actionId: IFActions.EXTINGUISHING,
  reportEventType: 'if.event.extinguished',
  blockedEventType: 'if.event.extinguish_blocked',
  slots: [
    {
      id: 'target',
      actionIds: [IFActions.EXTINGUISHING],
      resolve: (ctx) => ctx.command.directObject?.entity
    }
  ]
};

/** Carried from validate to report. */
interface ExtinguishingSharedData {
  /** Set when the light is switchable: switching off carries it out. */
  delegation?: Delegation;
  darkened?: boolean;
}

const shared = (context: ActionContext) => context.sharedData as ExtinguishingSharedData;

export const extinguishingAction: Action & { metadata: ActionMetadata } = {
  id: IFActions.EXTINGUISHING,

  defaultScope: {
    target: ScopeLevel.REACHABLE
  },

  requiredMessages: [
    'no_target',
    'not_light_source',
    'not_lit',
    'extinguished',
    'extinguished_into_darkness'
  ],

  group: 'device_manipulation',

  metadata: {
    requiresDirectObject: true,
    requiresIndirectObject: false,
    directObjectScope: ScopeLevel.REACHABLE
  },

  validate(context: ActionContext): ValidationResult {
    const target = context.command.directObject?.entity;
    if (!target) return { valid: false, error: 'no_target' };

    const scopeCheck = context.requireScope(target, ScopeLevel.REACHABLE);
    if (!scopeCheck.ok) return scopeCheck.error!;

    if (!target.has(TraitType.LIGHT_SOURCE)) {
      return { valid: false, error: 'not_light_source', params: { target: nounPhraseFor(target) } };
    }

    if (target.has(TraitType.SWITCHABLE)) {
      const { delegation, result } = delegateValidate(context, switchingOffAction, switchingOffLifecycle);
      shared(context).delegation = delegation;
      return inDelegateWords(result, delegation);
    }

    if (!LightSourceBehavior.isLit(target)) {
      return { valid: false, error: 'not_lit', params: { target: nounPhraseFor(target) } };
    }
    return { valid: true };
  },

  execute(context: ActionContext): void {
    const data = shared(context);
    if (data.delegation) {
      delegateExecute(data.delegation);
      return;
    }
    const wasDark = darkForActor(context);
    LightSourceBehavior.extinguish(context.command.directObject!.entity!);
    data.darkened = !wasDark && darkForActor(context);
  },

  report(context: ActionContext): ISemanticEvent[] {
    const data = shared(context);
    if (data.delegation) return delegateReport(data.delegation);
    const target = context.command.directObject!.entity!;
    const eventData: ExtinguishedEventData = { targetId: target.id, targetName: target.name, darkened: data.darkened === true };
    return [context.event('if.event.extinguished', {
      messageId: `${context.action.id}.${data.darkened ? 'extinguished_into_darkness' : 'extinguished'}`,
      params: { target: nounPhraseFor(target) },
      ...eventData
    })];
  },

  blocked(context: ActionContext, result: ValidationResult): ISemanticEvent[] {
    const target = context.command.directObject?.entity;
    return [context.event('if.event.extinguish_blocked', {
      messageId: blockedMessageId(context, result),
      params: { ...(target ? { target: nounPhraseFor(target) } : {}), ...(result.params ?? {}) },
      targetId: target?.id,
      targetName: target?.name,
      reason: result.error
    })];
  }
};
