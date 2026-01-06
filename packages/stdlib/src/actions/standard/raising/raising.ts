/**
 * Raising Action (ADR-090 Capability Dispatch)
 *
 * This action dispatches to trait behaviors instead of having fixed semantics.
 * Entities that can be raised declare the 'if.action.raising' capability
 * and register a behavior to handle it.
 *
 * Examples: basket elevator, drawbridge, blinds, levers
 */

import { createCapabilityDispatchAction } from '../../capability-dispatch';
import { IFActions } from '../../constants';

/**
 * Raising action - dispatches to capability behaviors.
 *
 * Usage:
 * 1. Create a trait that declares `static capabilities = ['if.action.raising']`
 * 2. Create a behavior implementing CapabilityBehavior
 * 3. Register the behavior with registerCapabilityBehavior()
 * 4. Add the trait to your entity
 */
export const raisingAction = createCapabilityDispatchAction({
  actionId: IFActions.RAISING,
  group: 'manipulation',
  noTargetError: 'if.raise.no_target',
  cantDoThatError: 'if.raise.cant_raise_that'
});
