/**
 * Digging action (ADR-230 Phase 6 (sketch ruling 6, cutting template)) — trait-gated, implementation-dispatching.
 *
 * The action itself performs NO mutation. DiggableTrait gates eligibility
 * and carries the author-configured tool requirement; the dig OUTCOME is
 * the target entity's own registered implementation, on either surface
 * (dual-surface re-pin, 2026-07-17):
 *   - an ADR-090 capability behavior registered for if.action.digging
 *     (TS authors), invoked from execute/report/blocked; or
 *   - an ADR-228 interceptor (Chord `on digging it`) whose postExecute
 *     owns the mutation and whose postReport owns the narration.
 *
 * A diggable entity with NEITHER surface refuses with cant_dig — the
 * runtime safety net behind the Chord loader's load-time check.
 *
 * Four-phase pattern (ADR-051):
 * 1. validate: diggable gate, tool requirement, implementation presence
 * 2. execute: delegate to the capability behavior, if that's the surface
 * 3. report: behavior effects, or the standard cut event for interceptors
 * 4. blocked: standard blocked event through the lifecycle engine
 */

import { Action, ActionContext, ValidationResult } from '../../enhanced-types.js';
import { ISemanticEvent } from '@sharpee/core';
import {
  TraitType,
  DiggableBehavior,
  findTraitWithCapability,
  CapabilityEffect,
  CapabilitySharedData
} from '@sharpee/world-model';
import { IFActions } from '../../constants.js';
import { ActionMetadata } from '../../../validation/index.js';
import { ScopeLevel } from '../../../scope/types.js';
import { DiggingMessages } from './digging-messages.js';
import { validateToolRequirements } from '../tool-shared.js';
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
 * Interceptor surface (ADR-228, ADR-230 Phase 6 (sketch ruling 6, cutting template)): the cut target and any
 * explicit tool are the consultable entities of a DIG command, published
 * order target → tool (D3-B). Explicit tools only — mirrors locking's key
 * slot (ADR-229 R2).
 */
export const diggingLifecycle: ActionLifecycleDescriptor = {
  actionId: IFActions.DIGGING,
  slots: [
    {
      id: 'target',
      actionIds: [IFActions.DIGGING],
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
      actionIds: [IFActions.DIGGING],
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
interface DiggingDispatchData {
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

export const diggingAction: Action & { metadata: ActionMetadata } = {
  id: IFActions.DIGGING,

  defaultScope: {
    target: ScopeLevel.REACHABLE
  },

  requiresHolding: false,

  requiredMessages: [
    'no_target',
    'not_diggable',
    'cant_dig',
    'no_tool',
    'tool_not_held',
    'wrong_tool',
    'dug'
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
      return { valid: false, error: DiggingMessages.NO_TARGET };
    }

    const state = resolveLifecycle(context, diggingLifecycle);
    const preVeto = runPreValidate(context, state);
    if (preVeto) return preVeto;

    const scopeCheck = context.requireScope(noun, ScopeLevel.REACHABLE);
    if (!scopeCheck.ok) {
      return scopeCheck.error!;
    }

    // Eligibility gate: only a diggable entity can be cut.
    if (!noun.has(TraitType.DIGGABLE)) {
      return {
        valid: false,
        error: DiggingMessages.NOT_DIGGABLE,
        params: { item: nounPhraseFor(noun) }
      };
    }

    // Author-configured tool requirement (shared helper, PIN 2).
    const tool = context.command.instrument?.entity ?? context.command.indirectObject?.entity;
    const toolValidation = validateToolRequirements(
      context,
      noun,
      tool,
      DiggableBehavior.requiresTool(noun),
      (toolId) => DiggableBehavior.canDigWith(noun, toolId)
    );
    if (toolValidation) {
      return toolValidation;
    }

    // Implementation presence (dual-surface): a capability behavior on one
    // of the target's traits, or an interceptor consulting this action.
    const capabilityTrait = findTraitWithCapability(noun, IFActions.DIGGING);
    const behavior = capabilityTrait
      ? context.world.getBehaviorForCapability(capabilityTrait, IFActions.DIGGING)
      : undefined;
    const hasInterceptor = !!context.world.getInterceptorForAction(noun, IFActions.DIGGING);

    if (!behavior && !hasInterceptor) {
      // Runtime safety net — the Chord loader's post-load check is the
      // primary catch for unimplemented diggables.
      return {
        valid: false,
        error: DiggingMessages.CANT_DIG,
        params: { item: nounPhraseFor(noun) }
      };
    }

    let data: DiggingDispatchData | undefined;
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
    const data = context.validationResult?.data as DiggingDispatchData | undefined;

    if (data?.behavior) {
      data.behavior.execute(noun, context.world, context.player.id, data.sharedData);
      context.sharedData.diggingDispatch = data;
    }

    const state = getLifecycleState(context);
    if (state) runPostExecute(context, state);
  },

  report(context: ActionContext): ISemanticEvent[] {
    const noun = context.command.directObject!.entity!;
    const tool = context.command.instrument?.entity ?? context.command.indirectObject?.entity;
    const data = (context.sharedData.diggingDispatch ?? context.validationResult?.data) as
      | DiggingDispatchData
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
        context.event('if.event.dug', {
          messageId: `${context.action.id}.${DiggingMessages.DUG}`,
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
    if (state) runPostReport(context, state, events, 'if.event.dug');

    return events;
  },

  blocked(context: ActionContext, result: ValidationResult): ISemanticEvent[] {
    const noun = context.command.directObject?.entity;

    const messageId = blockedMessageId(context, result);

    const events: ISemanticEvent[] = [
      context.event('if.event.dug_blocked', {
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
      if (state) runOnBlocked(context, state, events, 'if.event.dug_blocked', result.error);
    }

    return events;
  }
};
