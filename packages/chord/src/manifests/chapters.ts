/**
 * chapters.ts — the `use chapters` manifest (ADR-330).
 *
 * Gates the `define chapters` block behind one header line, exactly as
 * `use scoring` gates the rank ladder and `use hunger` the satiety meter.
 *
 * Contributes **no trait adjectives**: chapters are story structure (a table
 * of rows the runtime watches), not per-entity data. The runtime registration
 * behind this name installs the chapter plugin and the `story.chapter`
 * channel; none of that is a trait word.
 *
 * Public interface: CHAPTERS_MANIFEST.
 * Owner context: @sharpee/chord (language frontend; browser-safe).
 */
import type { ExtensionManifest } from './types.js';

export const CHAPTERS_MANIFEST: ExtensionManifest = {
  name: 'chapters',
  traitAdjectives: [],
};
