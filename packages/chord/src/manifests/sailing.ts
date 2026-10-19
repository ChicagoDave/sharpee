/**
 * sailing.ts — the `use sailing` manifest (ADR-375).
 *
 * Sailing contributes no kind noun and no movement type: it extends the
 * open vehicle `use expanses` gives (ADR-366 D12), so it requires that
 * line. Its vocabulary — bearings in degrees, the `naval` set, `wind:`, the
 * `sailing` block, `sails:`, the sail statements and conditions — is gated
 * by the analyzer on this manifest's name.
 *
 * Public interface: SAILING_MANIFEST.
 * Owner context: @sharpee/chord manifests.
 *
 * References:
 * - ADR-375 D1 — `use sailing` turns the extension on; it builds on `use expanses`.
 * - ADR-366 D12 — an extension that builds on another says so.
 */
import type { ExtensionManifest } from './types.js';

export const SAILING_MANIFEST: ExtensionManifest = {
  name: 'sailing',
  traitAdjectives: [],
  requires: ['expanses'],
};
