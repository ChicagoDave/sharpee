/**
 * Capability Behavior interface (ADR-090)
 *
 * Standard interface for behaviors that handle capability dispatch.
 * Follows the same 4-phase pattern as stdlib actions for consistency.
 */

import { IFEntity } from '../entities';
import { WorldModel } from '../world';
import { CapabilityValidationResult, CapabilityEffect } from './types';

/**
 * Standard interface for capability behaviors.
 *
 * Behaviors implement this interface to handle specific capabilities
 * (action IDs) declared by traits. When a trait declares a capability,
 * a corresponding behavior must be registered to handle it.
 *
 * The 4-phase pattern mirrors stdlib actions:
 * 1. validate - Check if the action can be performed
 * 2. execute - Perform mutations (no events)
 * 3. report - Generate success events
 * 4. blocked - Generate failure events
 *
 * @example
 * ```typescript
 * const BasketLoweringBehavior: CapabilityBehavior = {
 *   validate(entity, world, actorId) {
 *     const trait = entity.get(BasketElevatorTrait);
 *     if (trait.position === 'bottom') {
 *       return { valid: false, error: 'dungeo.basket.already_down' };
 *     }
 *     return { valid: true };
 *   },
 *
 *   execute(entity, world, actorId) {
 *     const trait = entity.get(BasketElevatorTrait);
 *     trait.position = 'bottom';
 *     world.moveEntity(entity.id, trait.bottomRoomId);
 *   },
 *
 *   report(entity, world, actorId) {
 *     return [createEffect('if.event.lowered', { target: entity.id })];
 *   },
 *
 *   blocked(entity, world, actorId, error) {
 *     return [createEffect('action.blocked', { messageId: error })];
 *   }
 * };
 * ```
 */
export interface CapabilityBehavior {
  /**
   * Phase 1: Validate whether the action can be performed.
   *
   * Check preconditions, state, and constraints. Return validation
   * result with error code if action cannot proceed.
   *
   * @param entity - The entity being acted upon
   * @param world - The world model for querying state
   * @param actorId - ID of the actor performing the action
   * @returns Validation result with optional error info
   */
  validate(entity: IFEntity, world: WorldModel, actorId: string): CapabilityValidationResult;

  /**
   * Phase 2: Execute mutations.
   *
   * Perform all state changes. Do NOT emit events here - that's
   * the report phase's job. This separation enables clean rollback
   * and consistent event generation.
   *
   * @param entity - The entity being acted upon
   * @param world - The world model for mutations
   * @param actorId - ID of the actor performing the action
   */
  execute(entity: IFEntity, world: WorldModel, actorId: string): void;

  /**
   * Phase 3: Report success.
   *
   * Generate effects describing what happened. Called after
   * execute() succeeds. Return events with appropriate message IDs.
   *
   * @param entity - The entity that was acted upon
   * @param world - The world model (post-mutation state)
   * @param actorId - ID of the actor who performed the action
   * @returns Array of effects to emit
   */
  report(entity: IFEntity, world: WorldModel, actorId: string): CapabilityEffect[];

  /**
   * Phase 4: Report failure.
   *
   * Generate effects for when validation fails. Called instead
   * of execute()/report() when validate() returns invalid.
   *
   * @param entity - The entity that couldn't be acted upon
   * @param world - The world model
   * @param actorId - ID of the actor who attempted the action
   * @param error - Error code from validation result
   * @returns Array of effects to emit
   */
  blocked(entity: IFEntity, world: WorldModel, actorId: string, error: string): CapabilityEffect[];
}
