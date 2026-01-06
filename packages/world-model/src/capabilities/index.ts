/**
 * Capability Dispatch System (ADR-090)
 *
 * Entity-centric action dispatch where traits declare capabilities
 * (action IDs they respond to) and behaviors implement the logic.
 */

// Types
export {
  CapabilityValidationResult,
  CapabilityEffect,
  createEffect
} from './types';

// Behavior interface
export { CapabilityBehavior } from './capability-behavior';

// Registry
export {
  TraitBehaviorBinding,
  registerCapabilityBehavior,
  getBehaviorForCapability,
  hasCapabilityBehavior,
  unregisterCapabilityBehavior,
  clearCapabilityRegistry,
  getAllCapabilityBindings
} from './capability-registry';

// Helpers
export {
  findTraitWithCapability,
  hasCapability,
  getEntityCapabilities,
  traitHasCapability,
  getCapableTraits
} from './capability-helpers';

// Entity builder
export {
  EntityBuilder,
  buildEntity
} from './entity-builder';
