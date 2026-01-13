/**
 * Event Chains - Standard Library Event Chain Handlers (ADR-094)
 *
 * Event chains define relationships between events where one event
 * automatically triggers the emission of related events. This provides
 * declarative event composition rather than imperative multi-emit in actions.
 *
 * Standard chains:
 * - opened → revealed: When a container opens, emit revealed for contents
 *
 * Stories can:
 * - Override standard chains using the chain keys
 * - Add story-specific chains with different priorities
 * - Use 'cascade' mode to add to stdlib chains
 *
 * @example
 * ```typescript
 * // Override stdlib opened→revealed with custom behavior
 * world.chainEvent('if.event.opened', myHandler, {
 *   key: OPENED_REVEALED_CHAIN_KEY,
 *   priority: 100
 * });
 *
 * // Add additional chain that fires after stdlib
 * world.chainEvent('if.event.opened', trapHandler, {
 *   key: 'story.chain.trap-trigger',
 *   priority: 200  // Fires after stdlib (100)
 * });
 * ```
 */

import { WorldModel } from '@sharpee/world-model';
import {
  createOpenedRevealedChain,
  OPENED_REVEALED_CHAIN_KEY
} from './opened-revealed';

/**
 * Register all standard library event chains with a WorldModel.
 *
 * This should be called during engine initialization, after the
 * EventProcessor has been connected to the WorldModel.
 *
 * @param world - The WorldModel to register chains with
 */
export function registerStandardChains(world: WorldModel): void {
  // opened → revealed chain
  // Priority 100 is the stdlib default - stories can use lower numbers
  // to fire before, or higher numbers to fire after
  world.chainEvent(
    'if.event.opened',
    createOpenedRevealedChain(),
    {
      key: OPENED_REVEALED_CHAIN_KEY,
      priority: 100
    }
  );

  // Future chains can be added here:
  // - closed → hidden (opposite of revealed)
  // - searched → revealed (for searchable containers)
  // - unlocked → unlockable (cascade to other locks)
}

// Re-export chain keys for story use
export { OPENED_REVEALED_CHAIN_KEY } from './opened-revealed';

// Re-export chain creators for testing or custom registration
export { createOpenedRevealedChain } from './opened-revealed';
