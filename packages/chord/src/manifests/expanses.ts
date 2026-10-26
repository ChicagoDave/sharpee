/**
 * expanses.ts — the `use expanses` manifest.
 *
 * Purpose: gates the expanse extension behind one header line — the
 * `expanse` kind (a bounded space with coordinates), the `open` movement
 * type (a vehicle with a position in an expanse), the `floats` adjective (a
 * thing with coordinates of its own that drifts), and with them the lines,
 * placement tail, command set, statements and conditions the analyzer admits
 * only when the line is written. It is the first manifest to contribute a
 * kind noun and a movement type.
 *
 * Public interface: EXPANSES_MANIFEST.
 * Owner context: @sharpee/chord (language frontend; browser-safe).
 *
 * References:
 * - ADR-376 D1 — `use expanses` turns the extension on.
 * - ADR-376 D2 — `expanse` is a kind; D3 — `movement: open`; D10 — `floats`.
 * - ADR-366 D12 — an extension may contribute a kind and a movement type.
 */
import type { ExtensionManifest } from './types.js';

export const EXPANSES_MANIFEST: ExtensionManifest = {
  name: 'expanses',
  traitAdjectives: [{ word: 'floats', fields: [] }],
  kindNouns: ['expanse'],
  movementTypes: ['open'],
};
