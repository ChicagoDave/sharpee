/**
 * state-keys.ts — namespaced world-state keys the loader owns.
 *
 * Purpose: the loader materializes Chord state (entity states, flags,
 * occurrence counters, the RNG cursor) as ordinary world state so
 * save/restore/undo cover it with no author-written persistence (AC-6).
 * Keys are loader-internal and invisible to authors (design.md §5.5).
 *
 * Public interface: the key constants and prefix builders.
 * Owner context: @sharpee/story-loader.
 */

/** `states:` — current state per entity: `chord.state.<ir-entity-id>`. */
export const CHORD_STATE_PREFIX = 'chord.state.';

/** `define flag` values: `chord.flag.<name>`. */
export const CHORD_FLAG_PREFIX = 'chord.flag.';

/** Rule/on-clause occurrence counters (ordinals): `chord.occurrence.<key>`. */
export const CHORD_OCCURRENCE_PREFIX = 'chord.occurrence.';

/** The seeded-RNG cursor (persists the chance stream across save/restore). */
export const CHORD_RNG_KEY = 'chord.rng';

/** `define trait` runtime trait types: `chord.trait.<name>` (Phase B). */
export const CHORD_TRAIT_PREFIX = 'chord.trait.';

/** The story object's current phase (`states:` on the story header, D2). */
export const CHORD_STORY_STATE_KEY = 'chord.story.state';
