/**
 * Action Interceptor interface (ADR-118)
 *
 * Interceptors allow entities to hook into stdlib action phases
 * without replacing standard logic. This is the "Before/After" pattern
 * from Inform 6/7, complementing the full delegation pattern in
 * capability behaviors.
 *
 * Key difference from CapabilityBehavior:
 * - CapabilityBehavior: Full delegation, trait owns ALL logic (LOWER, RAISE)
 * - ActionInterceptor: Hooks into phases, action owns core logic (ENTER, PUT)
 */

import { IFEntity } from '../entities';
import { WorldModel } from '../world';
import { CapabilityEffect } from './types';

/**
 * Shared data object for passing data between interceptor phases.
 * Mirrors CapabilitySharedData pattern from capability-behavior.ts.
 *
 * Interceptors can store data here during earlier phases (e.g., postValidate)
 * and access it in later phases (e.g., postExecute, postReport).
 */
export type InterceptorSharedData = Record<string, unknown>;

/**
 * Result from interceptor validation hooks.
 * Returning null means "continue with standard logic".
 * Returning a result blocks or modifies the action.
 */
export interface InterceptorResult {
  /** Whether the action can proceed */
  valid: boolean;
  /** Error code if validation failed (for message lookup) */
  error?: string;
  /** Additional context for error messages */
  params?: Record<string, unknown>;
}

/**
 * Action interceptor interface.
 *
 * Interceptors hook into stdlib action phases to customize behavior
 * without reimplementing standard logic. All hooks are optional.
 *
 * Phase order:
 * 1. preValidate - Before standard validation
 * 2. (standard validation runs)
 * 3. postValidate - After standard validation passes
 * 4. (standard execute runs)
 * 5. postExecute - After standard execution
 * 6. (standard report runs)
 * 7. postReport - Additional effects after standard report
 *
 * If validation fails at any point:
 * - onBlocked - Called instead of execute/report phases
 *
 * @example
 * ```typescript
 * // Boat puncture interceptor - checks for sharp objects when entering
 * const InflatableEnteringInterceptor: ActionInterceptor = {
 *   postValidate(entity, world, actorId, sharedData) {
 *     const inventory = world.getContents(actorId);
 *     const sharpObject = inventory.find(item => item.puncturesBoat);
 *     if (sharpObject) {
 *       sharedData.willPuncture = true;
 *       sharedData.punctureItem = sharpObject.name;
 *     }
 *     return null; // Allow entering to proceed
 *   },
 *
 *   postExecute(entity, world, actorId, sharedData) {
 *     if (!sharedData.willPuncture) return;
 *     // Deflate the boat, eject player
 *     const trait = entity.get(InflatableTrait);
 *     trait.isInflated = false;
 *     world.moveEntity(actorId, world.getLocation(entity.id));
 *   },
 *
 *   postReport(entity, world, actorId, sharedData) {
 *     if (!sharedData.willPuncture) return [];
 *     return [createEffect('dungeo.boat.punctured', { item: sharedData.punctureItem })];
 *   }
 * };
 * ```
 */
export interface ActionInterceptor {
  /**
   * Called BEFORE standard validation.
   *
   * Use this to block actions early based on entity-specific conditions.
   * Return an InterceptorResult to block the action.
   * Return null to continue with standard validation.
   *
   * @example
   * // Troll blocks entering the Troll Room
   * preValidate(entity, world, actorId, sharedData) {
   *   if (trollIsAlive(world)) {
   *     return { valid: false, error: 'dungeo.troll.blocks_path' };
   *   }
   *   return null;
   * }
   */
  preValidate?(
    entity: IFEntity,
    world: WorldModel,
    actorId: string,
    sharedData: InterceptorSharedData
  ): InterceptorResult | null;

  /**
   * Called AFTER standard validation passes.
   *
   * Use this to add entity-specific conditions that should block
   * an otherwise valid action, or to set up data for postExecute.
   * Return an InterceptorResult to block the action.
   * Return null to continue with execution.
   *
   * @example
   * // Check if player is carrying something that will puncture the boat
   * postValidate(entity, world, actorId, sharedData) {
   *   const sharp = findSharpObject(world, actorId);
   *   if (sharp) {
   *     sharedData.willPuncture = true;
   *     sharedData.punctureItem = sharp.name;
   *   }
   *   return null; // Still allow entering
   * }
   */
  postValidate?(
    entity: IFEntity,
    world: WorldModel,
    actorId: string,
    sharedData: InterceptorSharedData
  ): InterceptorResult | null;

  /**
   * Called AFTER standard execution completes.
   *
   * Use this to perform additional mutations based on the action.
   * Cannot prevent the action (use postValidate for that).
   * Access data stored in sharedData during validation phases.
   *
   * @example
   * // Glacier melts when torch is thrown at it
   * postExecute(entity, world, actorId, sharedData) {
   *   if (!sharedData.willMelt) return;
   *   meltGlacier(world, entity.id);
   *   openPassage(world, 'glacier-passage');
   * }
   */
  postExecute?(
    entity: IFEntity,
    world: WorldModel,
    actorId: string,
    sharedData: InterceptorSharedData
  ): void;

  /**
   * Called AFTER standard report.
   *
   * Return additional effects to emit after the standard effects.
   * Return empty array if no additional effects needed.
   *
   * @example
   * // Add glacier melting message
   * postReport(entity, world, actorId, sharedData) {
   *   if (!sharedData.melted) return [];
   *   return [createEffect('dungeo.glacier.melted', { messageId: 'dungeo.glacier.melts' })];
   * }
   */
  postReport?(
    entity: IFEntity,
    world: WorldModel,
    actorId: string,
    sharedData: InterceptorSharedData
  ): CapabilityEffect[];

  /**
   * Called when action is blocked (validation failed).
   *
   * Use this to provide custom blocked handling for this entity.
   * Return effects to emit, or null to use standard blocked handling.
   *
   * @example
   * // Custom message when troll blocks entry
   * onBlocked(entity, world, actorId, error, sharedData) {
   *   if (error === 'dungeo.troll.blocks_path') {
   *     return [createEffect('game.message', { messageId: 'dungeo.troll.snarls' })];
   *   }
   *   return null; // Use standard blocked handling
   * }
   */
  onBlocked?(
    entity: IFEntity,
    world: WorldModel,
    actorId: string,
    error: string,
    sharedData: InterceptorSharedData
  ): CapabilityEffect[] | null;
}
