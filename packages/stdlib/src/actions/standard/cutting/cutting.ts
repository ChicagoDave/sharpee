/**
 * Cutting action (ADR-230 D3c) — trait-gated, implementation-dispatching.
 *
 * The action itself performs NO mutation. CuttableTrait gates eligibility
 * and carries the author-configured tool requirement; the cut OUTCOME is
 * the target entity's own registered implementation, on either surface
 * (dual-surface re-pin, 2026-07-17):
 *   - an ADR-090 capability behavior registered for if.action.cutting
 *     (TS authors), invoked from execute/report/blocked; or
 *   - an ADR-228 interceptor (Chord `on cutting it`) whose postExecute
 *     owns the mutation and whose postReport owns the narration.
 *
 * A cuttable entity with NEITHER surface refuses with cant_cut — the
 * runtime safety net behind the Chord loader's load-time check.
 *
 * Four-phase pattern (ADR-051):
 * 1. validate: cuttable gate, tool requirement, implementation presence
 * 2. execute: delegate to the capability behavior, if that's the surface
 * 3. report: behavior effects, or the standard cut event for interceptors
 * 4. blocked: standard blocked event through the lifecycle engine
 */

import { Action, ActionContext, ValidationResult } from '../../enhanced-types';
import { ISemanticEvent } from '@sharpee/core';
import {
  TraitType,
  CuttableBehavior,
  findTraitWithCapability,
  CapabilityEffect,
  CapabilitySharedData
} from '@sharpee/world-model';
import { IFActions } from '../../constants';
import { ActionMetadata } from '../../../validation';
import { ScopeLevel } from '../../../scope/types';
import { CuttingMessages } from './cutting-messages';
import { validateToolRequirements } from '../tool-shared';
import { nounPhraseFor } from '../../../utils';
import {
  ActionLifecycleDescriptor,
  resolveLifecycle,
  getLifecycleState,
  runPreValidate,
  runPostValidate,
  runPostExecute,
  runPostReport,
  runOnBlocked
} from '../../lifecycle';

/**
 * Interceptor surface (ADR-228, ADR-230 D3c): the cut target and any
 * explicit tool are the consultable entities of a CUT command, published
 * order target → tool (D3-B). Explicit tools only — mirrors locking's key
 * slot (ADR-229 R2).
 */
export const cuttingLifecycle: ActionLifecycleDescriptor = {
  actionId: IFActions.CUTTING,
  slots: [
    {
      id: 'target',
      actionIds: [IFActions.CUTTING],
      resolve: (ctx) => ctx.command.directObject?.entity,
      seedData: (ctx, entity) => {
        const tool = ctx.command.instrument?.entity ?? ctx.command.indirectObject?.entity;
        return {
          targetId: entity.id,
          targetName: entity.name,
          toolId: tool?.id,
          toolName: tool?.name
        };
      }
    },
    {
      id: 'tool',
      actionIds: [IFActions.CUTTING],
      resolve: (ctx) => ctx.command.instrument?.entity ?? ctx.command.indirectObject?.entity,
      seedData: (ctx, entity) => ({
        toolId: entity.id,
        toolName: entity.name,
        targetId: ctx.command.directObject?.entity?.id,
        targetName: ctx.command.directObject?.entity?.name
      })
    }
  ]
};

/**
 * Data passed from validate() to execute/report when the implementation
 * surface is an ADR-090 capability behavior.
 */
interface CuttingDispatchData {
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

export const cuttingAction: Action & { metadata: ActionMetadata } = {
  id: IFActions.CUTTING,

  defaultScope: {
    target: ScopeLevel.REACHABLE
  },

  requiresHolding: false,

  requiredMessages: [
    'no_target',
    'not_cuttable',
    'cant_cut',
    'no_tool',
    'tool_not_held',
    'wrong_tool',
    'cut'
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
      return { valid: false, error: CuttingMessages.NO_TARGET };
    }

    const state = resolveLifecycle(context, cuttingLifecycle);
    const preVeto = runPreValidate(context, state);
    if (preVeto) return preVeto;

    const scopeCheck = context.requireScope(noun, ScopeLevel.REACHABLE);
    if (!scopeCheck.ok) {
      return scopeCheck.error!;
    }

    // Eligibility gate: only a cuttable entity can be cut.
    if (!noun.has(TraitType.CUTTABLE)) {
      return {
        valid: false,
        error: CuttingMessages.NOT_CUTTABLE,
        params: { item: nounPhraseFor(noun) }
      };
    }

    // Author-configured tool requirement (shared helper, PIN 2).
    const tool = context.command.instrument?.entity ?? context.command.indirectObject?.entity;
    const toolValidation = validateToolRequirements(
      context,
      noun,
      tool,
      CuttableBehavior.requiresTool(noun),
      (toolId) => CuttableBehavior.canCutWith(noun, toolId)
    );
    if (toolValidation) {
      return toolValidation;
    }

    // Implementation presence (dual-surface): a capability behavior on one
    // of the target's traits, or an interceptor consulting this action.
    const capabilityTrait = findTraitWithCapability(noun, IFActions.CUTTING);
    const behavior = capabilityTrait
      ? context.world.getBehaviorForCapability(capabilityTrait, IFActions.CUTTING)
      : undefined;
    const hasInterceptor = !!context.world.getInterceptorForAction(noun, IFActions.CUTTING);

    if (!behavior && !hasInterceptor) {
      // Runtime safety net — the Chord loader's post-load check is the
      // primary catch for unimplemented cuttables.
      return {
        valid: false,
        error: CuttingMessages.CANT_CUT,
        params: { item: nounPhraseFor(noun) }
      };
    }

    let data: CuttingDispatchData | undefined;
    if (behavior) {
      const sharedData: CapabilitySharedData = {};
      const behaviorResult = behavior.validate(noun, context.world, context.player.id, sharedData);
      if (!behaviorResult.valid) {
        return {
          valid: false,
          error: behaviorResult.error,
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
    const data = context.validationResult?.data as CuttingDispatchData | undefined;

    if (data?.behavior) {
      data.behavior.execute(noun, context.world, context.player.id, data.sharedData);
      context.sharedData.cuttingDispatch = data;
    }

    const state = getLifecycleState(context);
    if (state) runPostExecute(context, state);
  },

  report(context: ActionContext): ISemanticEvent[] {
    const noun = context.command.directObject!.entity!;
    const tool = context.command.instrument?.entity ?? context.command.indirectObject?.entity;
    const data = (context.sharedData.cuttingDispatch ?? context.validationResult?.data) as
      | CuttingDispatchData
      | undefined;

    let events: ISemanticEvent[];
    if (data?.behavior) {
      // Capability surface: the implementation owns the narration.
      events = effectsToEvents(
        data.behavior.report(noun, context.world, context.player.id, data.sharedData),
        context
      );
    } else {
      // Interceptor surface: standard cut event; the implementation's
      // postReport override typically replaces the generic message.
      events = [
        context.event('if.event.cut', {
          messageId: `${context.action.id}.${CuttingMessages.CUT}`,
          params: { item: nounPhraseFor(noun), tool: tool ? nounPhraseFor(tool) : undefined },
          targetId: noun.id,
          targetName: noun.name,
          toolId: tool?.id,
          toolName: tool?.name,
          actorId: context.player.id
        })
      ];
    }

    const state = getLifecycleState(context);
    if (state) runPostReport(context, state, events, 'if.event.cut');

    return events;
  },

  blocked(context: ActionContext, result: ValidationResult): ISemanticEvent[] {
    const noun = context.command.directObject?.entity;

    const error = result.error || '';
    const messageId = error.includes('.') ? error : `${context.action.id}.${error}`;

    const events: ISemanticEvent[] = [
      context.event('if.event.cut_blocked', {
        messageId,
        params: {
          ...result.params,
          item: noun ? nounPhraseFor(noun) : undefined
        },
        targetId: noun?.id,
        targetName: noun?.name,
        reason: result.error
      })
    ];

    if (result.error) {
      const state = getLifecycleState(context);
      if (state) runOnBlocked(context, state, events, 'if.event.cut_blocked', result.error);
    }

    return events;
  }
};
