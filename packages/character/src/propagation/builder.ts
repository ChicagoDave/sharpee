/**
 * Propagation builder API (ADR-144 layer 5)
 *
 * Extends CharacterBuilder with a fluent .propagation() method that
 * accepts PropagationProfile options. The compiled profile is stored
 * in CompiledCharacter for applyCharacter to consume.
 *
 * Public interface: propagation() method added to CharacterBuilder.
 * Owner context: @sharpee/character / propagation
 */

import {
  PropagationTendency,
  PropagationAudience,
  PropagationPace,
  PropagationColoring,
  ReceivesAs,
  FactOverride,
  PropagationSchedule,
  PropagationProfile,
} from './propagation-types';

/**
 * Options for the .propagation() builder method.
 * All fields map directly to PropagationProfile.
 */
export interface PropagationOptions {
  /** How freely the NPC shares information. */
  tendency: PropagationTendency;

  /** Who the NPC shares with (default: 'trusted'). */
  audience?: PropagationAudience;

  /** NPC IDs explicitly excluded from sharing. */
  excludes?: string[];

  /** Topics the chatty NPC withholds (blacklist for chatty tendency). */
  withholds?: string[];

  /** Topics the selective NPC will share (whitelist for selective tendency). */
  spreads?: string[];

  /** Per-fact overrides. */
  overrides?: Record<string, FactOverride>;

  /** How quickly facts are shared (default: 'eager'). */
  pace?: PropagationPace;

  /** Optional scheduling conditions. */
  schedule?: PropagationSchedule;

  /** Tone of the telling (default: 'neutral'). */
  coloring?: PropagationColoring;

  /** Whether the player can use this NPC as a messenger (default: false). */
  playerCanLeverage?: boolean;

  /** How the NPC treats received information (default: 'as fact'). */
  receives?: ReceivesAs;
}

/**
 * Convert builder options to a PropagationProfile.
 *
 * @param opts - Builder options
 * @returns A PropagationProfile with all specified fields
 */
export function buildPropagationProfile(opts: PropagationOptions): PropagationProfile {
  const profile: PropagationProfile = {
    tendency: opts.tendency,
  };

  if (opts.audience !== undefined) profile.audience = opts.audience;
  if (opts.excludes !== undefined) profile.excludes = [...opts.excludes];
  if (opts.withholds !== undefined) profile.withholds = [...opts.withholds];
  if (opts.spreads !== undefined) profile.spreads = [...opts.spreads];
  if (opts.overrides !== undefined) profile.overrides = { ...opts.overrides };
  if (opts.pace !== undefined) profile.pace = opts.pace;
  if (opts.schedule !== undefined) profile.schedule = { ...opts.schedule };
  if (opts.coloring !== undefined) profile.coloring = opts.coloring;
  if (opts.playerCanLeverage !== undefined) profile.playerCanLeverage = opts.playerCanLeverage;
  if (opts.receives !== undefined) profile.receives = opts.receives;

  return profile;
}
