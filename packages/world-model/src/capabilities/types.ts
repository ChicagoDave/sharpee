/**
 * Capability dispatch types (ADR-090)
 *
 * Types for entity-centric action dispatch where traits declare
 * which verbs/actions they respond to.
 */

/**
 * Result from capability behavior validation.
 * Mirrors stdlib's ValidationResult for consistency.
 */
export interface CapabilityValidationResult {
  /** Whether the behavior can execute */
  valid: boolean;
  /** Error code if validation failed (for message lookup) */
  error?: string;
  /** Additional context for error messages */
  params?: Record<string, any>;
  /** Data to pass to execute/report phases */
  data?: Record<string, any>;
}

/**
 * Effect returned by capability behaviors.
 * Simplified version - actual emit() is in event-processor.
 */
export interface CapabilityEffect {
  /** Event type (e.g., 'if.event.lowered', 'action.blocked') */
  type: string;
  /** Event payload */
  payload: Record<string, any>;
}

/**
 * Helper to create effects (mirrors event-processor's emit)
 */
export function createEffect(type: string, payload: Record<string, any>): CapabilityEffect {
  return { type, payload };
}
