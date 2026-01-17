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
 *
 * Resolution modes (ADR-090 extension):
 * - first-wins: First entity with capability determines result
 * - any-blocks: Any entity returning valid: false blocks
 * - all-must-pass: All entities must return valid: true
 * - highest-priority: Only highest priority entity is checked
 */

import { ISemanticEvent } from '@sharpee/core';
import {
  IFEntity,
  WorldModel,
  findTraitWithCapability,
  getBehaviorForCapability,
  getBehaviorBinding,
  CapabilityBehavior,
  CapabilitySharedData,
  CapabilityEffect,
  ITrait,
  getCapabilityConfig,
  CapabilityResolution
} from '@sharpee/world-model';
import { Action, ActionContext, ValidationResult } from '@sharpee/stdlib';

/**
 * A single capability claim from an entity.
 */
export interface CapabilityClaim {
  /** The entity making the claim */
  entity: IFEntity;
  /** The trait claiming the capability */
  trait: ITrait;
  /** The behavior to use */
  behavior: CapabilityBehavior;
  /** Priority for resolution ordering */
  priority: number;
  /** Resolution override from binding (if any) */
  resolutionOverride?: CapabilityResolution;
}

/**
 * Result of checking for capability dispatch.
 */
export interface CapabilityDispatchCheck {
  /** Whether capability dispatch should be used */
  shouldDispatch: boolean;
  /** The trait claiming the capability (if found) - for single dispatch */
  trait?: ITrait;
  /** The behavior to use (if found) - for single dispatch */
  behavior?: CapabilityBehavior;
  /** The entity with the capability - for single dispatch */
  entity?: IFEntity;
  /** All claims found (for multi-entity resolution) */
  claims?: CapabilityClaim[];
  /** Resolution mode to use */
  resolution?: CapabilityResolution;
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
 * @param target - The target entity (directObject) - for backward compatibility
 * @returns Check result with trait and behavior if dispatch should be used
 */
export function checkCapabilityDispatch(
  actionId: string,
  target: IFEntity | undefined
): CapabilityDispatchCheck {
  if (!target) {
    return { shouldDispatch: false };
  }

  // Use the multi-entity version with single entity
  return checkCapabilityDispatchMulti(actionId, [target]);
}

/**
 * Check if capability dispatch should be used for this action across multiple entities.
 *
 * Collects all capability claims from the provided entities, sorts by priority,
 * and returns the appropriate dispatch information based on resolution config.
 *
 * @param actionId - The action being executed
 * @param entities - All entities involved in the action (directObject, indirectObject, etc.)
 * @returns Check result with claims and resolution mode
 */
export function checkCapabilityDispatchMulti(
  actionId: string,
  entities: (IFEntity | undefined)[]
): CapabilityDispatchCheck {
  const validEntities = entities.filter((e): e is IFEntity => e !== undefined);

  if (validEntities.length === 0) {
    return { shouldDispatch: false };
  }

  // Collect all claims
  const claims: CapabilityClaim[] = [];

  for (const entity of validEntities) {
    const trait = findTraitWithCapability(entity, actionId);
    if (!trait) continue;

    const binding = getBehaviorBinding(trait, actionId);
    if (!binding) {
      // Trait claims capability but no behavior registered
      console.warn(
        `Universal dispatch: trait "${trait.type}" claims "${actionId}" ` +
        `but no behavior registered. Falling back to stdlib action.`
      );
      continue;
    }

    claims.push({
      entity,
      trait,
      behavior: binding.behavior,
      priority: binding.priority,
      resolutionOverride: binding.resolution
    });
  }

  if (claims.length === 0) {
    return { shouldDispatch: false };
  }

  // Sort by priority (highest first)
  claims.sort((a, b) => b.priority - a.priority);

  // Get resolution mode (use first binding override if present, else global config)
  const firstOverride = claims.find(c => c.resolutionOverride)?.resolutionOverride;
  const config = getCapabilityConfig(actionId);
  const resolution = firstOverride ?? config.resolution;

  // For single claim or first-wins/highest-priority, return simple result
  if (claims.length === 1 || resolution === 'first-wins' || resolution === 'highest-priority') {
    const primary = claims[0];
    return {
      shouldDispatch: true,
      trait: primary.trait,
      behavior: primary.behavior,
      entity: primary.entity,
      claims,
      resolution
    };
  }

  // For any-blocks or all-must-pass, return all claims for aggregate validation
  return {
    shouldDispatch: true,
    trait: claims[0].trait,
    behavior: claims[0].behavior,
    entity: claims[0].entity,
    claims,
    resolution
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
 * Handles resolution modes:
 * - first-wins/highest-priority: Single behavior validates
 * - any-blocks: All behaviors validate, any false blocks
 * - all-must-pass: All behaviors must return true
 *
 * @returns ValidationResult with dispatch data if valid
 */
export function executeCapabilityValidate(
  check: CapabilityDispatchCheck,
  context: ActionContext
): ValidationResult {
  const { trait, behavior, entity, claims, resolution } = check;

  if (!trait || !behavior || !entity) {
    return { valid: false, error: 'capability_dispatch_error' };
  }

  // Create sharedData for passing data between behavior phases
  const sharedData: CapabilitySharedData = {};

  // For first-wins or highest-priority (or single claim), just validate the primary
  if (!claims || claims.length <= 1 || resolution === 'first-wins' || resolution === 'highest-priority') {
    return validateSingleBehavior(entity, trait, behavior, context, sharedData);
  }

  // For any-blocks: validate all, return first failure
  if (resolution === 'any-blocks') {
    for (const claim of claims) {
      const claimSharedData: CapabilitySharedData = {};
      const result = claim.behavior.validate(
        claim.entity,
        context.world,
        context.player.id,
        claimSharedData
      );

      if (!result.valid) {
        // This claim blocks - use its error
        const data: CapabilityDispatchData = {
          trait: claim.trait,
          behavior: claim.behavior,
          entityId: claim.entity.id,
          entityName: claim.entity.name,
          sharedData: claimSharedData
        };

        return {
          valid: false,
          error: result.error,
          params: result.params,
          data
        };
      }
    }

    // All passed - use primary for execute/report
    const data: CapabilityDispatchData = {
      trait,
      behavior,
      entityId: entity.id,
      entityName: entity.name,
      sharedData
    };
    return { valid: true, data };
  }

  // For all-must-pass: same logic as any-blocks (any failure = overall failure)
  if (resolution === 'all-must-pass') {
    for (const claim of claims) {
      const claimSharedData: CapabilitySharedData = {};
      const result = claim.behavior.validate(
        claim.entity,
        context.world,
        context.player.id,
        claimSharedData
      );

      if (!result.valid) {
        const data: CapabilityDispatchData = {
          trait: claim.trait,
          behavior: claim.behavior,
          entityId: claim.entity.id,
          entityName: claim.entity.name,
          sharedData: claimSharedData
        };

        return {
          valid: false,
          error: result.error,
          params: result.params,
          data
        };
      }
    }

    const data: CapabilityDispatchData = {
      trait,
      behavior,
      entityId: entity.id,
      entityName: entity.name,
      sharedData
    };
    return { valid: true, data };
  }

  // Default: first-wins fallback
  return validateSingleBehavior(entity, trait, behavior, context, sharedData);
}

/**
 * Validate a single behavior (helper for executeCapabilityValidate).
 */
function validateSingleBehavior(
  entity: IFEntity,
  trait: ITrait,
  behavior: CapabilityBehavior,
  context: ActionContext,
  sharedData: CapabilitySharedData
): ValidationResult {
  const behaviorResult = behavior.validate(
    entity,
    context.world,
    context.player.id,
    sharedData
  );

  const data: CapabilityDispatchData = {
    trait,
    behavior,
    entityId: entity.id,
    entityName: entity.name,
    sharedData
  };

  if (!behaviorResult.valid) {
    return {
      valid: false,
      error: behaviorResult.error,
      params: behaviorResult.params,
      data
    };
  }

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
