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

// ============================================================================
// Action Interceptors (ADR-118)
//
// Interceptors allow traits to hook into stdlib action phases without
// replacing standard logic. This complements capability behaviors which
// provide full delegation.
// ============================================================================

// Interceptor interface
export {
  ActionInterceptor,
  InterceptorSharedData,
  InterceptorResult
} from './action-interceptor';

// Interceptor registry
export {
  TraitInterceptorBinding,
  InterceptorRegistrationOptions,
  InterceptorLookupResult,
  registerActionInterceptor,
  getInterceptorForAction,
  getInterceptorBinding,
  hasActionInterceptor,
  unregisterActionInterceptor,
  clearInterceptorRegistry,
  getAllInterceptorBindings
} from './interceptor-registry';

// Interceptor helpers
export {
  findTraitWithInterceptor,
  hasInterceptor,
  getEntityInterceptors,
  traitHasInterceptor,
  getInterceptorTraits
} from './interceptor-helpers';
