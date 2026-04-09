/**
 * NPC influence types (ADR-146)
 *
 * Type definitions for the influence system: influence definitions,
 * resistance definitions, effect tracking, and evaluation results.
 *
 * Public interface: All exported types.
 * Owner context: @sharpee/character / influence
 */

// ---------------------------------------------------------------------------
// Influence mode and range
// ---------------------------------------------------------------------------

/**
 * How the influence is exerted.
 * - passive: automatically when conditions are met (proximity, same room)
 * - active: deliberately as part of NPC behavior or goal pursuit
 */
export type InfluenceMode = 'passive' | 'active';

/**
 * Who the influence affects.
 * - proximity: target must be in the same room
 * - targeted: influencer selects a specific target (used with active mode)
 * - room: affects all entities in the room (aura)
 */
export type InfluenceRange = 'proximity' | 'targeted' | 'room';

/**
 * How long the effect lasts.
 * - 'while present': clears when influencer leaves the room (default for passive)
 * - 'momentary': lasts one turn (default for active)
 * - 'lingering': persists for author-defined turns or until a condition clears it
 */
export type InfluenceDuration = 'while present' | 'momentary' | 'lingering';

// ---------------------------------------------------------------------------
// Effect
// ---------------------------------------------------------------------------

/**
 * Character state mutations caused by influence.
 * Keys map to ADR-141 vocabulary: mood, threat, focus, propagation, disposition.
 */
export interface InfluenceEffect {
  /** ADR-141 mood state. */
  mood?: string;

  /** ADR-141 threat level. */
  threat?: string;

  /** PC or NPC ability to pursue current activity. */
  focus?: string;

  /** ADR-144 propagation tendency override. */
  propagation?: string;

  /** ADR-141 disposition toward a specific entity. */
  disposition?: Record<string, string>;
}

// ---------------------------------------------------------------------------
// Schedule
// ---------------------------------------------------------------------------

/** Conditions for when a passive influence is exerted. */
export interface InfluenceSchedule {
  /** Predicate conditions that must be satisfied. */
  when: string[];
}

// ---------------------------------------------------------------------------
// Influence definition
// ---------------------------------------------------------------------------

/** Author-defined influence on the exerting NPC. */
export interface InfluenceDef {
  /** Author-invented influence name (e.g., 'seduction', 'intimidation'). */
  name: string;

  /** How the influence is exerted. */
  mode: InfluenceMode;

  /** Who the influence affects. */
  range: InfluenceRange;

  /** State mutations applied to affected targets. */
  effect: InfluenceEffect;

  /** How long the effect lasts. */
  duration: InfluenceDuration;

  /** Message ID when the target is affected (player witnesses). */
  witnessed?: string;

  /** Message ID when the target resists. */
  resisted?: string;

  /** Optional scheduling conditions (for passive mode). */
  schedule?: InfluenceSchedule;

  /** Message ID when PC tries to act while under this influence. */
  onPlayerAction?: string;

  /** Number of turns for lingering duration. */
  lingeringTurns?: number;

  /** Predicate condition to clear lingering effect. */
  lingeringClearCondition?: string;
}

// ---------------------------------------------------------------------------
// Resistance definition
// ---------------------------------------------------------------------------

/** Author-defined resistance on the target NPC. */
export interface ResistanceDef {
  /** The influence name this entity resists. */
  influenceName: string;

  /**
   * Conditions under which resistance fails (target becomes vulnerable).
   * Uses the same predicate system as ADR-141/142.
   */
  except?: string[];
}

// ---------------------------------------------------------------------------
// Active influence effect tracking
// ---------------------------------------------------------------------------

/** Runtime tracking of an applied influence effect. */
export interface ActiveInfluenceEffect {
  /** The influence name. */
  influenceName: string;

  /** The influencer's entity ID. */
  influencerId: string;

  /** The target's entity ID. */
  targetId: string;

  /** The applied effect mutations. */
  effect: InfluenceEffect;

  /** Duration type. */
  duration: InfluenceDuration;

  /** Turn when the effect was applied. */
  appliedAtTurn: number;

  /** For lingering: turn when the effect expires. */
  expiresAtTurn?: number;

  /** For lingering: predicate condition that clears the effect. */
  clearCondition?: string;
}

// ---------------------------------------------------------------------------
// Evaluation results
// ---------------------------------------------------------------------------

/** Result of evaluating one influence against one target. */
export type InfluenceResult =
  | {
      status: 'applied';
      influenceName: string;
      influencerId: string;
      targetId: string;
      effect: InfluenceEffect;
      witnessed?: string;
    }
  | {
      status: 'resisted';
      influenceName: string;
      influencerId: string;
      targetId: string;
      resisted?: string;
    }
  | {
      status: 'skipped';
      reason: string;
    };
