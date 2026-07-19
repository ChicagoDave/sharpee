/**
 * Raising Action (ADR-090 Capability Dispatch)
 *
 * This action dispatches to trait behaviors instead of having fixed semantics.
 * Entities that can be raised declare the 'if.action.raising' capability
 * and register a behavior to handle it.
 *
 * Examples: basket elevator, drawbridge, blinds, levers
 */

import { createCapabilityDispatchAction } from '../../capability-dispatch.js';
import { IFActions } from '../../constants.js';

/**
 * Raising action - dispatches to capability behaviors.
 *
 * Usage:
 * 1. Create a trait that declares `static capabilities = ['if.action.raising']`
 * 2. Create a behavior implementing CapabilityBehavior
 * 3. Register the behavior with world.registerCapabilityBehavior() in your
 *    story's initializeWorld() (per-world binding, ADR-207)
 * 4. Add the trait to your entity
 */
export const raisingAction = createCapabilityDispatchAction({
  actionId: IFActions.RAISING,
  group: 'manipulation',
  noTargetError: 'no_target',
  cantDoThatError: 'cant_raise_that'
});
