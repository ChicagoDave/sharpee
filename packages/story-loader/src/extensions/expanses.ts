/**
 * expanses.ts — the `use expanses` registry entry.
 *
 * One moment today. `gatedConstruct` names an expanse or an `open` vehicle
 * written without the `use` line, the backstop every entry carries behind
 * the analyzer's own gate. The runtime parts live where every vehicle's do:
 * the loader lowers the expanse, the open model, `floats` and `sight:`
 * (`wireExpanse`, `wireVehicle`, `applyTraitAdjectives`), the core
 * state-machine plugin steps and drifts, the evaluator reads sight.
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
