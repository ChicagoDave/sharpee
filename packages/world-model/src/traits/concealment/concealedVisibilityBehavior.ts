/**
 * Visibility behavior for concealed actors (ADR-148)
 *
 * Default behavior: a concealed actor is invisible to all observers.
 * Stories can override this for specific NPC types via capability dispatch
 * (e.g., alert guards can see through poor/fair concealment).
 *
 * Public interface: ConcealedVisibilityBehavior, registerConcealedVisibilityBehavior.
 * Owner context: @sharpee/world-model / traits / concealment
 */

import { CapabilityBehavior } from '../../capabilities/capability-behavior';
import { registerCapabilityBehavior } from '../../capabilities/capability-registry';
import { VISIBILITY_CAPABILITY } from '../../world/VisibilityBehavior';
import { ConcealedStateTrait } from './concealedStateTrait';

/**
 * Default visibility behavior for concealed actors.
 *
 * Blocks canSee() for all observers. The observerId is available in the
 * validate call for story-level overrides that need to check who is looking.
 */
export const ConcealedVisibilityBehavior: CapabilityBehavior = {
  validate(_entity, _world, _observerId, _sharedData) {
    return { valid: false, error: 'concealed' };
  },

  // Visibility behaviors only use validate (canSee check).
  // Execute/report/blocked are never called — they exist to satisfy the interface.
  execute() {},
  report() { return []; },
  blocked() { return []; },
};

/**
 * Register the default visibility behavior for concealed actors.
 *
 * Call this during platform initialization. Stories that need NPC detection
 * can register their own behavior for specific trait types using the same
 * capability dispatch override pattern.
 */
export function registerConcealedVisibilityBehavior(): void {
  registerCapabilityBehavior(
    ConcealedStateTrait.type,
    VISIBILITY_CAPABILITY,
    ConcealedVisibilityBehavior
  );
}
