/**
 * Trait-rehydrator hook (platform-issue-sweep Phase 5, 2026-07-20).
 *
 * `IFEntity.fromJSON` routes every serialized trait through this hook so
 * prototype accessors and methods (WearableTrait.isWorn,
 * ConcealmentTrait.supportsPosition, …) survive save/restore/undo — the old
 * raw-JSON rehydration silently lost them.
 *
 * The actual registry-backed rehydrator lives in `traits/implementations.ts`,
 * which registers itself here at module load. It is wired through this LEAF
 * module — never a static import from if-entity into implementations —
 * because implementations pulls in every trait class (including
 * ConcealedStateTrait → VisibilityBehavior → capabilities → world), which
 * would create module cycles (see `world-model/CLAUDE.md` on
 * circular-dependency CLI hangs; verified with madge: 9 → 28 chains with the
 * direct import).
 *
 * Default: identity (raw data) — the pre-fix behavior — so a bare harness
 * that imports if-entity without the package barrel still functions.
 *
 * Public interface: `setTraitRehydrator`, `rehydrateTraitData`.
 * Owner context: `@sharpee/world-model` — entities (serialization seam).
 */

import { ITrait } from '../traits/trait.js';

/** Rehydrates one serialized trait ({ type, ...own fields }) to a live trait. */
export type TraitRehydrator = (
  traitData: { type: string } & Record<string, unknown>
) => ITrait;

let current: TraitRehydrator = (traitData) => traitData as unknown as ITrait;

/**
 * Install the trait rehydrator (called by traits/implementations.ts at module
 * load; last-wins, matching the package's other registration seams).
 * @param fn the rehydrator to install
 */
export function setTraitRehydrator(fn: TraitRehydrator): void {
  current = fn;
}

/**
 * Rehydrate one serialized trait through the installed hook.
 * @param traitData a serialized trait ({ type, ...own fields })
 * @returns a live trait (prototype-restored for known core types)
 */
export function rehydrateTraitData(
  traitData: { type: string } & Record<string, unknown>
): ITrait {
  return current(traitData);
}
