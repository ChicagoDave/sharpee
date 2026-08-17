/**
 * Information propagation types (ADR-144)
 *
 * Type definitions for NPC-to-NPC information flow: propagation
 * profiles, audience/tendency/pace/coloring vocabularies, per-fact
 * overrides, and transfer records.
 *
 * Public interface: All exported types.
 * Owner context: @sharpee/character / propagation
 */

// ---------------------------------------------------------------------------
// Vocabulary types
// ---------------------------------------------------------------------------

/**
 * How freely the NPC shares information. `selective` is retired (ADR-310
 * D10): listing what an NPC spreads IS selectivity — a non-empty `spreads`
 * list narrows a chatty speaker to exactly those topics.
 */
export type PropagationTendency = 'chatty' | 'mute';

/** Who the NPC shares with. */
export type PropagationAudience = 'trusted' | 'anyone' | 'allied';

/** All propagation audiences, for vocabulary export and iteration (ADR-310 D10). */
export const PROPAGATION_AUDIENCES: readonly PropagationAudience[] = ['trusted', 'anyone', 'allied'];

/** How quickly the NPC shares when conditions are met. */
export type PropagationPace = 'eager' | 'gradual' | 'reluctant';

/** Tone of the telling — hint to the language layer for variant selection. */
export type PropagationColoring =
  | 'neutral'
  | 'dramatic'
  | 'vague'
  | 'fearful'
  | 'conspiratorial';

/** How the NPC receives information from others. */
export type ReceivesAs = 'as fact' | 'as belief';

/** Which version of a fact the NPC spreads. */
export type SpreadsVersion = 'truth' | 'lie';

// ---------------------------------------------------------------------------
// Per-fact overrides
// ---------------------------------------------------------------------------

/** Per-fact override for propagation behavior. */
export interface FactOverride {
  /** Override audience for this specific fact. */
  to?: PropagationAudience;

  /** Override which version to spread (truth or the lie told). */
  spreadsVersion?: SpreadsVersion;

  /** Override witnessed message for this fact when player is present. */
  witnessed?: string;
}

// ---------------------------------------------------------------------------
// Schedule conditions
// ---------------------------------------------------------------------------

/** When/where propagation happens. */
export interface PropagationSchedule {
  /** Predicate conditions that must be satisfied. */
  when: string[];
}

// ---------------------------------------------------------------------------
// Propagation profile
// ---------------------------------------------------------------------------

/**
 * Per-NPC propagation behavior definition.
 * Controls who the NPC talks to, what they share, when, and how.
 */
export interface PropagationProfile {
  /** How freely the NPC shares. */
  tendency: PropagationTendency;

  /** Who the NPC shares with (default: 'trusted'). */
  audience?: PropagationAudience;

  /** NPC IDs explicitly excluded from sharing. */
  excludes?: string[];

  /** Topics the chatty NPC withholds (blacklist). */
  withholds?: string[];

  /** Topics the NPC will share — a non-empty list is a whitelist (ADR-310 D10). */
  spreads?: string[];

  /** Per-fact overrides. */
  overrides?: Record<string, FactOverride>;

  /** How quickly facts are shared (default: 'eager'). */
  pace?: PropagationPace;

  /** Optional scheduling conditions. */
  schedule?: PropagationSchedule;

  /** Tone of the telling (default: 'neutral'). */
  coloring?: PropagationColoring;

  /**
   * RETIRED (ADR-320 D11, ruling 2026-08-17): hearsay spreads like any
   * knowledge — the told-source gate this flag controlled is deleted, so
   * the field is dead config kept only so existing profiles still parse.
   * Selectivity lives in `tendency`/`spreads`/`withholds`/audiences.
   */
  playerCanLeverage?: boolean;

  /** How the NPC treats received information (default: 'as fact'). */
  receives?: ReceivesAs;
}

// ---------------------------------------------------------------------------
// Transfer records
// ---------------------------------------------------------------------------

/** A single pending propagation transfer. */
export interface PropagationTransfer {
  /** The speaking NPC's entity ID. */
  speakerId: string;

  /** The listening NPC's entity ID. */
  listenerId: string;

  /** The topic being shared. */
  topic: string;

  /** Which version is being shared. */
  version: SpreadsVersion;

  /** The speaker's coloring for this transfer. */
  coloring: PropagationColoring;

  /** Per-fact witnessed message override, if any. */
  witnessedOverride?: string;
}

// The AlreadyToldRecord service class is retired (ADR-310 D17): the
// told-record now rides each speaker's CharacterModelTrait (`trait.told`,
// `hasTold`/`recordTold`), so it serializes with the world and never lives
// in module-level service state.
