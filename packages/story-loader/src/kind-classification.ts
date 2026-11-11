/**
 * kind-classification.ts — whether an entity classifies as a kind or a story trait (`is a thing`, `is a treasure`).
 *
 * Purpose: the one rule both classification sites share — the evaluator's
 * `is a` / `must be a` and the character arbiter's kind scopes
 * (`isKindMember`). A classifier is a kind noun or a story `define trait`
 * name. The IR records each entity's own kind and the traits its block
 * composes; classification widens `thing` to every kind but `room` and
 * `region`, and a story trait classifies exactly the entities that compose
 * it. A conditionally composed trait (`<trait> while <condition>`)
 * classifies by declaration, whatever its condition says now: what sort of
 * thing an entity is does not change with the turn, as its kind does not.
 * Platform trait adjectives (`scenery`) are not classifiers; the compiler
 * refuses them after `is a`.
 *
 * Public interface: classifiesAs.
 * Owner context: @sharpee/story-loader (runtime reading of the Story IR).
 *
 * References:
 * - ADR-359 D1 — every entity names its kind; `thing` is the parent kind.
 * - ADR-394 D1 — a story trait classifies (supersedes ADR-359 D1's "widens only `thing`").
 */
import type { IREntity } from '@sharpee/chord';

/** The kinds that are places, not things. */
const NOT_THINGS: ReadonlySet<string> = new Set(['room', 'region']);

/**
 * Whether an entity classifies as the named kind or story trait.
 *
 * @param irEntity the entity's IR record
 * @param classifier the word after `is a` (`thing`, `container`, `treasure`)
 * @param storyTraits the names of the story's `define trait` declarations
 * @returns true when the entity records that kind; when the classifier is
 *   `thing` and the entity is neither a room nor a region; or when the
 *   classifier names a story trait the entity's block composes
 */
export function classifiesAs(irEntity: IREntity, classifier: string, storyTraits: ReadonlySet<string>): boolean {
  if (classifier === 'thing') {
    return !irEntity.kinds.some((k) => NOT_THINGS.has(k.name));
  }
  if (irEntity.kinds.some((k) => k.name === classifier)) return true;
  return storyTraits.has(classifier) && irEntity.traits.some((t) => t.name === classifier);
}
