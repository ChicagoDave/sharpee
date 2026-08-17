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
} from './types.js';

// Behavior interface
export { CapabilityBehavior, CapabilitySharedData } from './capability-behavior.js';

// Binding types (ADR-090, ADR-207). The binding map itself is per-world —
// it lives on WorldModel (registerCapabilityBehavior / getBehaviorForCapability /
// getBehaviorBinding), not as a module-level registry. These are the shapes
// WorldModel stores, kept here for reuse and to avoid a WorldModel -> capabilities
// -> world import cycle (see capability-binding.ts header).
export {
  TraitBehaviorBinding,
  BehaviorRegistrationOptions
} from './capability-binding.js';

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
} from './capability-defaults.js';

// Helpers
export {
  findTraitWithCapability,
  hasCapability,
  getEntityCapabilities,
  traitHasCapability,
  getCapableTraits
} from './capability-helpers.js';

// Entity builder
export {
  EntityBuilder,
  buildEntity
} from './entity-builder.js';

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
} from './action-interceptor.js';

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
} from './interceptor-binding.js';

// Exit-resolver types (ADR-295 computed exits). The binding map is per-world —
// it lives on WorldModel (registerExitResolver / getExitResolver /
// getAllExitResolvers). Declarations are trait data (traits/room/
// computedExitContract.ts); these are the traversal-time code shapes.
export type {
  ExitResolver,
  ExitResolution,
  ExitResolverContext
} from './exit-resolver-binding.js';

// Dialogue-selector binding (ADR-310 D15; contracts.md §5) — the
// conversation-action socket, consulted for character-modeled NPCs.
// Exchange-aware extension per ADR-320 (adr-320 contracts.md §4).
export type {
  DialogueSelector,
  DialogueSelectorRegistration,
  ConversationIntent,
  DialogueSelectionContext,
  DialogueSelectionResult,
  SceneDirective
} from './dialogue-selector-binding.js';

// Scene-runtime binding (ADR-320 D4/D7/D10; adr-320 contracts.md §4–§5) —
// the scene half of conversation dispatch: stdlib drives scene lifecycle
// through the binding the character subsystem registers per world.
export type {
  SceneRuntimeBinding,
  SceneOccasion,
  FloorBid,
  FloorDecision,
  InterruptionOutcome,
  InitiativeSeizure
} from './scene-runtime-binding.js';

// Scene wire schema (ADR-320 D12; adr-320 contracts.md §3) — the
// presentation-agnostic conversation wire: scene events and exchange
// response affordances, carried as channel data.
export type {
  SceneWireEvent,
  AffordanceTopic,
  ResponseAffordance,
  ExchangeAffordances,
  ThreadContinuability
} from './scene-wire.js';

// Interceptor helpers
export {
  findTraitWithInterceptor,
  hasInterceptor,
  getEntityInterceptors,
  traitHasInterceptor,
  getInterceptorTraits
} from './interceptor-helpers.js';
