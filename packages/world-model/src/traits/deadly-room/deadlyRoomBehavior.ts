/**
 * Behavior for the deadly-room trigger shape (ADR-224).
 *
 * Computes the lethal/safe verdict for a parsed verb against a {@link DeadlyRoomTrait}.
 * Consumers (the deadly-room command transformer) call `checkVerb` rather than
 * reading the trait directly, so the model survives `loadJSON()`.
 *
 * Public interface: `checkVerb`, `isSafeVerb`.
 * Owner context: `@sharpee/world-model` — the deadly-room trigger shape (ADR-224).
 */

import { SeededRandom } from '@sharpee/core';
import { Behavior } from '../../behaviors/behavior.js';
import { TraitType } from '../trait-types.js';
import { DeadlyRoomTrait } from './deadlyRoomTrait.js';

/** Verdict returned by {@link DeadlyRoomBehavior.checkVerb}. */
export interface DeadlyRoomVerdict {
  /** Whether this verb kills the player in this room. */
  lethal: boolean;
  /** Cause to record on the death (from the trait). */
  cause: string;
  /** Optional death-text message id (from the trait). */
  messageId?: string;
}

export class DeadlyRoomBehavior extends Behavior {
  static requiredTraits = [TraitType.DEADLY_ROOM];

  /**
   * Whether `verb` is in the room's safe allowlist. Matches the resolved action id
   * exactly (case-insensitive) or by its final dotted segment, so both an action id
   * (`'if.action.looking'`) and the bare participle (`'looking'`) count as safe.
   * @param t the deadly-room trait
   * @param verb the command's resolved action id
   */
  static isSafeVerb(t: DeadlyRoomTrait, verb: string): boolean {
    const v = (verb ?? '').toLowerCase();
    const seg = v.split('.').pop() ?? v;
    return t.safeVerbs.some((s) => {
      const safe = s.toLowerCase();
      return v === safe || seg === safe;
    });
  }

  /**
   * The lethal/safe verdict for a verb in this room.
   *
   * A safe verb is never lethal. Otherwise the verb is lethal outright when the
   * trait has no `chance`, or lethal with probability `chance` (rolled against the
   * seeded `rng`) when it does. If `chance` is set but no `rng` is supplied, the
   * verb is treated as lethal (fail-deadly) — production always supplies the
   * engine's seeded RNG; a missing RNG is a wiring error, not a survival chance.
   *
   * @param t the deadly-room trait
   * @param verb the command's resolved action id
   * @param rng the engine's seeded RNG (required only for the `chance` variant)
   */
  static checkVerb(t: DeadlyRoomTrait, verb: string, rng?: SeededRandom): DeadlyRoomVerdict {
    const base = { cause: t.cause, messageId: t.messageId };

    if (DeadlyRoomBehavior.isSafeVerb(t, verb)) {
      return { lethal: false, ...base };
    }
    if (t.chance === undefined) {
      return { lethal: true, ...base };
    }
    const lethal = rng ? rng.chance(t.chance) : true;
    return { lethal, ...base };
  }
}
