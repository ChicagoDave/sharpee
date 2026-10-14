/**
 * The implementation-dispatching action shape (ADR-371 D1, D3), shared by
 * lowering, raising and setting — turning's shape, factored.
 *
 * Such a verb has no standard semantics and no trait gate: the target's own
 * registered implementation owns the outcome, on either surface —
 *   - an ADR-090 capability behavior registered for the action id (TS
 *     authors, or the story-loader's `settable` behavior), run from
 *     execute/report; or
 *   - an ADR-228 interceptor (a Chord `on the player lowering` clause) whose
 *     postExecute owns the mutation and whose postReport owns the narration.
 * A target with neither surface refuses with the action's `cantDoThat` id.
 *
 * Public interface: createImplementationDispatchingAction, ImplementationDispatchSpec.
 * Owner context: stdlib / standard actions
 */

import { Action, ActionContext, ValidationResult } from '../enhanced-types.js';
import { type ISemanticEvent } from '@sharpee/core';
import {
  findTraitWithCapability,
  type CapabilityEffect,
  type CapabilitySharedData,
  IFEntity
} from '@sharpee/world-model';
import { ActionMetadata } from '../../validation/index.js';
import { ScopeLevel } from '../../scope/types.js';
import { nounPhraseFor } from '../../utils/index.js';
import {
  ActionLifecycleDescriptor,
  blockedMessageId
} from '../lifecycle/index.js';

/**
 * Whether the target has an interceptor implementation of the action
 * (ADR-371 D1a): an interceptor bound on one of its traits whose `claims`
 * answers true for it, or that declares no `claims` at all. Shared by every
 * implementation-dispatching action — turning, cutting, digging, burning,
 * lowering, raising, setting.
 * @param world the world
 * @param target the entity acted on
 * @param actionId the action id
 * @returns true when an interceptor owns the action's outcome for the target
 */
export function hasInterceptorImplementation(world: ActionContext['world'], target: IFEntity, actionId: string): boolean {
  const found = world.getInterceptorForAction(target, actionId);
  if (!found) return false;
  return found.interceptor.claims ? found.interceptor.claims(target) : true;
}

/** What one implementation-dispatching verb says about itself. */
export interface ImplementationDispatchSpec {
  /** The action id (`if.action.lowering`). */
  actionId: string;
  /** The action group (`manipulation`). */
  group: string;
  /** The standard event for the interceptor surface (`if.event.lowered`). */
  reportEventType: string;
  /** The blocked event (`if.event.lower_blocked`). */
  blockedEventType: string;
  /** Message ids: no target, no implementation, and the standard success line. */
  messages: { noTarget: string; cantDoThat: string; done: string };
  /** Other message ids the action may emit (declared for the language gate). */
  extraMessages?: string[];
  /**
   * A refusal checked before the implementation is looked up (the setting
   * action's missing value). Returns a ValidationResult to refuse, else undefined.
   */
  earlyRefusal?(context: ActionContext, target: IFEntity): ValidationResult | undefined;
  /**
   * Extra data seeded into the behavior's sharedData and the interceptor
   * slot's sharedData — what the implementation needs beyond the target
   * (setting's typed value).
   */
  seed?(context: ActionContext): Record<string, unknown>;
  /** Extra params for the standard success event and the blocked event. */
  reportParams?(context: ActionContext): Record<string, unknown>;
}

/** Data passed from validate() to execute/report when the surface is a behavior. */
interface DispatchData {
  behavior: any;
  sharedData: CapabilitySharedData;
}

/**
 * Convert capability effects to semantic events. Effect messageIds are
 * forwarded unchanged — implementations MUST emit fully-qualified ids
 * (stdlib CLAUDE.md capability-effect rule).
 */
function effectsToEvents(effects: CapabilityEffect[], context: ActionContext): ISemanticEvent[] {
  return effects.map((effect) => context.event(effect.type, { ...effect.payload }));
}

/**
 * Build an implementation-dispatching action and its lifecycle descriptor.
 * @param spec the verb's ids, messages and seeds
 * @returns the action and the descriptor to list in the registry
 */
export function createImplementationDispatchingAction(spec: ImplementationDispatchSpec): {
  action: Action & { metadata: ActionMetadata };
  lifecycle: ActionLifecycleDescriptor;
} {
  const dispatchKey = `${spec.actionId}.dispatch`;

  const lifecycle: ActionLifecycleDescriptor = {
    actionId: spec.actionId,
    reportEventType: spec.reportEventType,
    blockedEventType: spec.blockedEventType,
    slots: [
      {
        id: 'target',
        actionIds: [spec.actionId],
        resolve: (ctx) => ctx.command.directObject?.entity,
        seedData: (ctx, entity) => ({
          targetId: entity.id,
          targetName: entity.name,
          ...(spec.seed?.(ctx) ?? {})
        })
      }
    ]
  };

  const action: Action & { metadata: ActionMetadata } = {
    id: spec.actionId,

    defaultScope: {
      target: ScopeLevel.REACHABLE
    },

    requiresHolding: false,

    // ADR-371 D1a: this action dispatches to the target's implementation itself.
    dispatchesImplementations: true,

    requiredMessages: [
      spec.messages.noTarget,
      spec.messages.cantDoThat,
      spec.messages.done,
      ...(spec.extraMessages ?? [])
    ],

    metadata: {
      requiresDirectObject: true,
      requiresIndirectObject: false,
      directObjectScope: ScopeLevel.REACHABLE
    },

    group: spec.group,

    validate(context: ActionContext): ValidationResult {
      const noun = context.command.directObject?.entity;
      if (!noun) {
        return { valid: false, error: spec.messages.noTarget };
      }

      const scopeCheck = context.requireScope(noun, ScopeLevel.REACHABLE);
      if (!scopeCheck.ok) {
        return scopeCheck.error!;
      }

      const early = spec.earlyRefusal?.(context, noun);
      if (early) return early;

      // Implementation presence (dual-surface): a capability behavior on one
      // of the target's traits, or an interceptor consulting this action.
      const capabilityTrait = findTraitWithCapability(noun, spec.actionId);
      const behavior = capabilityTrait
        ? context.world.getBehaviorForCapability(capabilityTrait, spec.actionId)
        : undefined;
      const hasInterceptor = hasInterceptorImplementation(context.world, noun, spec.actionId);

      if (!behavior && !hasInterceptor) {
        return {
          valid: false,
          error: spec.messages.cantDoThat,
          params: { target: nounPhraseFor(noun), ...(spec.reportParams?.(context) ?? {}) }
        };
      }

      let data: DispatchData | undefined;
      if (behavior) {
        const sharedData: CapabilitySharedData = { ...(spec.seed?.(context) ?? {}) };
        const behaviorResult = behavior.validate(noun, context.world, context.actor.id, sharedData);
        if (!behaviorResult.valid) {
          return {
            valid: false,
            error: behaviorResult.error,
            // Capability-behavior error codes are fully-qualified by policy
            // (stdlib CLAUDE.md capability-effect rule) — ADR-231 D1 provenance.
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
      const data = context.validationResult?.data as DispatchData | undefined;
      if (data?.behavior) {
        data.behavior.execute(noun, context.world, context.actor.id, data.sharedData);
        context.sharedData[dispatchKey] = data;
      }
    },

    report(context: ActionContext): ISemanticEvent[] {
      const noun = context.command.directObject!.entity!;
      const data = (context.sharedData[dispatchKey] ?? context.validationResult?.data) as
        | DispatchData
        | undefined;

      if (data?.behavior) {
        // Capability surface: the implementation owns the narration.
        return effectsToEvents(
          data.behavior.report(noun, context.world, context.actor.id, data.sharedData),
          context
        );
      }
      // Interceptor surface: the standard event; the implementation's
      // postReport override typically replaces the generic message.
      return [
        context.event(spec.reportEventType, {
          messageId: `${context.action.id}.${spec.messages.done}`,
          params: { target: nounPhraseFor(noun), ...(spec.reportParams?.(context) ?? {}) },
          targetId: noun.id,
          targetName: noun.name,
          actorId: context.actor.id,
          ...(spec.seed?.(context) ?? {})
        })
      ];
    },

    blocked(context: ActionContext, result: ValidationResult): ISemanticEvent[] {
      const noun = context.command.directObject?.entity;
      return [
        context.event(spec.blockedEventType, {
          messageId: blockedMessageId(context, result),
          params: {
            ...(spec.reportParams?.(context) ?? {}),
            ...result.params,
            target: noun ? nounPhraseFor(noun) : undefined
          },
          targetId: noun?.id,
          targetName: noun?.name,
          reason: result.error
        })
      ];
    }
  };

  return { action, lifecycle };
}
