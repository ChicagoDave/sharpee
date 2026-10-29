/**
 * state-keys.ts — namespaced world-state keys the loader owns.
 *
 * Purpose: the loader materializes Chord state (entity states, occurrence
 * counters, the RNG cursor) as ordinary world state so save/restore/undo
 * cover it with no author-written persistence (AC-6). Keys are
 * loader-internal and invisible to authors (design.md §5.5).
 *
 * Invariant: a key, and every positional field inside a record, is derived
 * from a name the author wrote or from content — an entity id, a state
 * word, a clause's head, a timer's turn name — never from a position in a
 * list the author edits. A save written before a story edit must still
 * mean what it meant.
 *
 * Public interface: the key constants and prefix builders.
 * Owner context: @sharpee/story-loader.
 *
 * References:
 * - ADR-388 D1 — the invariant above; D2 — clause and select identity;
 *   D3 — chapter, timer and landing records.
 * - ADR-289 D2 — the select id is compiler-assigned and never bare digits.
 */

/** `states:` — current state per entity: `chord.state.<ir-entity-id>`. */
export const CHORD_STATE_PREFIX = 'chord.state.';

/**
 * The entity attribute the loader stamps with the IR entity id (GH #355):
 * a consumer holding only the world — the tree-document runner — reads
 * `attributes[CHORD_IR_ID_ATTRIBUTE]` to reach `chord.state.<ir-entity-id>`.
 */
export const CHORD_IR_ID_ATTRIBUTE = 'chordIrId';

/** Rule/on-clause occurrence counters (ordinals): `chord.occurrence.<key>`. */
export const CHORD_OCCURRENCE_PREFIX = 'chord.occurrence.';

/**
 * An `on`/`after` clause's firing counter: `chord.occurrence.clause.<clause-id>`
 * for a clause an entity or the story owns, and
 * `chord.occurrence.clause.<carrier-ir-id>.<clause-id>` for a trait's clause
 * as composed by one carrier (a trait clause counts per carrier). The
 * clause id is the compiler's (ADR-388 D2): the owner and the head, with
 * `#n` only among identical heads — `troll.on-attacking-by-player`,
 * `trait.glowing.on-rubbing`, `story.on-every-turn#2`. One key for every
 * firing site — the every-turn daemons, the verb interceptors, the
 * dispatch-verb capabilities, the event clauses and the timer-side `after`
 * clauses — so that the derived rule test's arrange step and the assertion
 * core can name the same counter from the clause's head alone (ADR-356 D2,
 * occurrence ordinals). The assertion core composes it from this prefix
 * and never imports the function.
 */
export const CHORD_CLAUSE_OCCURRENCE_PREFIX = `${CHORD_OCCURRENCE_PREFIX}clause.`;

/**
 * The firing-counter key of one `on`/`after` clause.
 *
 * @param clauseId the clause's compiler-assigned id (`IROnClause.id`)
 * @param carrierIrId the composing entity's IR id, for a trait's clause only
 * @returns the world-state key
 */
export function clauseOccurrenceKey(clauseId: string, carrierIrId?: string): string {
  return `${CHORD_CLAUSE_OCCURRENCE_PREFIX}${carrierIrId === undefined ? '' : `${carrierIrId}.`}${clauseId}`;
}

/** The seeded-RNG cursor (persists the chance stream across save/restore). */
export const CHORD_RNG_KEY = 'chord.rng';

/** `define trait` runtime trait types: `chord.trait.<name>` (Phase B). */
export const CHORD_TRAIT_PREFIX = 'chord.trait.';

/** The story object's current phase (`states:` on the story header, D2). */
export const CHORD_STORY_STATE_KEY = 'chord.story.state';

/**
 * `chord.gone.<ir-id>` → `true` while a Chord `remove` has taken the entity
 * out of play (GH #345, ADR-325 Z6 as amended 2026-09-03). A gone entity
 * stays in the world offstage — conditions naming it evaluate, its states
 * read as last set, saves round-trip it — and the flag is what tells it
 * apart from an entity merely moved offstage. A later `move` back into the
 * world clears it.
 */
export const CHORD_GONE_PREFIX = 'chord.gone.';

/**
 * `chord.visited.<room-world-id>` → `true` once the player has ARRIVED in the
 * room — stamped by the arrival event on both paths, the walked one (`going`'s
 * actor-moved event) and the authored one (`move the player to …`), in the
 * same firing that runs the room's `after the player entering` clauses (GH
 * #368). The chapters plugin's `visits <room> for the first time` reads it,
 * so a row holds even when the room's own entering clause moves the player on
 * in the same turn. The start room is not an arrival: it is never stamped by
 * the start itself. Ordinary world state, so saves round-trip it.
 */
export const CHORD_VISITED_PREFIX = 'chord.visited.';

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
 * named turn per turn; `stopped` holds; `expired` is over. `turn` is the
 * named turn the timer is on, by the name the author wrote — `null` while
 * started and not yet stepped — so a turn inserted ahead of it in the
 * definition moves nothing (ADR-388 D3). `startedTurn` keeps a timer
 * started on turn T from stepping before T+1.
 */
export interface TimerRecord {
  phase: 'idle' | 'running' | 'stopped' | 'expired';
  turn: string | null;
  startedTurn: number;
}

/** A timer never started, or reset: what an absent record reads as. */
export const IDLE_TIMER_RECORD: Readonly<TimerRecord> = { phase: 'idle', turn: null, startedTurn: -1 };

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
 * fixed seed yields a byte-identical sequence per region). `authored` is
 * false while `rooms` is still the IR's own list and true once a `set`
 * replaced it — the restore reconciler re-seeds an un-authored list from
 * the current IR and leaves an authored one alone (ADR-388 D3, D5).
 */
export interface LandingRecord {
  rooms: string[];
  cursor: number;
  seed: number;
  authored: boolean;
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
