/**
 * Named cognitive profile presets (ADR-141)
 *
 * Documented example profiles for common cognitive conditions.
 * These are starting points for authors, not platform-level constants.
 * Authors override any dimension via the builder's cognitiveProfile() method.
 *
 * Public interface: COGNITIVE_PRESETS, CognitivePresetName.
 * Owner context: @sharpee/character
 */

import { CognitiveProfile } from '@sharpee/world-model';

/** Names of built-in cognitive presets. */
export type CognitivePresetName =
  | 'stable'
  | 'schizophrenic'
  | 'ptsd'
  | 'dementia'
  | 'dissociative'
  | 'tbi'
  | 'obsessive'
  | 'intoxicated';

/**
 * Named cognitive profile presets.
 *
 * Each maps to the five-dimensional profile from ADR-141's condition table.
 * Authors select a preset as a starting point, then override individual
 * dimensions as needed for their character.
 */
export const COGNITIVE_PRESETS: Record<CognitivePresetName, CognitiveProfile> = {
  stable: {
    perception: 'accurate',
    beliefFormation: 'flexible',
    coherence: 'focused',
    lucidity: 'stable',
    selfModel: 'intact',
  },
  schizophrenic: {
    perception: 'augmented',
    beliefFormation: 'resistant',
    coherence: 'fragmented',
    lucidity: 'episodic',
    selfModel: 'uncertain',
  },
  ptsd: {
    perception: 'filtered',
    beliefFormation: 'rigid',
    coherence: 'drifting',
    lucidity: 'episodic',
    selfModel: 'uncertain',
  },
  dementia: {
    perception: 'filtered',
    beliefFormation: 'rigid',
    coherence: 'fragmented',
    lucidity: 'fluctuating',
    selfModel: 'fractured',
  },
  dissociative: {
    perception: 'accurate',
    beliefFormation: 'flexible',
    coherence: 'focused',
    lucidity: 'episodic',
    selfModel: 'fractured',
  },
  tbi: {
    perception: 'filtered',
    beliefFormation: 'flexible',
    coherence: 'drifting',
    lucidity: 'fluctuating',
    selfModel: 'uncertain',
  },
  obsessive: {
    perception: 'accurate',
    beliefFormation: 'resistant',
    coherence: 'focused',
    lucidity: 'stable',
    selfModel: 'intact',
  },
  intoxicated: {
    perception: 'filtered',
    beliefFormation: 'flexible',
    coherence: 'drifting',
    lucidity: 'fluctuating',
    selfModel: 'intact',
  },
};

/**
 * Check if a string is a valid cognitive preset name.
 *
 * @param name - String to check
 * @returns True if the name is a recognized preset
 */
export function isCognitivePreset(name: string): name is CognitivePresetName {
  return name in COGNITIVE_PRESETS;
}
