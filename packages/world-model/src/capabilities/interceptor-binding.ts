/**
 * Interceptor binding types (ADR-118, ADR-208).
 *
 * A binding associates a trait type + action ID with an interceptor
 * definition. Per ADR-208, a binding is per-game state: it is scoped to one
 * running `WorldModel` instance, not process-global. The interceptor
 * definition it points at stays a shareable, stateless hook object
 * (ADR-118); only the *binding* (which interceptor a given world has wired
 * up for a given trait+action) is per-world.
 *
 * Public interface: `TraitInterceptorBinding`, `InterceptorRegistrationOptions`,
 * `InterceptorLookupResult`.
 * Owner: world-model (action-interceptor storage, ADR-118/ADR-208).
 */

import { ITrait } from '../traits/trait.js';
import type { ActionInterceptor } from './action-interceptor.js';

/**
 * Options for registering an action interceptor on a `WorldModel`.
 */
export interface InterceptorRegistrationOptions {
  /** Priority for resolution (higher = checked first). Default: 0 */
  priority?: number;
}

/**
 * Binding between a trait type, action, and interceptor — scoped to one
 * running game (owned by the `WorldModel` instance that registered it,
 * ADR-208). Two `WorldModel` instances may legitimately bind the same
 * `(traitType, actionId)` key to different interceptors.
 */
export interface TraitInterceptorBinding {
  /** Trait type identifier */
  traitType: string;
  /** Action ID this interceptor handles */
  actionId: string;
  /** The interceptor that handles this trait+action */
  interceptor: ActionInterceptor;
  /** Priority for resolution (higher = checked first) */
  priority: number;
}

/**
 * Result from looking up an interceptor for an entity+action.
 */
export interface InterceptorLookupResult {
  /** The interceptor */
  interceptor: ActionInterceptor;
  /** The trait that declared this interceptor */
  trait: ITrait;
  /** The binding metadata */
  binding: TraitInterceptorBinding;
}

/**
 * Generate the binding-map key for a trait+action combination.
 * Shared by `WorldModel`'s registration/lookup methods so the key format
 * stays in one place.
 */
export function interceptorBindingKey(traitType: string, actionId: string): string {
  return `${traitType}:${actionId}`;
}
