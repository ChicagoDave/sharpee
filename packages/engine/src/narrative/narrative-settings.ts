/**
 * Narrative Settings - Story-level perspective configuration
 *
 * ADR-089 Phase C: Defines how the story narrates player actions.
 * Stories can be written in 1st, 2nd, or 3rd person perspective.
 */

import { PronounSet } from '@sharpee/world-model';

/**
 * Narrative perspective for player actions
 * - '1st': "I take the lamp" (rare, Anchorhead-style)
 * - '2nd': "You take the lamp" (default, Zork-style)
 * - '3rd': "She takes the lamp" (experimental)
 */
export type Perspective = '1st' | '2nd' | '3rd';

/**
 * Narrative tense (future consideration)
 * - 'present': "You take the lamp" (default)
 * - 'past': "You took the lamp"
 */
export type Tense = 'present' | 'past';

/**
 * Narrative settings for a story
 *
 * Controls how the text service renders player-facing messages.
 * Set via StoryConfig at story definition time.
 */
export interface NarrativeSettings {
  /**
   * Narrative perspective for player actions
   * - '1st': "I take the lamp" (rare)
   * - '2nd': "You take the lamp" (default)
   * - '3rd': "She takes the lamp" (experimental)
   */
  perspective: Perspective;

  /**
   * For 3rd person: which pronoun set to use for the PC.
   * If not specified, derived from player entity's ActorTrait.
   * Ignored for 1st/2nd person perspectives.
   */
  playerPronouns?: PronounSet;

  /**
   * Narrative tense (future consideration)
   * Currently only 'present' is supported.
   */
  tense?: Tense;
}

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
