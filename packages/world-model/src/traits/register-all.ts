// packages/world-model/src/traits/register-all.ts

/**
 * Register all built-in traits with the trait registry.
 * This should be called during application initialization.
 * 
 * Note: All traits are now available through the TRAIT_IMPLEMENTATIONS map
 * in implementations.ts. The registry pattern is optional and may be
 * removed in the future.
 */
export function registerAllTraits(): void {
  // All traits are now available through the TRAIT_IMPLEMENTATIONS map
  // Registration is optional and handled through the implementations map
  
  // TODO: Consider removing this file and the registry pattern entirely
  // as we're using the implementations map for trait lookup
}
