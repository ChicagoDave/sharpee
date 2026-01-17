/**
 * Capability Defaults (ADR-090 Extension)
 *
 * Global configuration for how capabilities are resolved when multiple
 * entities claim the same capability. Stories can override per-registration.
 */

/**
 * Resolution strategy when multiple entities claim the same capability.
 */
export type CapabilityResolution =
  | 'first-wins'      // First entity with capability determines result
  | 'any-blocks'      // Any entity returning valid: false blocks
  | 'all-must-pass'   // All entities must return valid: true
  | 'highest-priority'; // Only highest priority entity is checked

/**
 * How the capability validation result affects the action.
 */
export type CapabilityMode =
  | 'blocking'  // Failed validation blocks the action
  | 'advisory'  // Result passed to action, doesn't auto-block
  | 'chain';    // All run in order, sharedData passed through

/**
 * Configuration for a capability.
 */
export interface CapabilityConfig {
  /** How to resolve multiple entities claiming this capability */
  resolution: CapabilityResolution;
  /** How validation result affects the action */
  mode: CapabilityMode;
}

/**
 * Default configuration used when no specific config is defined.
 */
const DEFAULT_CONFIG: CapabilityConfig = {
  resolution: 'first-wins',
  mode: 'blocking'
};

/**
 * Registry of capability configurations.
 */
const capabilityDefaults = new Map<string, CapabilityConfig>();

/**
 * Define default configuration for a capability.
 *
 * Called during platform or story initialization to set how a capability
 * should behave when multiple entities claim it.
 *
 * @param capabilityId - The capability ID (e.g., 'if.scope.visible', 'if.action.taking')
 * @param config - Partial config, missing values use defaults
 *
 * @example
 * ```typescript
 * // Visibility should block if ANY entity says it's hidden
 * defineCapabilityDefaults('if.scope.visible', {
 *   resolution: 'any-blocks',
 *   mode: 'blocking'
 * });
 * ```
 */
export function defineCapabilityDefaults(
  capabilityId: string,
  config: Partial<CapabilityConfig>
): void {
  capabilityDefaults.set(capabilityId, {
    resolution: config.resolution ?? DEFAULT_CONFIG.resolution,
    mode: config.mode ?? DEFAULT_CONFIG.mode
  });
}

/**
 * Get configuration for a capability.
 *
 * Returns the registered config or defaults if not registered.
 *
 * @param capabilityId - The capability ID
 * @returns The capability configuration
 */
export function getCapabilityConfig(capabilityId: string): CapabilityConfig {
  return capabilityDefaults.get(capabilityId) ?? { ...DEFAULT_CONFIG };
}

/**
 * Check if a capability has explicit defaults defined.
 *
 * @param capabilityId - The capability ID
 * @returns true if defaults have been defined
 */
export function hasCapabilityDefaults(capabilityId: string): boolean {
  return capabilityDefaults.has(capabilityId);
}

/**
 * Clear all capability defaults (for testing).
 */
export function clearCapabilityDefaults(): void {
  capabilityDefaults.clear();
}

/**
 * Get all defined capability defaults (for debugging/introspection).
 */
export function getAllCapabilityDefaults(): Map<string, CapabilityConfig> {
  return new Map(capabilityDefaults);
}
