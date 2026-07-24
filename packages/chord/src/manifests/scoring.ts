/**
 * scoring.ts — the `use scoring` manifest (ADR-261 D1).
 *
 * Purpose: gates scoring's three constructs — `score <name> worth N`,
 * `award <name>`, and the `rank` ladder — behind one header line. Gating all
 * three together is what makes "absent `use scoring` means the game has no
 * score" (D3) a rule with no exceptions: scoring is on precisely when the
 * header says so, and there is exactly one place to look.
 *
 * Contributes **no trait adjectives**, exactly like `state-machines`. Scoring
 * needs none: `score`/`award` are core lines and a rank ladder is
 * story-header configuration, not per-entity data.
 *
 * Note that this manifest does not — and structurally cannot — carry the
 * ladder. The runtime registration behind this name is
 * `(world) => registerScoring(world)`, which has no access to the story's IR
 * (ADR-260 D5); the ladder reaches the world through the loader's generic
 * lowering instead.
 *
 * Public interface: SCORING_MANIFEST.
 * Owner context: @sharpee/chord (language frontend; browser-safe).
 */
import type { ExtensionManifest } from './types.js';

export const SCORING_MANIFEST: ExtensionManifest = {
  name: 'scoring',
  traitAdjectives: [],
};
