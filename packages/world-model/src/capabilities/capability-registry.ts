/**
 * Capability Registry (ADR-090)
 *
 * Registry for trait-behavior bindings. Stories register behaviors
 * for their traits, and the dispatch system looks them up at runtime.
 */

import { ITrait, ITraitConstructor } from '../traits/trait';
import { CapabilityBehavior } from './capability-behavior';

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
  /** Optional runtime validation */
  validateBinding?: (trait: T) => boolean;
}

/**
 * Registry storage: key = `${traitType}:${capability}`
 */
const behaviorRegistry = new Map<string, TraitBehaviorBinding>();

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
 * @param options - Optional configuration
 *
 * @example
 * ```typescript
 * registerCapabilityBehavior(
 *   BasketElevatorTrait.type,
 *   'if.action.lowering',
 *   BasketLoweringBehavior
 * );
 * ```
 */
export function registerCapabilityBehavior<T extends ITrait>(
  traitType: string,
  capability: string,
  behavior: CapabilityBehavior,
  options?: { validateBinding?: (trait: T) => boolean }
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

  return binding.behavior;
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
  return new Map(behaviorRegistry);
}
