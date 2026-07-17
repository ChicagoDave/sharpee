/**
 * Capability Dispatch Action Factory (ADR-090)
 *
 * Creates actions that dispatch to trait behaviors instead of having
 * fixed semantics. These actions find the trait claiming the capability
 * and delegate to the registered behavior.
 */

import { Action, ActionContext, ValidationResult } from './enhanced-types';
import { ISemanticEvent } from '@sharpee/core';
import {
  findTraitWithCapability,
  CapabilityEffect,
  CapabilitySharedData
} from '@sharpee/world-model';
import { ActionMetadata } from '../validation';
import { ScopeLevel } from '../scope/types';
import { nounPhraseFor } from '../utils';
import { blockedMessageId } from './lifecycle';

/**
 * Configuration for creating a capability-dispatch action.
 */
export interface CapabilityDispatchConfig {
  /** Action ID (e.g., 'if.action.lowering') */
  actionId: string;
  /** Action group for organization */
  group: string;
  /** Error when no target specified */
  noTargetError: string;
  /** Error when target lacks capability */
  cantDoThatError: string;
  /** Scope level for direct object (default: REACHABLE) */
  scope?: ScopeLevel;
}

/**
 * Data passed from validate() to execute/report via ValidationResult.data.
 */
interface CapabilityDispatchData {
  trait: any;
  behavior: any;
  entityId: string;
  entityName: string;
  /** Shared data object passed to all behavior phases */
  sharedData: CapabilitySharedData;
}

/**
 * Convert capability effects to semantic events.
 *
 * Short messageIds (no dots) are auto-prefixed with the actionId,
 * matching the convention used by standard actions. Fully-qualified
 * messageIds (containing dots) pass through unchanged, allowing
 * story-specific messages to bypass the prefix.
 */
function effectsToEvents(
  effects: CapabilityEffect[],
  context: ActionContext,
  actionId: string
): ISemanticEvent[] {
  return effects.map(effect => {
    const payload = { ...effect.payload };
    if (payload.messageId && !payload.messageId.includes('.')) {
      payload.messageId = `${actionId}.${payload.messageId}`;
    }
    return context.event(effect.type, payload);
  });
}

/**
 * Create a capability-dispatching action.
 *
 * These actions have no fixed semantics - they find the trait on the
 * target entity that claims the capability and delegate to its behavior.
 *
 * @param config - Configuration for the action
 * @returns Action that dispatches to capability behaviors
 *
 * @example
 * ```typescript
 * export const loweringAction = createCapabilityDispatchAction({
 *   actionId: IFActions.LOWERING,
 *   group: 'manipulation',
 *   noTargetError: 'if.lower.no_target',
 *   cantDoThatError: 'if.lower.cant_lower_that'
 * });
 * ```
 */
export function createCapabilityDispatchAction(
  config: CapabilityDispatchConfig
): Action & { metadata: ActionMetadata } {
  return {
    id: config.actionId,
    group: config.group,

    metadata: {
      requiresDirectObject: true,
      requiresIndirectObject: false,
      directObjectScope: config.scope ?? ScopeLevel.REACHABLE
    },

    requiredMessages: [
      'no_target',
      'cant_do_that'
    ],

    validate(context: ActionContext): ValidationResult {
      const entity = context.command.directObject?.entity;

      // Must have a target
      if (!entity) {
        return { valid: false, error: config.noTargetError };
      }

      // Find trait that claims this capability.
      // params carry EntityInfo for the formatter chain (ADR-158).
      const trait = findTraitWithCapability(entity, config.actionId);
      if (!trait) {
        return {
          valid: false,
          error: config.cantDoThatError,
          params: { target: nounPhraseFor(entity) }
        };
      }

      // Get behavior for this trait+capability from this world's binding map (ADR-207)
      const behavior = context.world.getBehaviorForCapability(trait, config.actionId);
      if (!behavior) {
        // Trait claims capability but no behavior registered
        // This is a configuration error - log and fail gracefully
        console.warn(
          `Capability dispatch: trait "${trait.type}" claims "${config.actionId}" ` +
          `but no behavior registered`
        );
        return {
          valid: false,
          error: config.cantDoThatError,
          params: { target: nounPhraseFor(entity) }
        };
      }

      // Create sharedData for passing data between behavior phases
      const sharedData: CapabilitySharedData = {};

      // Delegate validation to behavior
      const behaviorResult = behavior.validate(entity, context.world, context.player.id, sharedData);

      if (!behaviorResult.valid) {
        // ADR-231 D1: behavior-originated error keys are fully-qualified by
        // policy (capability-effect messageIds MUST be fully-qualified —
        // stdlib CLAUDE.md), so mark provenance and never re-prefix them.
        // A veto with NO key falls back to the factory's cantDoThatError,
        // which is action-local and must keep the prefix — so the mark
        // applies only when the behavior actually supplied a key.
        return {
          valid: false,
          error: behaviorResult.error,
          errorQualified: behaviorResult.error != null,
          params: behaviorResult.params
        };
      }

      // Pass discovered data to later phases via ValidationResult.data
      const data: CapabilityDispatchData = {
        trait,
        behavior,
        entityId: entity.id,
        entityName: entity.name,
        sharedData
      };

      return { valid: true, data };
    },

    execute(context: ActionContext): void {
      const data = context.validationResult?.data as CapabilityDispatchData | undefined;
      const entity = context.command.directObject?.entity;

      if (!entity || !data?.behavior) {
        return;
      }

      // Delegate execution to behavior
      data.behavior.execute(entity, context.world, context.player.id, data.sharedData);
    },

    blocked(context: ActionContext, result: ValidationResult): ISemanticEvent[] {
      // For blocked, we need to check both validationResult.data and result.data
      // because validate() may have stored data before returning a failed behavior validation
      const data = (context.validationResult?.data ?? result.data) as CapabilityDispatchData | undefined;
      const entity = context.command.directObject?.entity;

      // If we have a behavior, let it handle the blocked message
      if (entity && data?.behavior) {
        const effects = data.behavior.blocked(
          entity,
          context.world,
          context.player.id,
          result.error || config.cantDoThatError,
          data.sharedData
        );
        return effectsToEvents(effects, context, config.actionId);
      }

      // Default blocked event - use domain event pattern.
      // ADR-231 D1: qualification is by provenance via blockedMessageId —
      // behavior/interceptor errors carry errorQualified and pass through;
      // the factory's own short keys get the action-id prefix.
      const error = result.error || config.cantDoThatError;
      return effectsToEvents([{
        type: 'if.event.capability_blocked',
        payload: {
          blocked: true,
          messageId: blockedMessageId(context, { ...result, error }),
          actionId: config.actionId,
          reason: error,
          targetId: entity?.id,
          targetName: entity?.name,
          ...result.params
        }
      }], context, config.actionId);
    },

    report(context: ActionContext): ISemanticEvent[] {
      const data = context.validationResult?.data as CapabilityDispatchData | undefined;
      const entity = context.command.directObject?.entity;

      if (!entity || !data?.behavior) {
        return [];
      }

      // Delegate reporting to behavior
      const effects = data.behavior.report(
        entity,
        context.world,
        context.player.id,
        data.sharedData
      );
      return effectsToEvents(effects, context, config.actionId);
    }
  };
}
