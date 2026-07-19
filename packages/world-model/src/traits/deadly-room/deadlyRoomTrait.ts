/**
 * Deadly Room Trait (ADR-224 — the reusable deadly-room trigger shape).
 *
 * Marks a room where verbs outside a safe allowlist kill the player: MDL's
 * Aragain Falls ("every verb but LOOK is fatal here"). An optional `chance` turns
 * the same shape into a probabilistic hazard (the grue: a non-safe verb dies only
 * `chance` of the time), rolled against the engine's seeded RNG.
 *
 * Data only — no methods. The lethal/safe verdict lives in {@link DeadlyRoomBehavior}
 * (a getter would not survive `loadJSON()`). The trait carries no logic and no RNG;
 * the deadly-room command transformer supplies the seeded RNG at check time.
 *
 * Public interface: read the verdict via `DeadlyRoomBehavior.checkVerb`.
 * Owner context: `@sharpee/world-model` — the deadly-room trigger shape (ADR-224).
 */

import { ITrait } from '../trait.js';

/**
 * Constructor/serialization data for {@link DeadlyRoomTrait}.
 */
export interface IDeadlyRoomData {
  /** Cause recorded on the death (e.g. 'fall', 'grue'). Defaults to `'hazard'`. */
  cause?: string;

  /** Optional death-text message id (rendered by the language layer). */
  messageId?: string;

  /**
   * Verbs that are safe in this room — matched against a command's resolved
   * action id, tolerant of the bare participle (`'looking'` matches
   * `'if.action.looking'`). Defaults to `['looking', 'examining']` (LOOK/EXAMINE),
   * the MDL falls allowlist.
   */
  safeVerbs?: string[];

  /**
   * Probability (0–1) that a non-safe verb is lethal. When omitted, every non-safe
   * verb is lethal (the falls). When set, the hazard is probabilistic (the grue)
   * and rolled against the engine's seeded RNG — never `Math.random()`.
   */
  chance?: number;
}

/**
 * The deadly-room trigger trait. Data-only; see file header.
 */
export class DeadlyRoomTrait implements ITrait, IDeadlyRoomData {
  static readonly type = 'deadlyRoom' as const;
  readonly type = 'deadlyRoom' as const;

  cause: string;
  messageId?: string;
  safeVerbs: string[];
  chance?: number;

  constructor(data: IDeadlyRoomData = {}) {
    this.cause = data.cause ?? 'hazard';
    this.messageId = data.messageId;
    this.safeVerbs = data.safeVerbs ?? ['looking', 'examining'];
    this.chance = data.chance;
  }
}
