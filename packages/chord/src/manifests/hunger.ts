/**
 * hunger.ts — the `use hunger` manifest (ADR-263 D4).
 *
 * Gates the satiety-meter body — `grows N each turn`, `<band> at <n>` rungs,
 * and `fatal at N` — behind one header line, exactly as `use scoring` gates the
 * rank ladder.
 *
 * Contributes **no trait adjectives**: hunger is story-header configuration
 * (the meter's bands and decay), not per-entity data. The runtime registration
 * behind this name installs the eating handler, the death hook, the decay
 * daemon, and the ADR-262 crossing watcher; none of that is a trait word.
 *
 * Public interface: HUNGER_MANIFEST.
 * Owner context: @sharpee/chord (language frontend; browser-safe).
 */
import type { ExtensionManifest } from './types.js';

export const HUNGER_MANIFEST: ExtensionManifest = {
  name: 'hunger',
  traitAdjectives: [],
};
