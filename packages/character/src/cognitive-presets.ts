/**
 * Named cognitive profile presets (ADR-141, renamed per ADR-310 D5)
 *
 * Documented example profiles named for the behavior they produce, not a
 * diagnosis. These are starting points for authors, not platform-level
 * constants. Authors override any dimension via the builder's
 * cognitiveProfile() method, or ignore all eight and compose from
 * dimensions.
 *
 * Public interface: COGNITIVE_PRESETS, CognitivePresetName.
 * Owner context: @sharpee/character
 */

import { type CognitiveProfile } from '@sharpee/world-model';

/**
 * Names of built-in cognitive presets (ADR-310 D5 behavioral names — the
 * clinical names they replaced are gone; dimension values are unchanged).
 */
export type CognitivePresetName =
  | 'clear-headed'
  | 'fixated'
  | 'elsewhere'
  | 'loosened'
  | 'fogged'
  | 'braced'
  | 'unmoored'
  | 'unquiet';

/**
 * Named cognitive profile presets.
 *
 * Each maps to the five-dimensional profile from ADR-141's table, under the
 * ADR-310 D5 behavioral names. A preset says what the character *does* —
 * never implies the five dimensions model a real condition.
 */
export const COGNITIVE_PRESETS: Record<CognitivePresetName, CognitiveProfile> = {
  'clear-headed': {
    perception: 'accurate',
    beliefFormation: 'flexible',
    coherence: 'focused',
    lucidity: 'stable',
    selfModel: 'intact',
  },
  'fixated': {
    perception: 'accurate',
    beliefFormation: 'resistant',
    coherence: 'focused',
    lucidity: 'stable',
    selfModel: 'intact',
  },
  'elsewhere': {
    perception: 'accurate',
    beliefFormation: 'flexible',
    coherence: 'focused',
    lucidity: 'episodic',
    selfModel: 'fractured',
  },
  'loosened': {
    perception: 'filtered',
    beliefFormation: 'flexible',
    coherence: 'drifting',
    lucidity: 'fluctuating',
    selfModel: 'intact',
  },
  'fogged': {
    perception: 'filtered',
    beliefFormation: 'flexible',
    coherence: 'drifting',
    lucidity: 'fluctuating',
    selfModel: 'uncertain',
  },
  'braced': {
    perception: 'filtered',
    beliefFormation: 'rigid',
    coherence: 'drifting',
    lucidity: 'episodic',
    selfModel: 'uncertain',
  },
  'unmoored': {
    perception: 'filtered',
    beliefFormation: 'rigid',
    coherence: 'fragmented',
    lucidity: 'fluctuating',
    selfModel: 'fractured',
  },
  'unquiet': {
    perception: 'augmented',
    beliefFormation: 'resistant',
    coherence: 'fragmented',
    lucidity: 'episodic',
    selfModel: 'uncertain',
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
