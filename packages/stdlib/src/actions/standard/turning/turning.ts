/**
 * Turning action (ADR-090 capability dispatch + ADR-228 lifecycle;
 * chord go-live G1 shortlist, 2026-07-17).
 *
 * TURN has no standard semantics — a wheel rotates, a dial sets a number,
 * a crank activates (the ADR-090 verb table documents TURN as deliberately
 * entity-specific). The action performs NO mutation itself; the turn
 * OUTCOME is the target entity's own registered implementation, on either
 * surface (cutting's dual-surface shape, minus its trait gate — turning
 * has no eligibility trait):
 *   - an ADR-090 capability behavior registered for if.action.turning
 *     (TS authors), invoked from execute/report/blocked; or
 *   - an ADR-228 interceptor (Chord `on turning it`) whose postExecute
 *     owns the mutation and whose postReport owns the narration.
 *
 * An entity with NEITHER surface refuses with cant_turn_that — the same
 * answer the old full-delegation factory action gave.
 *
 * NOTE: the switching phrasal forms (`turn :device on|off`, `turn on|off
 * :device`) keep their own mapping — this action owns only the bare
 * `turn|rotate|twist :target` shapes, at priority 95 so switching wins.
 *
 * Four-phase pattern (ADR-051):
 * 1. validate: implementation presence (behavior XOR interceptor)
 * 2. execute: delegate to the capability behavior, if that's the surface
 * 3. report: behavior effects, or the standard turned event for interceptors
 * 4. blocked: standard blocked event through the lifecycle engine
 */

import { Action, ActionContext, ValidationResult } from '../../enhanced-types.js';
import { ISemanticEvent } from '@sharpee/core';
import {
  findTraitWithCapability,
  CapabilityEffect,
  CapabilitySharedData
} from '@sharpee/world-model';
import { IFActions } from '../../constants.js';
import { ActionMetadata } from '../../../validation/index.js';
import { ScopeLevel } from '../../../scope/types.js';
import { TurningMessages } from './turning-messages.js';
import { nounPhraseFor } from '../../../utils/index.js';
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
 * Interceptor surface (ADR-228): the turned target is the single
 * consultable entity of a TURN command.
 */
export const turningLifecycle: ActionLifecycleDescriptor = {
  actionId: IFActions.TURNING,
  slots: [
    {
      id: 'target',
      actionIds: [IFActions.TURNING],
      resolve: (ctx) => ctx.command.directObject?.entity,
      seedData: (ctx, entity) => ({
        targetId: entity.id,
        targetName: entity.name
      })
    }
  ]
};

/**
 * Data passed from validate() to execute/report when the implementation
 * surface is an ADR-090 capability behavior.
 */
interface TurningDispatchData {
  behavior: any;
  sharedData: CapabilitySharedData;
}

/**
 * Convert capability effects to semantic events. Effect messageIds are
 * forwarded unchanged — implementations MUST emit fully-qualified ids
 * (stdlib CLAUDE.md capability-effect rule; short keys render blank on
 * the universal dispatch path).
 */
function effectsToEvents(effects: CapabilityEffect[], context: ActionContext): ISemanticEvent[] {
  return effects.map((effect) => context.event(effect.type, { ...effect.payload }));
}

export const turningAction: Action & { metadata: ActionMetadata } = {
  id: IFActions.TURNING,

  defaultScope: {
    target: ScopeLevel.REACHABLE
  },

  requiresHolding: false,

  requiredMessages: [
    'no_target',
    'cant_turn_that',
    'turned'
  ],
  metadata: {
    requiresDirectObject: true,
    requiresIndirectObject: false,
    directObjectScope: ScopeLevel.REACHABLE
  },
  group: 'manipulation',

  validate(context: ActionContext): ValidationResult {
    const noun = context.command.directObject?.entity;

    if (!noun) {
      return { valid: false, error: TurningMessages.NO_TARGET };
    }

    const state = resolveLifecycle(context, turningLifecycle);
    const preVeto = runPreValidate(context, state);
    if (preVeto) return preVeto;

    const scopeCheck = context.requireScope(noun, ScopeLevel.REACHABLE);
    if (!scopeCheck.ok) {
      return scopeCheck.error!;
    }

    // Implementation presence (dual-surface): a capability behavior on one
    // of the target's traits, or an interceptor consulting this action.
    const capabilityTrait = findTraitWithCapability(noun, IFActions.TURNING);
    const behavior = capabilityTrait
      ? context.world.getBehaviorForCapability(capabilityTrait, IFActions.TURNING)
      : undefined;
    const hasInterceptor = !!context.world.getInterceptorForAction(noun, IFActions.TURNING);

    if (!behavior && !hasInterceptor) {
      return {
        valid: false,
        error: TurningMessages.CANT_TURN_THAT,
        params: { target: nounPhraseFor(noun) }
      };
    }

    let data: TurningDispatchData | undefined;
    if (behavior) {
      const sharedData: CapabilitySharedData = {};
      const behaviorResult = behavior.validate(noun, context.world, context.player.id, sharedData);
      if (!behaviorResult.valid) {
        return {
          valid: false,
          error: behaviorResult.error,
          // Capability-behavior error codes are fully-qualified by policy
          // (stdlib CLAUDE.md capability-effect rule) — ADR-231 D1 provenance.
          // Keyless vetoes fall back to an action-local id, so only a
          // supplied key carries the mark.
          errorQualified: behaviorResult.error != null,
          params: behaviorResult.params
        };
      }
      data = { behavior, sharedData };
    }

    const postVeto = runPostValidate(context, state);
    if (postVeto) return postVeto;

    return { valid: true, data };
  },

  /**
   * Execute — the action mutates NOTHING itself. A capability-behavior
   * implementation runs here; an interceptor implementation runs in its
   * own postExecute hook via the lifecycle engine.
   */
  execute(context: ActionContext): void {
    const noun = context.command.directObject!.entity!;
    const data = context.validationResult?.data as TurningDispatchData | undefined;

    if (data?.behavior) {
      data.behavior.execute(noun, context.world, context.player.id, data.sharedData);
      context.sharedData.turningDispatch = data;
    }

    const state = getLifecycleState(context);
    if (state) runPostExecute(context, state);
  },

  report(context: ActionContext): ISemanticEvent[] {
    const noun = context.command.directObject!.entity!;
    const data = (context.sharedData.turningDispatch ?? context.validationResult?.data) as
      | TurningDispatchData
      | undefined;

    let events: ISemanticEvent[];
    if (data?.behavior) {
      // Capability surface: the implementation owns the narration.
      events = effectsToEvents(
        data.behavior.report(noun, context.world, context.player.id, data.sharedData),
        context
      );
    } else {
      // Interceptor surface: standard turned event; the implementation's
      // postReport override typically replaces the generic message.
      events = [
        context.event('if.event.turned', {
          messageId: `${context.action.id}.${TurningMessages.TURNED}`,
          params: { target: nounPhraseFor(noun) },
          targetId: noun.id,
          targetName: noun.name,
          actorId: context.player.id
        })
      ];
    }

    const state = getLifecycleState(context);
    if (state) runPostReport(context, state, events, 'if.event.turned');

    return events;
  },

  blocked(context: ActionContext, result: ValidationResult): ISemanticEvent[] {
    const noun = context.command.directObject?.entity;

    const messageId = blockedMessageId(context, result);

    const events: ISemanticEvent[] = [
      context.event('if.event.turn_blocked', {
        messageId,
        params: {
          ...result.params,
          target: noun ? nounPhraseFor(noun) : undefined
        },
        targetId: noun?.id,
        targetName: noun?.name,
        reason: result.error
      })
    ];

    if (result.error) {
      const state = getLifecycleState(context);
      if (state) runOnBlocked(context, state, events, 'if.event.turn_blocked', result.error);
    }

    return events;
  }
};
