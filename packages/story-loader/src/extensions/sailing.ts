/**
 * sailing.ts — the `use sailing` registry entry.
 *
 * One moment. `gatedConstruct` names a sailing vehicle or a wind written
 * without the `use` line, the backstop every entry carries behind the
 * analyzer's own gate. The runtime parts are not here: the loader lowers a
 * `sailing` block and `sails:` onto the vehicle's open model and `wind:`
 * onto the expanse, and the vehicle machine plays them.
 *
 * Public interface: SAILING_EXTENSION.
 * Owner context: @sharpee/story-loader (language-neutral IR consumer).
 *
 * References:
 * - ADR-375 D1 — `use sailing` turns the extension on; it builds on `use expanses`.
 * - ADR-375 D4, D5, D7 — the wind, the sailing block and sails this entry gates.
 */
import type { ExtensionRegistration } from '../extension-registry.js';

export const SAILING_EXTENSION: ExtensionRegistration = {
  gatedConstruct: (ir) => {
    const first = ir.entities.find((e) => e.expanse?.wind !== undefined || e.vehicle?.sailing !== undefined || e.vehicle?.sails !== undefined);
    return first ? { construct: first.expanse ? 'wind:' : first.vehicle?.sailing ? 'a `sailing` block' : 'sails:', span: first.span } : null;
  },
};
