/**
 * Capability Dispatch Helper for Universal Dispatch
 *
 * Enables capability dispatch for ALL stdlib actions, not just specialized verbs.
 * When an entity's trait declares a capability for an action, the trait's behavior
 * handles the action instead of the stdlib default.
 *
 * This enables patterns like:
 * - Troll blocking: TrollTrait handles 'if.action.going' to block passage
 * - Custom containers: ChestTrait handles 'if.action.opening' for locked chest
 * - Guardian items: AxeTrait handles 'if.action.taking' while troll guards it
 */

import { ISemanticEvent } from '@sharpee/core';
import {
  IFEntity,
  WorldModel,
  findTraitWithCapability,
  getBehaviorForCapability,
  CapabilityBehavior,
  CapabilitySharedData,
  CapabilityEffect,
  ITrait
} from '@sharpee/world-model';
import { Action, ActionContext, ValidationResult } from '@sharpee/stdlib';

/**
 * Result of checking for capability dispatch.
 */
export interface CapabilityDispatchCheck {
  /** Whether capability dispatch should be used */
  shouldDispatch: boolean;
  /** The trait claiming the capability (if found) */
  trait?: ITrait;
  /** The behavior to use (if found) */
  behavior?: CapabilityBehavior;
  /** The entity with the capability */
  entity?: IFEntity;
}

/**
 * Data stored for capability dispatch between phases.
 */
export interface CapabilityDispatchData {
  trait: ITrait;
  behavior: CapabilityBehavior;
  entityId: string;
  entityName: string;
  sharedData: CapabilitySharedData;
}

/**
 * Check if capability dispatch should be used for this action and target.
 *
 * @param actionId - The action being executed
 * @param target - The target entity (directObject)
 * @returns Check result with trait and behavior if dispatch should be used
 */
export function checkCapabilityDispatch(
  actionId: string,
  target: IFEntity | undefined
): CapabilityDispatchCheck {
  if (!target) {
    return { shouldDispatch: false };
  }

  // Find trait that claims this capability
  const trait = findTraitWithCapability(target, actionId);
  if (!trait) {
    return { shouldDispatch: false };
  }

  // Get behavior for this trait+capability
  const behavior = getBehaviorForCapability(trait, actionId);
  if (!behavior) {
    // Trait claims capability but no behavior registered
    // This is a configuration error - log and fall back to stdlib
    console.warn(
      `Universal dispatch: trait "${trait.type}" claims "${actionId}" ` +
      `but no behavior registered. Falling back to stdlib action.`
    );
    return { shouldDispatch: false };
  }

  return {
    shouldDispatch: true,
    trait,
    behavior,
    entity: target
  };
}

/**
 * Convert capability effects to semantic events.
 */
function effectsToEvents(
  effects: CapabilityEffect[],
  context: ActionContext
): ISemanticEvent[] {
  return effects.map(effect => context.event(effect.type, effect.payload));
}

/**
 * Execute capability dispatch validation phase.
 *
 * @returns ValidationResult with dispatch data if valid
 */
export function executeCapabilityValidate(
  check: CapabilityDispatchCheck,
  context: ActionContext
): ValidationResult {
  const { trait, behavior, entity } = check;

  if (!trait || !behavior || !entity) {
    return { valid: false, error: 'capability_dispatch_error' };
  }

  // Create sharedData for passing data between behavior phases
  const sharedData: CapabilitySharedData = {};

  // Delegate validation to behavior
  const behaviorResult = behavior.validate(
    entity,
    context.world,
    context.player.id,
    sharedData
  );

  if (!behaviorResult.valid) {
    // Store data for blocked() phase
    const data: CapabilityDispatchData = {
      trait,
      behavior,
      entityId: entity.id,
      entityName: entity.name,
      sharedData
    };

    return {
      valid: false,
      error: behaviorResult.error,
      params: behaviorResult.params,
      data
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
}

/**
 * Execute capability dispatch execute phase.
 */
export function executeCapabilityExecute(
  context: ActionContext
): void {
  const data = context.validationResult?.data as CapabilityDispatchData | undefined;
  const entity = context.command.directObject?.entity;

  if (!entity || !data?.behavior) {
    return;
  }

  // Delegate execution to behavior
  data.behavior.execute(entity, context.world, context.player.id, data.sharedData);
}

/**
 * Execute capability dispatch report phase.
 */
export function executeCapabilityReport(
  context: ActionContext
): ISemanticEvent[] {
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
  return effectsToEvents(effects, context);
}

/**
 * Execute capability dispatch blocked phase.
 */
export function executeCapabilityBlocked(
  context: ActionContext,
  result: ValidationResult,
  actionId: string
): ISemanticEvent[] {
  // Check both validationResult.data and result.data
  const data = (context.validationResult?.data ?? result.data) as CapabilityDispatchData | undefined;
  const entity = context.command.directObject?.entity;

  // If we have a behavior, let it handle the blocked message
  if (entity && data?.behavior) {
    const effects = data.behavior.blocked(
      entity,
      context.world,
      context.player.id,
      result.error || 'action_blocked',
      data.sharedData
    );
    return effectsToEvents(effects, context);
  }

  // Default blocked event (shouldn't normally reach here)
  return [
    context.event('action.blocked', {
      actionId,
      messageId: result.error || 'action_blocked',
      params: result.params || {}
    })
  ];
}
