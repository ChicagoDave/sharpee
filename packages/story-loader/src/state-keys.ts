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

/**
 * Named-turn timers (ADR-325 D3g): `chord.timer.<qualified>` holds the
 * timer's record (`TimerRecord`), ordinary world state so save/restore
 * carries a timer mid-run.
 */
export const CHORD_TIMER_PREFIX = 'chord.timer.';

/** The world-state key for a timer, by its IR `qualified` key. */
export function timerKey(qualified: string): string {
  return `${CHORD_TIMER_PREFIX}${qualified}`;
}

/**
 * A timer's position. `idle` = not started (or reset); `running` steps one
 * named turn per turn; `stopped` holds; `expired` is over. `index` counts
 * steps taken since start (0 = started, no named turn yet; n = the n-th
 * named turn). `startedTurn` keeps a timer started on turn T from stepping
 * before T+1.
 */
export interface TimerRecord {
  phase: 'idle' | 'running' | 'stopped' | 'expired';
  index: number;
  startedTurn: number;
}

/**
 * A region's landing (ADR-325 D5): `chord.landing.<region-ir-id>`. Absent
 * until first read or first `set`; the loader seeds it from the IR then.
 */
export const CHORD_LANDING_PREFIX = 'chord.landing.';

/** The world-state key for a region's landing record. */
export function landingKey(regionIrId: string): string {
  return `${CHORD_LANDING_PREFIX}${regionIrId}`;
}

/**
 * A landing's live state. `rooms` are WORLD ids (a `set` replaces the whole
 * list with one); `cursor` is the cycling/stopping position; `seed` is the
 * region's own random stream (ADR-293: derived from the story seed, so a
 * fixed seed yields a byte-identical sequence per region).
 */
export interface LandingRecord {
  rooms: string[];
  cursor: number;
  seed: number;
}

export const CHORD_ADJACENT_PREFIX = 'chord.adjacent.';

/** The world-state key for a mover's adjacent-room draw record (ADR-326 D2). */
export function adjacentKey(moverIrId: string): string {
  return `${CHORD_ADJACENT_PREFIX}${moverIrId}`;
}

/**
 * A mover's adjacent-room draw state (ADR-326 D2): only the stream `seed`
 * persists — the candidate set is recomputed at every draw from the live
 * exits, so nothing else is worth storing. Derived from the story seed
 * folded with the mover's IR id, so two movers never share a sequence.
 */
export interface AdjacentRecord {
  seed: number;
}
