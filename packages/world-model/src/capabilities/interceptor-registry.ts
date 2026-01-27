/**
 * Interceptor Registry (ADR-118)
 *
 * Registry for trait-interceptor bindings. Stories register interceptors
 * for their traits, and stdlib actions look them up at runtime.
 *
 * Mirrors capability-registry.ts pattern but for interceptors instead
 * of full-delegation behaviors.
 */

import { ITrait, ITraitConstructor } from '../traits/trait';
import { ActionInterceptor } from './action-interceptor';

/**
 * Options for registering an action interceptor.
 */
export interface InterceptorRegistrationOptions {
  /** Priority for resolution (higher = checked first). Default: 0 */
  priority?: number;
}

/**
 * Binding between a trait type, action, and interceptor.
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
 * Registry storage: key = `${traitType}:${actionId}`
 * Uses globalThis to ensure the registry is shared across module boundaries
 * (e.g., when story modules import from packages but actions run from bundle)
 */
const INTERCEPTOR_REGISTRY_KEY = '__sharpee_interceptor_registry__';

// Use globalThis to share registry across module instances
function getInterceptorRegistry(): Map<string, TraitInterceptorBinding> {
  const global = globalThis as Record<string, unknown>;
  if (!global[INTERCEPTOR_REGISTRY_KEY]) {
    global[INTERCEPTOR_REGISTRY_KEY] = new Map<string, TraitInterceptorBinding>();
  }
  return global[INTERCEPTOR_REGISTRY_KEY] as Map<string, TraitInterceptorBinding>;
}

// For backwards compatibility, expose as const (but delegates to globalThis)
const interceptorRegistry = {
  get size() { return getInterceptorRegistry().size; },
  has(key: string) { return getInterceptorRegistry().has(key); },
  get(key: string) { return getInterceptorRegistry().get(key); },
  set(key: string, value: TraitInterceptorBinding) { return getInterceptorRegistry().set(key, value); },
  delete(key: string) { return getInterceptorRegistry().delete(key); },
  clear() { return getInterceptorRegistry().clear(); },
  keys() { return getInterceptorRegistry().keys(); },
  values() { return getInterceptorRegistry().values(); },
  entries() { return getInterceptorRegistry().entries(); },
  [Symbol.iterator]() { return getInterceptorRegistry()[Symbol.iterator](); }
};

/**
 * Generate registry key for trait+action combination.
 */
function registryKey(traitType: string, actionId: string): string {
  return `${traitType}:${actionId}`;
}

/**
 * Register an interceptor for a trait+action combination.
 *
 * Stories call this to register their interceptors during initialization.
 * Each trait+action pair can only have one interceptor registered.
 *
 * @param traitType - The trait type identifier (e.g., 'dungeo.trait.inflatable')
 * @param actionId - The action ID (e.g., 'if.action.entering')
 * @param interceptor - The interceptor implementation
 * @param options - Optional configuration (priority)
 *
 * @example
 * ```typescript
 * // Register boat puncture interceptor
 * registerActionInterceptor(
 *   InflatableTrait.type,
 *   'if.action.entering',
 *   InflatableEnteringInterceptor
 * );
 *
 * // With priority
 * registerActionInterceptor(
 *   TrollGuardianTrait.type,
 *   'if.action.going',
 *   TrollGoingInterceptor,
 *   { priority: 100 }
 * );
 * ```
 */
export function registerActionInterceptor(
  traitType: string,
  actionId: string,
  interceptor: ActionInterceptor,
  options?: InterceptorRegistrationOptions
): void {
  const key = registryKey(traitType, actionId);

  if (interceptorRegistry.has(key)) {
    throw new Error(
      `Interceptor already registered for trait "${traitType}" and action "${actionId}"`
    );
  }

  interceptorRegistry.set(key, {
    traitType,
    actionId,
    interceptor,
    priority: options?.priority ?? 0
  });
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
 * Get interceptor for an entity and action.
 *
 * Finds a trait on the entity that has an interceptor registered for
 * the given action. Looks up by trait type string in the registry.
 *
 * @param entity - The entity to check
 * @param actionId - The action ID
 * @returns The interceptor and trait, or undefined if not found
 *
 * @example
 * ```typescript
 * const result = getInterceptorForAction(boat, 'if.action.entering');
 * if (result) {
 *   const { interceptor, trait, binding } = result;
 *   // Call interceptor hooks during action execution
 * }
 * ```
 */
export function getInterceptorForAction(
  entity: { traits: Map<string, ITrait> },
  actionId: string
): InterceptorLookupResult | undefined {
  // Find all traits that have an interceptor registered for this action
  const candidates: Array<{ trait: ITrait; binding: TraitInterceptorBinding }> = [];

  for (const trait of entity.traits.values()) {
    // Look up interceptor by trait type string (more reliable than static property)
    const traitType = trait.type;
    const key = registryKey(traitType, actionId);
    const binding = interceptorRegistry.get(key);

    if (binding) {
      candidates.push({ trait, binding });
    }
  }

  if (candidates.length === 0) {
    return undefined;
  }

  // Sort by priority (highest first) and return the first one
  candidates.sort((a, b) => b.binding.priority - a.binding.priority);

  const { trait, binding } = candidates[0];
  return {
    interceptor: binding.interceptor,
    trait,
    binding
  };
}

/**
 * Get the interceptor binding for a trait type and action.
 *
 * @param traitType - The trait type identifier
 * @param actionId - The action ID
 * @returns The binding, or undefined if not registered
 */
export function getInterceptorBinding(
  traitType: string,
  actionId: string
): TraitInterceptorBinding | undefined {
  return interceptorRegistry.get(registryKey(traitType, actionId));
}

/**
 * Check if an interceptor is registered for a trait+action.
 *
 * @param traitType - The trait type identifier
 * @param actionId - The action ID
 */
export function hasActionInterceptor(traitType: string, actionId: string): boolean {
  return interceptorRegistry.has(registryKey(traitType, actionId));
}

/**
 * Unregister an interceptor (primarily for testing).
 *
 * @param traitType - The trait type identifier
 * @param actionId - The action ID
 */
export function unregisterActionInterceptor(traitType: string, actionId: string): void {
  interceptorRegistry.delete(registryKey(traitType, actionId));
}

/**
 * Clear all registered interceptors (for testing).
 */
export function clearInterceptorRegistry(): void {
  interceptorRegistry.clear();
}

/**
 * Get all registered interceptor bindings (for debugging/introspection).
 */
export function getAllInterceptorBindings(): Map<string, TraitInterceptorBinding> {
  return new Map(interceptorRegistry);
}
