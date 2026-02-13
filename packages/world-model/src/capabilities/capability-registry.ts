/**
 * Capability Registry (ADR-090)
 *
 * Registry for trait-behavior bindings. Stories register behaviors
 * for their traits, and the dispatch system looks them up at runtime.
 */

import { ITrait, ITraitConstructor } from '../traits/trait';
import { CapabilityBehavior } from './capability-behavior';
import { CapabilityResolution, CapabilityMode } from './capability-defaults';

/**
 * Options for registering a capability behavior.
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
 * Binding between a trait type, capability, and behavior.
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
 * Registry storage: key = `${traitType}:${capability}`
 * Uses globalThis to ensure the registry is shared across module boundaries
 * (e.g., when story modules import from packages but actions run from bundle)
 */
const CAPABILITY_REGISTRY_KEY = '__sharpee_capability_behaviors__';

function getCapabilityRegistry(): Map<string, TraitBehaviorBinding> {
  const global = globalThis as Record<string, unknown>;
  if (!global[CAPABILITY_REGISTRY_KEY]) {
    global[CAPABILITY_REGISTRY_KEY] = new Map<string, TraitBehaviorBinding>();
  }
  return global[CAPABILITY_REGISTRY_KEY] as Map<string, TraitBehaviorBinding>;
}

const behaviorRegistry = {
  get size() { return getCapabilityRegistry().size; },
  has(key: string) { return getCapabilityRegistry().has(key); },
  get(key: string) { return getCapabilityRegistry().get(key); },
  set(key: string, value: TraitBehaviorBinding) { return getCapabilityRegistry().set(key, value); },
  delete(key: string) { return getCapabilityRegistry().delete(key); },
  clear() { return getCapabilityRegistry().clear(); },
  keys() { return getCapabilityRegistry().keys(); },
  values() { return getCapabilityRegistry().values(); },
  entries() { return getCapabilityRegistry().entries(); },
  [Symbol.iterator]() { return getCapabilityRegistry()[Symbol.iterator](); }
};

/**
 * Generate registry key for trait+capability combination.
 */
function registryKey(traitType: string, capability: string): string {
  return `${traitType}:${capability}`;
}

/**
 * Register a behavior for a trait+capability combination.
 *
 * Stories call this to register their behaviors during initialization.
 * Each trait+capability pair can only have one behavior registered.
 *
 * @param traitType - The trait type identifier (e.g., 'dungeo.trait.basket_elevator')
 * @param capability - The action ID (e.g., 'if.action.lowering')
 * @param behavior - The behavior implementation
 * @param options - Optional configuration (priority, resolution override, mode override)
 *
 * @example
 * ```typescript
 * // Basic registration (uses global defaults)
 * registerCapabilityBehavior(
 *   BasketElevatorTrait.type,
 *   'if.action.lowering',
 *   BasketLoweringBehavior
 * );
 *
 * // With priority and overrides
 * registerCapabilityBehavior(
 *   TrollAxeTrait.type,
 *   'if.action.taking',
 *   TrollAxeTakingBehavior,
 *   { priority: 100, resolution: 'any-blocks' }
 * );
 * ```
 */
export function registerCapabilityBehavior<T extends ITrait>(
  traitType: string,
  capability: string,
  behavior: CapabilityBehavior,
  options?: BehaviorRegistrationOptions<T>
): void {
  const key = registryKey(traitType, capability);

  if (behaviorRegistry.has(key)) {
    throw new Error(
      `Behavior already registered for trait "${traitType}" and capability "${capability}"`
    );
  }

  behaviorRegistry.set(key, {
    traitType,
    capability,
    behavior,
    priority: options?.priority ?? 0,
    resolution: options?.resolution,
    mode: options?.mode,
    validateBinding: options?.validateBinding as ((trait: ITrait) => boolean) | undefined
  });
}

/**
 * Get behavior for a trait instance and capability.
 *
 * Called by capability-dispatch actions to find the right behavior.
 *
 * @param trait - The trait instance
 * @param capability - The action ID
 * @returns The behavior, or undefined if not registered
 */
export function getBehaviorForCapability(
  trait: ITrait,
  capability: string
): CapabilityBehavior | undefined {
  const binding = getBehaviorBinding(trait, capability);
  return binding?.behavior;
}

/**
 * Get the full binding for a trait instance and capability.
 *
 * Includes priority and configuration overrides. Used by dispatch helper
 * for resolution logic.
 *
 * @param trait - The trait instance
 * @param capability - The action ID
 * @returns The binding, or undefined if not registered
 */
export function getBehaviorBinding(
  trait: ITrait,
  capability: string
): TraitBehaviorBinding | undefined {
  const traitType = (trait.constructor as ITraitConstructor).type;
  const key = registryKey(traitType, capability);
  const binding = behaviorRegistry.get(key);

  if (!binding) {
    return undefined;
  }

  // Runtime validation if provided
  if (binding.validateBinding && !binding.validateBinding(trait)) {
    throw new Error(
      `Behavior validation failed for trait "${traitType}", capability "${capability}"`
    );
  }

  return binding;
}

/**
 * Check if a behavior is registered for a trait+capability.
 *
 * @param traitType - The trait type identifier
 * @param capability - The action ID
 */
export function hasCapabilityBehavior(traitType: string, capability: string): boolean {
  return behaviorRegistry.has(registryKey(traitType, capability));
}

/**
 * Unregister a behavior (primarily for testing).
 *
 * @param traitType - The trait type identifier
 * @param capability - The action ID
 */
export function unregisterCapabilityBehavior(traitType: string, capability: string): void {
  behaviorRegistry.delete(registryKey(traitType, capability));
}

/**
 * Clear all registered behaviors (for testing).
 */
export function clearCapabilityRegistry(): void {
  behaviorRegistry.clear();
}

/**
 * Get all registered bindings (for debugging/introspection).
 */
export function getAllCapabilityBindings(): Map<string, TraitBehaviorBinding> {
  return new Map(getCapabilityRegistry());
}
