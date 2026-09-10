/**
 * Narrative configuration and its resolution at install (ADR-089 Phase C):
 * `NarrativeConfig` is what a story writes; `buildNarrativeSettings` turns it
 * into the `NarrativeSettings` the engine reads (the settings type itself
 * lives in `types.ts`, shared with the render side).
 */

import { type PronounSet } from '@sharpee/world-model';
import type { NarrativeSettings, Perspective, Tense } from '../../types.js';

/**
 * Default narrative settings (2nd person present tense, Zork-style)
 */
export const DEFAULT_NARRATIVE_SETTINGS: NarrativeSettings = {
  perspective: '2nd',
  tense: 'present',
};

/**
 * Narrative configuration for StoryConfig
 *
 * This is the subset of NarrativeSettings that authors specify.
 * Missing fields are filled with defaults.
 */
export interface NarrativeConfig {
  /**
   * Narrative perspective. Defaults to '2nd' if omitted.
   * Only specify if NOT using 2nd person (standard IF convention).
   */
  perspective?: Perspective;

  /**
   * For 3rd person: which pronoun set to use for the PC.
   * Derived from player entity's ActorTrait if not specified.
   */
  playerPronouns?: PronounSet;
}

/**
 * Build full NarrativeSettings from optional NarrativeConfig
 */
export function buildNarrativeSettings(config?: NarrativeConfig): NarrativeSettings {
  return {
    ...DEFAULT_NARRATIVE_SETTINGS,
    ...(config || {}),
    perspective: config?.perspective || '2nd',
  };
}
