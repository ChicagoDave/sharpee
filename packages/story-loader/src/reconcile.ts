/**
 * reconcile.ts — the pure half of the restore reconciler (ADR-388 D5).
 *
 * Purpose: when a save's identity stamp differs from the installed story's,
 * the loader reconciles the restored world against the story's identity
 * manifest instead of trusting it. The decisions that need no world — which
 * persisted keys the current manifest declares no identity for, which stored
 * values name nothing the manifest declares, and what a re-seeded landing
 * record becomes — live here as functions over the manifest and a key
 * reader, so they are tested without an engine. The loader (`ChordStory`)
 * owns the mutating half: building what is new and writing what changed.
 *
 * Invariants: a key is dropped only when its identity is absent from the
 * manifest's own family; a key under a family this file does not know is
 * never touched; a stored value the manifest does not declare is reported
 * and left, never coerced to a nearest match. Every function is pure.
 *
 * Public interface: orphanedKeys, unmappableValues, reseedLandingRecord.
 * Owner context: @sharpee/story-loader.
 */
import type { IRIdentity } from '@sharpee/chord';
import type { IRestoreReconciliation } from '@sharpee/core';
import { CHAPTER_CURRENT_KEY, CHAPTER_FIRED_PREFIX } from '@sharpee/ext-chapters';
import {
  CHORD_ADJACENT_PREFIX,
  CHORD_CLAUSE_OCCURRENCE_PREFIX,
  CHORD_COUNTER_PREFIX,
  CHORD_LANDING_PREFIX,
  CHORD_SELECT_PREFIX,
  CHORD_STATE_PREFIX,
  CHORD_STORY_STATE_KEY,
  CHORD_TIMER_PREFIX,
  timerKey,
  type LandingRecord,
  type TimerRecord,
} from './state-keys.js';

/** One stored value the manifest does not declare. */
export type Unmappable = IRestoreReconciliation['unmappable'][number];

/** The manifest's identities as sets, for the membership tests below. */
function families(identity: IRIdentity) {
  return {
    entities: new Set(identity.entities.map((e) => e.id)),
    clauses: identity.clauses.map((c) => c.id),
    selects: identity.selects,
    counters: new Set(identity.counters.map((c) => (c.owner === null ? c.name : `${c.owner}.${c.name}`))),
    timers: new Set(identity.timers.map((t) => t.qualified)),
    landings: new Set(identity.landings.map((l) => l.region)),
    chapters: new Set(identity.chapters),
  };
}

/**
 * Whether `rest` is one of `ids`, or `<owner>.<id>` with `owner` a manifest
 * entity — the per-carrier spelling of a trait clause's counter and the
 * per-owner spelling of a select's.
 */
function isOwnedId(rest: string, ids: readonly string[], entities: Set<string>, ownerFirst: boolean): boolean {
  if (ids.includes(rest)) return true;
  return ids.some((id) =>
    ownerFirst
      ? rest.endsWith(`.${id}`) && entities.has(rest.slice(0, rest.length - id.length - 1))
      : rest.startsWith(`${id}.`) && entities.has(rest.slice(id.length + 1)),
  );
}

/**
 * The persisted keys the current manifest declares no identity for — the
 * general form of ADR-289 D2's retired-key sweep. A key under a family this
 * reconciler does not know (visited facts, conversation threads, the RNG
 * cursor) is left alone.
 *
 * @param identity the current story's manifest
 * @param keys every world-state key
 * @returns the keys to remove, in the order given
 */
export function orphanedKeys(identity: IRIdentity, keys: readonly string[]): string[] {
  const f = families(identity);
  const orphaned: string[] = [];
  for (const key of keys) {
    let keep = true;
    if (key.startsWith(CHORD_STATE_PREFIX)) keep = f.entities.has(key.slice(CHORD_STATE_PREFIX.length));
    else if (key.startsWith(CHORD_CLAUSE_OCCURRENCE_PREFIX)) keep = isOwnedId(key.slice(CHORD_CLAUSE_OCCURRENCE_PREFIX.length), f.clauses, f.entities, true);
    else if (key.startsWith(CHORD_SELECT_PREFIX)) keep = isOwnedId(key.slice(CHORD_SELECT_PREFIX.length), f.selects, f.entities, false);
    else if (key.startsWith(CHORD_COUNTER_PREFIX)) keep = f.counters.has(key.slice(CHORD_COUNTER_PREFIX.length));
    else if (key.startsWith(CHORD_TIMER_PREFIX)) keep = f.timers.has(key.slice(CHORD_TIMER_PREFIX.length));
    else if (key.startsWith(CHORD_LANDING_PREFIX)) keep = f.landings.has(key.slice(CHORD_LANDING_PREFIX.length));
    else if (key.startsWith(CHORD_ADJACENT_PREFIX)) keep = f.entities.has(key.slice(CHORD_ADJACENT_PREFIX.length));
    else if (key.startsWith(CHAPTER_FIRED_PREFIX)) keep = f.chapters.has(key.slice(CHAPTER_FIRED_PREFIX.length));
    if (!keep) orphaned.push(key);
  }
  return orphaned;
}

/**
 * Stored values that name nothing the current manifest declares: the
 * current chapter, a timer's turn, an entity's state word, the story's
 * state. Each is reported with the key, the saved value and what the story
 * declares, and left exactly as it was (D5 rule 4).
 *
 * @param identity the current story's manifest
 * @param storyStates the story object's declared states, in order
 * @param read the world-state reader
 * @returns the unmappable values, in manifest order
 */
export function unmappableValues(identity: IRIdentity, storyStates: readonly string[], read: (key: string) => unknown): Unmappable[] {
  const out: Unmappable[] = [];
  const chapter = read(CHAPTER_CURRENT_KEY);
  if (typeof chapter === 'string' && !identity.chapters.includes(chapter)) {
    out.push({ key: CHAPTER_CURRENT_KEY, saved: chapter, declared: [...identity.chapters] });
  }
  const storyState = read(CHORD_STORY_STATE_KEY);
  if (typeof storyState === 'string' && !storyStates.includes(storyState)) {
    out.push({ key: CHORD_STORY_STATE_KEY, saved: storyState, declared: [...storyStates] });
  }
  for (const entity of identity.entities) {
    const key = CHORD_STATE_PREFIX + entity.id;
    const state = read(key);
    if (typeof state === 'string' && !entity.states.includes(state)) {
      out.push({ key, saved: state, declared: [...entity.states] });
    }
  }
  for (const timer of identity.timers) {
    const key = timerKey(timer.qualified);
    const record = read(key) as TimerRecord | undefined;
    if (record && typeof record.turn === 'string' && !timer.turns.includes(record.turn)) {
      out.push({ key, saved: record.turn, declared: [...timer.turns] });
    }
  }
  return out;
}

/**
 * The landing record re-seeded from the current story's room list (D5 rule
 * 3): rooms replaced, cursor clamped to the new length, seed kept.
 *
 * @param record the stored record, which must not be `authored`
 * @param rooms the current story's landing rooms as world ids
 * @returns the new record, or undefined when the stored list already matches
 */
export function reseedLandingRecord(record: LandingRecord, rooms: readonly string[]): LandingRecord | undefined {
  if (record.rooms.length === rooms.length && record.rooms.every((id, i) => id === rooms[i])) return undefined;
  const cursor = rooms.length === 0 ? 0 : Math.min(record.cursor, rooms.length - 1);
  return { ...record, rooms: [...rooms], cursor };
}
