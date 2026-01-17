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
export { CapabilityBehavior, CapabilitySharedData } from './capability-behavior';

// Registry
export {
  TraitBehaviorBinding,
  BehaviorRegistrationOptions,
  registerCapabilityBehavior,
  getBehaviorForCapability,
  getBehaviorBinding,
  hasCapabilityBehavior,
  unregisterCapabilityBehavior,
  clearCapabilityRegistry,
  getAllCapabilityBindings
} from './capability-registry';

// Defaults and configuration
export {
  CapabilityResolution,
  CapabilityMode,
  CapabilityConfig,
  defineCapabilityDefaults,
  getCapabilityConfig,
  hasCapabilityDefaults,
  clearCapabilityDefaults,
  getAllCapabilityDefaults
} from './capability-defaults';

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
