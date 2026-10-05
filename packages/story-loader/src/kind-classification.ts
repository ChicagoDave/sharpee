/**
 * kind-classification.ts — whether an entity classifies as a kind (`is a thing`).
 *
 * Purpose: the one rule both classification sites share — the evaluator's
 * `is a` / `must be a` and the character arbiter's kind scopes
 * (`isKindMember`). The IR records each entity's own kind; classification
 * widens only `thing`, the parent of every kind but `room` and `region`
 * (ADR-359 D1).
 *
 * Public interface: classifiesAs.
 * Owner context: @sharpee/story-loader (runtime reading of the Story IR).
 */
import type { IREntity } from '@sharpee/chord';

/** The kinds that are places, not things. */
const NOT_THINGS: ReadonlySet<string> = new Set(['room', 'region']);

/**
 * Whether an entity classifies as the named kind.
 *
 * @param irEntity the entity's IR record
 * @param classifier the word after `is a` (`thing`, `container`, `servant`)
 * @returns true when the entity records that kind, or when the classifier is
 *   `thing` and the entity is neither a room nor a region
 */
export function classifiesAs(irEntity: IREntity, classifier: string): boolean {
  if (classifier === 'thing') {
    return !irEntity.kinds.some((k) => NOT_THINGS.has(k.name));
  }
  return irEntity.kinds.some((k) => k.name === classifier);
}
