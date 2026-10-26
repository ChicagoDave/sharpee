/**
 * Burning action (ADR-371 D2, in cutting's shape) — trait-gated, implementation-dispatching.
 *
 * The action itself performs NO mutation. FlammableTrait gates eligibility
 * and carries the author-configured tool requirement; the burn OUTCOME is
 * the target entity's own registered implementation, on either surface
 * (dual-surface re-pin, 2026-07-17):
 *   - an ADR-090 capability behavior registered for if.action.burning
 *     (TS authors), invoked from execute/report/blocked; or
 *   - an ADR-228 interceptor (Chord `on the player burning`) whose postExecute
 *     owns the mutation and whose postReport owns the narration.
 *
 * A flammable entity with NEITHER surface refuses with cant_burn — the
 * runtime safety net behind the Chord loader's load-time check.
 *
 * Four-phase pattern (ADR-051):
 * 1. validate: flammable gate, tool requirement, implementation presence
 * 2. execute: delegate to the capability behavior, if that's the surface
 * 3. report: behavior effects, or the standard burned event for interceptors
 * 4. blocked: standard blocked event through the lifecycle engine
 */

import { Action, ActionContext, ValidationResult } from '../../enhanced-types.js';
import { type ISemanticEvent } from '@sharpee/core';
import {
  TraitType,
  FlammableTrait,
  findTraitWithCapability,
  type CapabilityEffect,
  type CapabilitySharedData,
  IFEntity
} from '@sharpee/world-model';
import { IFActions } from '../../constants.js';
import { hasInterceptorImplementation } from '../dispatch-shared.js';
import { ActionMetadata } from '../../../validation/index.js';
import { ScopeLevel } from '../../../scope/types.js';
import { BurningMessages } from './burning-messages.js';
import { resolveToolRequirements } from '../tool-shared.js';
import { nounPhraseFor } from '../../../utils/index.js';
import {
  ActionLifecycleDescriptor,
  blockedMessageId
} from '../../lifecycle/index.js';

/**
 * Interceptor surface (ADR-228, ADR-230 D3c): the burn target and any
 * explicit tool are the consultable entities of a BURN command, published
 * order target → tool (D3-B). Explicit tools only — mirrors locking's key
 * slot (ADR-229 R2).
 */
export const burningLifecycle: ActionLifecycleDescriptor = {
  actionId: IFActions.BURNING,
  reportEventType: 'if.event.burned',
  blockedEventType: 'if.event.burn_blocked',
  slots: [
    {
      id: 'target',
      actionIds: [IFActions.BURNING],
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
      actionIds: [IFActions.BURNING],
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
interface BurningDispatchData {
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

export const burningAction: Action & { metadata: ActionMetadata } = {
  id: IFActions.BURNING,

  defaultScope: {
    target: ScopeLevel.REACHABLE
  },

  requiresHolding: false,

  // ADR-371 D1a: this action dispatches to the target's implementation itself.
  dispatchesImplementations: true,

  requiredMessages: [
    'no_target',
    'not_flammable',
    'cant_burn',
    'no_tool',
    'needs_tool',
    'tool_not_held',
    'wrong_tool',
    'burned'
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
      return { valid: false, error: BurningMessages.NO_TARGET };
    }

    const scopeCheck = context.requireScope(noun, ScopeLevel.REACHABLE);
    if (!scopeCheck.ok) {
      return scopeCheck.error!;
    }

    // Eligibility gate: only a flammable entity can be burned.
    if (!noun.has(TraitType.FLAMMABLE)) {
      return {
        valid: false,
        error: BurningMessages.NOT_FLAMMABLE,
        params: { item: nounPhraseFor(noun) }
      };
    }

    // Author-configured tool requirement (shared helper, PIN 2).
    const explicitTool = context.command.instrument?.entity ?? context.command.indirectObject?.entity;
    const toolResolution = resolveToolRequirements(
      context,
      noun,
      explicitTool,
      noun.get(FlammableTrait)?.toolRequirement
    );
    if (toolResolution.failure) {
      return toolResolution.failure;
    }
    // GH #241: the tool in play — named, or implied from the hands — for
    // the later phases (the lifecycle's tool slot consults named tools only).
    context.sharedData.resolvedTool = toolResolution.tool;

    // Implementation presence (dual-surface): a capability behavior on one
    // of the target's traits, or an interceptor consulting this action.
    const capabilityTrait = findTraitWithCapability(noun, IFActions.BURNING);
    const behavior = capabilityTrait
      ? context.world.getBehaviorForCapability(capabilityTrait, IFActions.BURNING)
      : undefined;
    const hasInterceptor = hasInterceptorImplementation(context.world, noun, IFActions.BURNING);

    if (!behavior && !hasInterceptor) {
      // Runtime safety net — the Chord loader's post-load check is the
      // primary catch for unimplemented flammables.
      return {
        valid: false,
        error: BurningMessages.CANT_BURN,
        params: { item: nounPhraseFor(noun) }
      };
    }

    let data: BurningDispatchData | undefined;
    if (behavior) {
      const sharedData: CapabilitySharedData = {};
      const behaviorResult = behavior.validate(noun, context.world, context.actor.id, sharedData);
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

    return { valid: true, data };
  },

  /**
   * Execute — the action mutates NOTHING itself. A capability-behavior
   * implementation runs here; an interceptor implementation runs in its
   * own postExecute hook via the lifecycle engine.
   */
  execute(context: ActionContext): void {
    const noun = context.command.directObject!.entity!;
    const data = context.validationResult?.data as BurningDispatchData | undefined;

    if (data?.behavior) {
      data.behavior.execute(noun, context.world, context.actor.id, data.sharedData);
      context.sharedData.burningDispatch = data;
    }

  },

  report(context: ActionContext): ISemanticEvent[] {
    const noun = context.command.directObject!.entity!;
    const tool = (context.sharedData.resolvedTool as IFEntity | undefined)
      ?? context.command.instrument?.entity ?? context.command.indirectObject?.entity;
    const data = (context.sharedData.burningDispatch ?? context.validationResult?.data) as
      | BurningDispatchData
      | undefined;

    let events: ISemanticEvent[];
    if (data?.behavior) {
      // Capability surface: the implementation owns the narration.
      events = effectsToEvents(
        data.behavior.report(noun, context.world, context.actor.id, data.sharedData),
        context
      );
    } else {
      // Interceptor surface: standard burned event; the implementation's
      // postReport override typically replaces the generic message.
      events = [
        context.event('if.event.burned', {
          messageId: `${context.action.id}.${BurningMessages.BURNED}`,
          params: { item: nounPhraseFor(noun), tool: tool ? nounPhraseFor(tool) : undefined },
          targetId: noun.id,
          targetName: noun.name,
          toolId: tool?.id,
          toolName: tool?.name,
          actorId: context.actor.id
        })
      ];
    }

    return events;
  },

  blocked(context: ActionContext, result: ValidationResult): ISemanticEvent[] {
    const noun = context.command.directObject?.entity;

    const messageId = blockedMessageId(context, result);

    const events: ISemanticEvent[] = [
      context.event('if.event.burn_blocked', {
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

    return events;
  }
};
