/**
 * expanses.ts — the `use expanses` registry entry.
 *
 * One moment today. `gatedConstruct` names an expanse or an `open` vehicle
 * written without the `use` line, the backstop every entry carries behind
 * the analyzer's own gate. The runtime parts — the expanse and floating
 * traits, the open model's stepping, drift, sight as scope — are the
 * expanse runtime's, and until they land the loader refuses an `open`
 * vehicle by name at wiring rather than playing it fixed in place.
 *
 * Public interface: EXPANSES_EXTENSION.
 * Owner context: @sharpee/story-loader (language-neutral IR consumer).
 *
 * References:
 * - ADR-376 D1 — `use expanses` turns the extension on.
 * - ADR-376 D2, D3 — the expanse kind and `movement: open` this entry gates.
 * - Chord 4.0 plan Phase 13, Slices 2–4 — where the runtime arrives.
 */
import type { ExtensionRegistration } from '../extension-registry.js';

export const EXPANSES_EXTENSION: ExtensionRegistration = {
  gatedConstruct: (ir) => {
    const first = ir.entities.find((e) => e.expanse !== undefined || e.vehicle?.movement === 'open');
    return first ? { construct: first.expanse ? 'an expanse' : 'movement: open', span: first.span } : null;
  },
};
