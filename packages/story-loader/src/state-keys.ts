/**
 * state-keys.ts — namespaced world-state keys the loader owns.
 *
 * Purpose: the loader materializes Chord state (entity states, occurrence
 * counters, the RNG cursor) as ordinary world state so save/restore/undo
 * cover it with no author-written persistence (AC-6). Keys are
 * loader-internal and invisible to authors (design.md §5.5) — and
 * off-limits to TS hatches (hatch legitimacy rule, design.md §5.6).
 *
 * Public interface: the key constants and prefix builders.
 * Owner context: @sharpee/story-loader.
 */

/** `states:` — current state per entity: `chord.state.<ir-entity-id>`. */
export const CHORD_STATE_PREFIX = 'chord.state.';

/** Rule/on-clause occurrence counters (ordinals): `chord.occurrence.<key>`. */
export const CHORD_OCCURRENCE_PREFIX = 'chord.occurrence.';

/** The seeded-RNG cursor (persists the chance stream across save/restore). */
export const CHORD_RNG_KEY = 'chord.rng';

/** `define trait` runtime trait types: `chord.trait.<name>` (Phase B). */
export const CHORD_TRAIT_PREFIX = 'chord.trait.';

/** The story object's current phase (`states:` on the story header, D2). */
export const CHORD_STORY_STATE_KEY = 'chord.story.state';

/**
 * Numeric counters (ADR-264): story-global as `chord.counter.<name>`, per-entity
 * as `chord.counter.<ir-entity-id>.<name>`. Ordinary world state, so save/restore
 * covers each independently.
 */
export const CHORD_COUNTER_PREFIX = 'chord.counter.';

/** The world-state key for a counter (story-global when `ownerId` is omitted). */
export function counterKey(name: string, ownerId?: string): string {
  return ownerId ? `${CHORD_COUNTER_PREFIX}${ownerId}.${name}` : `${CHORD_COUNTER_PREFIX}${name}`;
}

/** Prefix for a `select-strategy`'s persisted occurrence counter (ADR-289 D2). */
export const CHORD_SELECT_PREFIX = `${CHORD_OCCURRENCE_PREFIX}select.`;

/**
 * The world-state key for one `select-strategy`'s occurrence counter.
 *
 * `id` is the compiler-assigned statement id (ADR-289 D2). `ownerIrId` is
 * supplied only where the executing owner varies at runtime — a trait clause
 * is one piece of IR shared by every composing entity, so each needs its own
 * counter, the same way phrase `Choice` atoms key per `(entityId, messageKey)`.
 *
 * The compiler id is deliberately a strict PREFIX of every per-owner key, so
 * "all counters for this statement" stays addressable by prefix for tooling
 * and sweeps.
 *
 * @param id        compiler-assigned select id, never bare digits
 * @param ownerIrId composing entity, for trait-owned selects only
 */
export function selectOccurrenceKey(id: string, ownerIrId?: string): string {
  return ownerIrId ? `${CHORD_SELECT_PREFIX}${id}.${ownerIrId}` : `${CHORD_SELECT_PREFIX}${id}`;
}

/**
 * The retired line-number key space (`chord.occurrence.select.<line>`), swept
 * on load and restore (ADR-289 D2).
 *
 * Matches bare digits ONLY. It must never be widened to a
 * `chord.occurrence.select.*` glob: that prefix is also the *new* key space,
 * and a glob would delete the live counters the sweep exists to protect. The
 * reserved bare-digits id shape is what keeps the two distinguishable forever.
 */
export const RETIRED_SELECT_KEY = /^chord\.occurrence\.select\.\d+$/;
