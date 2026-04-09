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

/** How freely the NPC shares information. */
export type PropagationTendency = 'chatty' | 'selective' | 'mute';

/** Who the NPC shares with. */
export type PropagationAudience = 'trusted' | 'anyone' | 'allied';

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

/**
 * Tracks which facts an NPC has already told to each listener.
 * Prevents repeated sharing of the same fact to the same NPC.
 */
export class AlreadyToldRecord {
  /** speakerId → listenerId → Set of topic names */
  private readonly records: Map<string, Map<string, Set<string>>> = new Map();

  /**
   * Check if a speaker has already told a listener about a topic.
   */
  hasTold(speakerId: string, listenerId: string, topic: string): boolean {
    return this.records.get(speakerId)?.get(listenerId)?.has(topic) ?? false;
  }

  /**
   * Record that a speaker told a listener about a topic.
   */
  record(speakerId: string, listenerId: string, topic: string): void {
    let speakerRecord = this.records.get(speakerId);
    if (!speakerRecord) {
      speakerRecord = new Map();
      this.records.set(speakerId, speakerRecord);
    }
    let listenerSet = speakerRecord.get(listenerId);
    if (!listenerSet) {
      listenerSet = new Set();
      speakerRecord.set(listenerId, listenerSet);
    }
    listenerSet.add(topic);
  }

  /** Export for serialization. */
  toJSON(): Record<string, Record<string, string[]>> {
    const result: Record<string, Record<string, string[]>> = {};
    for (const [speakerId, listenerMap] of this.records) {
      result[speakerId] = {};
      for (const [listenerId, topics] of listenerMap) {
        result[speakerId][listenerId] = Array.from(topics);
      }
    }
    return result;
  }

  /** Restore from serialized data. */
  static fromJSON(data: Record<string, Record<string, string[]>>): AlreadyToldRecord {
    const record = new AlreadyToldRecord();
    for (const [speakerId, listeners] of Object.entries(data)) {
      for (const [listenerId, topics] of Object.entries(listeners)) {
        for (const topic of topics) {
          record.record(speakerId, listenerId, topic);
        }
      }
    }
    return record;
  }
}
