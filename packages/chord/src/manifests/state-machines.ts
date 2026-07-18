/**
 * state-machines.ts — the `use state-machines` manifest (ADR-215).
 *
 * Purpose: gates the ADR-119 DEPTH — the `define machine` construct
 * (named machines, onEnter/onExit, terminal states, role bindings,
 * triggered+guarded transitions). Contributes no trait adjectives; the
 * construct itself is the gated surface (`define machine` without the
 * `use` is a compile error). Chord's existing core `states:`/`select`/
 * `change` surface stays UNCONDITIONAL — gating it would break shipped
 * stories (ADR-215's hard invariant).
 *
 * Public interface: STATE_MACHINES_MANIFEST.
 * Owner context: @sharpee/chord (language frontend; browser-safe).
 */
import type { ExtensionManifest } from './types';

export const STATE_MACHINES_MANIFEST: ExtensionManifest = {
  name: 'state-machines',
  traitAdjectives: [],
};
