/**
 * state-machines.ts — the CORE state-machines vocabulary manifest.
 *
 * Purpose: names the ADR-119 depth — the `define machine` construct
 * (named machines, onEnter/onExit, terminal states, role bindings,
 * triggered+guarded transitions) — as core vocabulary every story may
 * write with no `use` line, as NPCs are. Contributes no trait adjectives;
 * the construct is always admitted, and `use state-machines` is
 * `analysis.extension-core`. Chord's `states:`/`select`/`change` surface
 * was always unconditional and stays so.
 *
 * Public interface: STATE_MACHINES_MANIFEST.
 * Owner context: @sharpee/chord (language frontend; browser-safe).
 *
 * References:
 * - ADR-377 D1 — state machines are core; supersedes ADR-215's gate.
 * - ADR-215 Q4 — the precedent: NPC vocabulary is core.
 */
import type { ExtensionManifest } from './types.js';

export const STATE_MACHINES_MANIFEST: ExtensionManifest = {
  name: 'state-machines',
  core: true, // always on; `use state-machines` is a compile error, not a requirement
  traitAdjectives: [],
};
