/**
 * Entity Annotations (ADR-124)
 *
 * Presentation metadata attached to entities. Annotations are separate from
 * traits — they carry UI hints that the engine ignores and clients interpret.
 */

/**
 * A single annotation on an entity.
 * Annotations are keyed by kind (e.g., 'illustration', 'portrait', 'voice').
 */
export interface Annotation {
  /** The annotation kind — groups annotations by purpose */
  kind: string;
  /** Unique identifier within entity+kind */
  id: string;
  /** Kind-specific payload (clients interpret this) */
  data: Record<string, unknown>;
  /** Optional condition — when absent, annotation is always active */
  condition?: AnnotationCondition;
}

/**
 * Pure-data condition evaluated against trait state.
 * No callbacks — serializable and evaluable at any time.
 */
export interface AnnotationCondition {
  /** Trait type to check (e.g., 'switchable', 'custom') */
  trait: string;
  /** Property name on the trait */
  property: string;
  /** Expected value (strict equality) */
  value: unknown;
  /** Which entity to check: self (default), player, or location */
  scope?: 'self' | 'player' | 'location';
}
