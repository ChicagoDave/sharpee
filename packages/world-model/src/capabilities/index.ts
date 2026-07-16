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

// Binding types (ADR-090, ADR-207). The binding map itself is per-world —
// it lives on WorldModel (registerCapabilityBehavior / getBehaviorForCapability /
// getBehaviorBinding), not as a module-level registry. These are the shapes
// WorldModel stores, kept here for reuse and to avoid a WorldModel -> capabilities
// -> world import cycle (see capability-binding.ts header).
export {
  TraitBehaviorBinding,
  BehaviorRegistrationOptions
} from './capability-binding';

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
  InterceptorResult,
  InterceptorReportResult,
  InterceptorBlockedResult,
  InterceptorEventContext,
  applyInterceptorReportResult,
  applyInterceptorBlockedResult
} from './action-interceptor';

// Binding types (ADR-118, ADR-208). The binding map itself is per-world —
// it lives on WorldModel (registerActionInterceptor / getInterceptorForAction /
// getInterceptorBinding / getAllActionInterceptors), not as a module-level
// registry. These are the shapes WorldModel stores, kept here for reuse and
// to avoid a WorldModel -> capabilities -> world import cycle (see
// interceptor-binding.ts header).
export {
  TraitInterceptorBinding,
  InterceptorRegistrationOptions,
  InterceptorLookupResult
} from './interceptor-binding';

// Interceptor helpers
export {
  findTraitWithInterceptor,
  hasInterceptor,
  getEntityInterceptors,
  traitHasInterceptor,
  getInterceptorTraits
} from './interceptor-helpers';
