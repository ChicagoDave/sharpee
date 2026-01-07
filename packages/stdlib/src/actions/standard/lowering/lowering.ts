/**
 * Lowering Action (ADR-090 Capability Dispatch)
 *
 * This action dispatches to trait behaviors instead of having fixed semantics.
 * Entities that can be lowered declare the 'if.action.lowering' capability
 * and register a behavior to handle it.
 *
 * Examples: basket elevator, drawbridge, blinds, levers
 */

import { createCapabilityDispatchAction } from '../../capability-dispatch';
import { IFActions } from '../../constants';

/**
 * Lowering action - dispatches to capability behaviors.
 *
 * Usage:
 * 1. Create a trait that declares `static capabilities = ['if.action.lowering']`
 * 2. Create a behavior implementing CapabilityBehavior
 * 3. Register the behavior with registerCapabilityBehavior()
 * 4. Add the trait to your entity
 *
 * @example
 * ```typescript
 * // In trait:
 * class BasketElevatorTrait implements ITrait {
 *   static readonly capabilities = ['if.action.lowering', 'if.action.raising'];
 *   // ...
 * }
 *
 * // In behavior:
 * const BasketLoweringBehavior: CapabilityBehavior = {
 *   validate(entity, world, actorId) { ... },
 *   execute(entity, world, actorId) { ... },
 *   report(entity, world, actorId) { ... },
 *   blocked(entity, world, actorId, error) { ... }
 * };
 *
 * // Registration:
 * registerCapabilityBehavior(
 *   BasketElevatorTrait.type,
 *   'if.action.lowering',
 *   BasketLoweringBehavior
 * );
 * ```
 */
export const loweringAction = createCapabilityDispatchAction({
  actionId: IFActions.LOWERING,
  group: 'manipulation',
  noTargetError: 'if.lower.no_target',
  cantDoThatError: 'if.lower.cant_lower_that'
});
