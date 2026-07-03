/**
 * Capability binding types (ADR-090, ADR-207).
 *
 * A binding associates a trait type + capability (action ID) with a behavior
 * definition. Per ADR-207, a binding is per-game state: it is scoped to one
 * running `WorldModel` instance, not process-global. The behavior definition
 * it points at stays a shareable, stateless strategy (ADR-090); only the
 * *binding* (which behavior a given world has wired up for a given
 * trait+capability) is per-world.
 *
 * Public interface: `TraitBehaviorBinding`, `BehaviorRegistrationOptions`.
 * Owner: world-model (capability dispatch storage, ADR-090/ADR-207).
 */

import { ITrait } from '../traits/trait';
import type { CapabilityBehavior } from './capability-behavior';
import type { CapabilityResolution, CapabilityMode } from './capability-defaults';

/**
 * Options for registering a capability behavior on a `WorldModel`.
 */
export interface BehaviorRegistrationOptions<T extends ITrait = ITrait> {
  /** Priority for resolution (higher = checked first). Default: 0 */
  priority?: number;
  /** Override global resolution strategy for this binding */
  resolution?: CapabilityResolution;
  /** Override global mode for this binding */
  mode?: CapabilityMode;
  /** Optional runtime validation */
  validateBinding?: (trait: T) => boolean;
}

/**
 * Binding between a trait type, capability, and behavior — scoped to one
 * running game (owned by the `WorldModel` instance that registered it,
 * ADR-207). Two `WorldModel` instances may legitimately bind the same
 * `(traitType, capability)` key to different behaviors.
 */
export interface TraitBehaviorBinding<T extends ITrait = ITrait> {
  /** Trait type identifier */
  traitType: string;
  /** Action ID (capability) this binding handles */
  capability: string;
  /** The behavior that handles this trait+capability */
  behavior: CapabilityBehavior;
  /** Priority for resolution (higher = checked first) */
  priority: number;
  /** Override resolution strategy (undefined = use global default) */
  resolution?: CapabilityResolution;
  /** Override mode (undefined = use global default) */
  mode?: CapabilityMode;
  /** Optional runtime validation */
  validateBinding?: (trait: T) => boolean;
}

/**
 * Generate the binding-map key for a trait+capability combination.
 * Shared by `WorldModel`'s registration/lookup methods so the key format
 * stays in one place.
 */
export function capabilityBindingKey(traitType: string, capability: string): string {
  return `${traitType}:${capability}`;
}
