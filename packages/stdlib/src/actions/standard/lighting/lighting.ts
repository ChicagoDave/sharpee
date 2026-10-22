/**
 * Lighting action — light a lamp, a lantern, a candle (ADR-374 D9).
 *
 * A flame light is lit by `LightSourceBehavior.light`, with its declared
 * tool in hand when it has one (`light-source with the matches`; the shared
 * tool rule, tool-shared.ts). A switchable light is switched on: lighting
 * delegates to switching on (delegation-shared.ts, ADR-228 D6-B), so its
 * power rule, its lines and its `on the player switching_on` hooks all hold,
 * and a refusal speaks in switching on's words. Either way a dark room lit
 * for the actor is described as a look would (illumination-shared.ts).
 *
 * Four-phase pattern (ADR-051):
 * 1. validate: a light source in reach; delegate, or not lit, fuelled, tool
 * 2. execute: delegate, or light it
 * 3. report: delegate, or if.event.lit and the auto-look
 * 4. blocked: if.event.light_blocked
 *
 * Public interface: lightingAction, lightingLifecycle, LitEventData.
 * Owner context: stdlib / standard actions / device manipulation
 */

import { type ISemanticEvent } from '@sharpee/core';
import { TraitType, LightSourceBehavior, LightSourceTrait } from '@sharpee/world-model';
import { Action, ActionContext, ValidationResult } from '../../enhanced-types.js';
import { IFActions } from '../../constants.js';
import { ActionMetadata } from '../../../validation/index.js';
import { ScopeLevel } from '../../../scope/types.js';
import { nounPhraseFor } from '../../../utils/index.js';
import { ActionLifecycleDescriptor, blockedMessageId } from '../../lifecycle/index.js';
import { switchingOnAction, switchingOnLifecycle } from '../switching_on/switching_on.js';
import { Delegation, delegateValidate, delegateExecute, delegateReport, inDelegateWords } from '../delegation-shared.js';
import { RevealedRoom, darkForActor, captureRevealedRoom, revealedRoomEvents } from '../illumination-shared.js';
import { resolveToolRequirements } from '../tool-shared.js';

/** Payload of `if.event.lit`. */
export interface LitEventData {
  targetId: string;
  targetName: string;
  /** The tool it was lit with, when it needs one */
  toolId?: string;
  /**
   * Set when a switch brought it on (switching on, or lighting delegated to
   * it): the fact is recorded with no message of its own, since the player
   * reads the switching line (D20, Q8).
   */
  bySwitch?: true;
}

/**
 * Interceptor surface (ADR-228): the light and any explicit tool, in that
 * order — burning's shape.
 */
export const lightingLifecycle: ActionLifecycleDescriptor = {
  actionId: IFActions.LIGHTING,
  reportEventType: 'if.event.lit',
  blockedEventType: 'if.event.light_blocked',
  slots: [
    {
      id: 'target',
      actionIds: [IFActions.LIGHTING],
      resolve: (ctx) => ctx.command.directObject?.entity,
      seedData: (ctx, entity) => ({ targetId: entity.id, targetName: entity.name, toolId: ctx.command.instrument?.entity?.id ?? ctx.command.indirectObject?.entity?.id })
    },
    {
      id: 'tool',
      actionIds: [IFActions.LIGHTING],
      resolve: (ctx) => ctx.command.instrument?.entity ?? ctx.command.indirectObject?.entity,
      seedData: (ctx, entity) => ({ toolId: entity.id, targetId: ctx.command.directObject?.entity?.id, targetName: ctx.command.directObject?.entity?.name })
    }
  ]
};

/** Carried from validate to report. */
interface LightingSharedData {
  /** Set when the light is switchable: switching on carries it out. */
  delegation?: Delegation;
  toolId?: string;
  wasDark?: boolean;
  revealed?: RevealedRoom;
}

const shared = (context: ActionContext) => context.sharedData as LightingSharedData;

export const lightingAction: Action & { metadata: ActionMetadata } = {
  id: IFActions.LIGHTING,

  defaultScope: {
    target: ScopeLevel.REACHABLE
  },

  requiredMessages: [
    'no_target',
    'not_light_source',
    'already_lit',
    'no_fuel',
    'no_tool',
    'needs_tool',
    'tool_not_held',
    'wrong_tool',
    'lit',
    'lit_in_darkness'
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
      const { delegation, result } = delegateValidate(context, switchingOnAction, switchingOnLifecycle);
      shared(context).delegation = delegation;
      return inDelegateWords(result, delegation);
    }

    if (LightSourceBehavior.isLit(target)) {
      return { valid: false, error: 'already_lit', params: { target: nounPhraseFor(target) } };
    }
    if (!LightSourceBehavior.hasFuel(target)) {
      return { valid: false, error: 'no_fuel', params: { target: nounPhraseFor(target) } };
    }

    const tool = resolveToolRequirements(
      context,
      target,
      context.command.instrument?.entity ?? context.command.indirectObject?.entity,
      target.get(LightSourceTrait)?.toolRequirement
    );
    if (tool.failure) return tool.failure;
    shared(context).toolId = tool.tool?.id;
    return { valid: true };
  },

  execute(context: ActionContext): void {
    const data = shared(context);
    if (data.delegation) {
      delegateExecute(data.delegation);
      return;
    }
    const target = context.command.directObject!.entity!;
    data.wasDark = darkForActor(context);
    LightSourceBehavior.light(target);
    if (data.wasDark && !darkForActor(context)) data.revealed = captureRevealedRoom(context);
  },

  report(context: ActionContext): ISemanticEvent[] {
    const data = shared(context);
    if (data.delegation) return delegateReport(data.delegation);
    const target = context.command.directObject!.entity!;
    const eventData: LitEventData = { targetId: target.id, targetName: target.name, ...(data.toolId ? { toolId: data.toolId } : {}) };
    const events: ISemanticEvent[] = [
      context.event('if.event.lit', {
        messageId: `${context.action.id}.${data.revealed ? 'lit_in_darkness' : 'lit'}`,
        params: { target: nounPhraseFor(target) },
        ...eventData
      })
    ];
    if (data.revealed) events.push(...revealedRoomEvents(context, data.revealed));
    return events;
  },

  blocked(context: ActionContext, result: ValidationResult): ISemanticEvent[] {
    const target = context.command.directObject?.entity;
    return [context.event('if.event.light_blocked', {
      messageId: blockedMessageId(context, result),
      params: { ...(target ? { target: nounPhraseFor(target) } : {}), ...(result.params ?? {}) },
      targetId: target?.id,
      targetName: target?.name,
      reason: result.error
    })];
  }
};
