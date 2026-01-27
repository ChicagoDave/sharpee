/**
 * Entering action - enter containers, supporters, or other enterable objects
 *
 * This action handles entering objects that have the ENTRY trait or
 * are containers/supporters marked as enterable.
 *
 * Uses four-phase pattern with interceptor support (ADR-118):
 * 1. validate: preValidate hook → standard checks → postValidate hook
 * 2. execute: standard mutation → postExecute hook
 * 3. blocked: onBlocked hook (if validation failed)
 * 4. report: standard events → postReport hook (additional effects)
 */

import { Action, ActionContext, ValidationResult } from '../../enhanced-types';
import { ISemanticEvent } from '@sharpee/core';
import {
  TraitType,
  OpenableBehavior,
  EnterableTrait,
  getInterceptorForAction,
  ActionInterceptor,
  InterceptorSharedData,
  createEffect
} from '@sharpee/world-model';
import { IFActions } from '../../constants';
import { EnteredEventData } from './entering-events';
import { EnteringMessages } from './entering-messages';

interface EnteringExecutionState {
  targetId: string;
  targetName: string;
  fromLocation?: string;
  preposition: 'in' | 'on';
}

/**
 * Shared data passed between execute and report phases.
 * Now includes interceptor data for ADR-118 support.
 */
interface EnteringSharedData {
  enteringState?: EnteringExecutionState;
  /** Interceptor found during validate, if any */
  interceptor?: ActionInterceptor;
  /** Shared data for interceptor phases */
  interceptorData?: InterceptorSharedData;
}

function getEnteringSharedData(context: ActionContext): EnteringSharedData {
  return context.sharedData as EnteringSharedData;
}

import { ActionMetadata } from '../../../validation';
import { ScopeLevel } from '../../../scope/types';

export const enteringAction: Action & { metadata: ActionMetadata } = {
  id: IFActions.ENTERING,

  // Default scope requirements for this action's slots
  defaultScope: {
    target: ScopeLevel.REACHABLE
  },

  requiredMessages: [
    'no_target',
    'not_enterable',
    'already_inside',
    'container_closed',
    'too_full',
    'entered',
    'entered_on',
    'cant_enter'
  ],
  group: 'movement',

  validate(context: ActionContext): ValidationResult {
    const actor = context.player;
    const target = context.command.directObject?.entity;
    const sharedData = getEnteringSharedData(context);

    // Validate target
    if (!target) {
      return {
        valid: false,
        error: EnteringMessages.NO_TARGET
      };
    }

    // Check for interceptor on the target entity (ADR-118)
    const interceptorResult = getInterceptorForAction(target, IFActions.ENTERING);
    const interceptor = interceptorResult?.interceptor;
    const interceptorData: InterceptorSharedData = {};

    // Store for later phases
    sharedData.interceptor = interceptor;
    sharedData.interceptorData = interceptorData;

    // === PRE-VALIDATE HOOK ===
    // Called before standard validation - can block early
    if (interceptor?.preValidate) {
      const result = interceptor.preValidate(target, context.world, actor.id, interceptorData);
      if (result !== null) {
        return {
          valid: result.valid,
          error: result.error,
          params: result.params
        };
      }
    }

    // Check scope - must be able to reach the target
    const scopeCheck = context.requireScope(target, ScopeLevel.REACHABLE);
    if (!scopeCheck.ok) {
      return scopeCheck.error!;
    }

    // Check if already inside the target
    const currentLocation = context.world.getLocation(actor.id);
    if (currentLocation === target.id) {
      return {
        valid: false,
        error: EnteringMessages.ALREADY_INSIDE,
        params: { place: target.name }
      };
    }

    // Check enterability
    if (!target.has(TraitType.ENTERABLE)) {
      return {
        valid: false,
        error: EnteringMessages.NOT_ENTERABLE,
        params: { place: target.name }
      };
    }

    // Check if it needs to be open
    if (target.has(TraitType.OPENABLE) && !OpenableBehavior.isOpen(target)) {
      return {
        valid: false,
        error: EnteringMessages.CONTAINER_CLOSED,
        params: { container: target.name }
      };
    }

    // === POST-VALIDATE HOOK ===
    // Called after standard validation passes - can add entity-specific conditions
    if (interceptor?.postValidate) {
      const result = interceptor.postValidate(target, context.world, actor.id, interceptorData);
      if (result !== null) {
        return {
          valid: result.valid,
          error: result.error,
          params: result.params
        };
      }
    }

    return { valid: true };
  },

  /**
   * Execute the enter action - performs mutations only
   * Assumes validation has already passed
   */
  execute(context: ActionContext): void {
    const actor = context.player;
    const target = context.command.directObject!.entity!; // Safe because validate ensures it exists
    const currentLocation = context.world.getLocation(actor.id);
    const sharedData = getEnteringSharedData(context);

    // Get preposition from EnterableTrait (required by validate)
    const enterableTrait = target.get(TraitType.ENTERABLE) as EnterableTrait;
    const preposition = enterableTrait.preposition;

    // Simply move the actor to the target - that's all!
    context.world.moveEntity(actor.id, target.id);

    // Store state for report phase using sharedData
    const state: EnteringExecutionState = {
      targetId: target.id,
      targetName: target.name,
      fromLocation: currentLocation,
      preposition
    };
    sharedData.enteringState = state;

    // === POST-EXECUTE HOOK ===
    // Called after standard execution - can perform additional mutations
    const interceptor = sharedData.interceptor;
    const interceptorData = sharedData.interceptorData || {};
    if (interceptor?.postExecute) {
      interceptor.postExecute(target, context.world, actor.id, interceptorData);
    }
  },

  /**
   * Report events after successful entering
   * Only called on success path - validation passed
   */
  report(context: ActionContext): ISemanticEvent[] {
    // Get stored state from execute phase
    const sharedData = getEnteringSharedData(context);
    const state = sharedData.enteringState as EnteringExecutionState | undefined;
    if (!state) {
      // This shouldn't happen, but handle gracefully
      return [
        context.event('if.event.entered', {
          messageId: `${context.action.id}.${EnteringMessages.ACTION_FAILED}`,
          error: 'Missing state from execute phase'
        })
      ];
    }

    // Determine the message ID based on preposition
    const messageId = state.preposition === 'on' ? EnteringMessages.ENTERED_ON : EnteringMessages.ENTERED;

    // Create the ENTERED event with messageId for text rendering
    const events: ISemanticEvent[] = [context.event('if.event.entered', {
      messageId: `${context.action.id}.${messageId}`,
      params: { place: state.targetName },
      targetId: state.targetId,
      targetName: state.targetName,
      fromLocation: state.fromLocation,
      preposition: state.preposition
    } as EnteredEventData & { messageId: string; params: Record<string, any>; targetName: string })];

    // === POST-REPORT HOOK ===
    // Called after standard report - can add additional effects
    const interceptor = sharedData.interceptor;
    const interceptorData = sharedData.interceptorData || {};
    if (interceptor?.postReport) {
      const target = context.command.directObject?.entity;
      if (target) {
        const additionalEffects = interceptor.postReport(target, context.world, context.player.id, interceptorData);
        // Convert CapabilityEffects to ISemanticEvents
        for (const effect of additionalEffects) {
          events.push(context.event(effect.type, effect.payload));
        }
      }
    }

    return events;
  },

  /**
   * Generate events when validation fails
   * Called instead of execute/report when validate returns invalid
   */
  blocked(context: ActionContext, result: ValidationResult): ISemanticEvent[] {
    const target = context.command.directObject?.entity;
    const sharedData = getEnteringSharedData(context);

    // === ON-BLOCKED HOOK ===
    // Called when action is blocked - can provide custom blocked handling
    const interceptor = sharedData.interceptor;
    const interceptorData = sharedData.interceptorData || {};
    if (interceptor?.onBlocked && target && result.error) {
      const customEffects = interceptor.onBlocked(target, context.world, context.player.id, result.error, interceptorData);
      if (customEffects !== null) {
        // Interceptor provided custom blocked effects
        return customEffects.map(effect => context.event(effect.type, effect.payload));
      }
    }

    // Standard blocked handling
    return [context.event('if.event.entered', {
      blocked: true,
      messageId: `${context.action.id}.${result.error}`,
      params: { place: target?.name, ...result.params },
      reason: result.error,
      targetId: target?.id,
      targetName: target?.name
    })];
  },

  metadata: {
    requiresDirectObject: true,
    requiresIndirectObject: false,
    directObjectScope: ScopeLevel.REACHABLE
  }
};
