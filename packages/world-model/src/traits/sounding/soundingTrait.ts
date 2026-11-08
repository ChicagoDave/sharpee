// packages/world-model/src/traits/sounding/soundingTrait.ts

/**
 * Sounding trait — a thing that makes a sound of its own, and how loud (ADR-392 D5).
 *
 * `tier` is ADR-172's `VolumeTier`, the same ruler a `play sound` or a
 * shouted line is measured on, so "a loud thing" and "a loud sound" mean
 * one thing. The scope layer reads it: a thing at `raised` or above is
 * heard from inside a closed container, a quieter one is not. Propagation
 * between rooms stays ADR-172's.
 *
 * `descriptionId` is reserved for the per-sense prose line the senses
 * round adds (what the thing sounds like); nothing reads it yet.
 *
 * Pure data (ADR-346 D1): a default, no policing.
 *
 * Public interface: SoundingTrait, ISoundingData.
 * Owner context: @sharpee/world-model — sensory traits.
 */

import type { VolumeTier } from '@sharpee/if-domain';
import { ITrait } from '../trait.js';
import { TraitType } from '../trait-types.js';

export interface ISoundingData {
  /** How loud the thing is, on ADR-172's scale; defaults to `normal` */
  tier?: VolumeTier;

  /** Message id of what it sounds like; reserved for the senses round, unread today */
  descriptionId?: string;
}

/**
 * Sounding trait — a thing that sounds, and how loud.
 */
export class SoundingTrait implements ITrait, ISoundingData {
  static readonly type = TraitType.SOUNDING;
  readonly type = TraitType.SOUNDING;

  tier: VolumeTier;
  descriptionId?: string;

  constructor(data: ISoundingData = {}) {
    this.tier = data.tier ?? 'normal';
    this.descriptionId = data.descriptionId;
  }
}
