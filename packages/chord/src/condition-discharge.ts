/**
 * Discharge detection over compiled conditions (ADR-318 D8; seam-2 ruling
 * 2026-08-16).
 *
 * A breaking-gated outlet ON SELF is the confession: a topic-row phrase
 * line gated `when it is breaking` (or the owner named outright), or a
 * goal gated `active when it is breaking`. The gate condition IS the
 * discharge marker — no authored surface. Band-gated phrasebooks are the
 * non-discharging color channel. A condition on ANOTHER entity's breaking
 * band never discharges the owner.
 *
 * Public interface: conditionRequiresSelfBreaking.
 * Owner context: @sharpee/chord / semantic queries over IR (sibling of
 *   condition-disjoint).
 */

import type { IRCondition, IRValue } from './ir.js';

/** The discharge band — the closed vocabulary's third word (ADR-318 D8). */
const BREAKING = 'breaking';

/** Whether an IRValue denotes the owner: `it`, or the owner named outright. */
function isSelf(value: IRValue, selfIrId?: string): boolean {
  if (value.kind === 'it') return true;
  return selfIrId !== undefined && value.kind === 'entity' && value.id === selfIrId;
}

/**
 * Whether a compiled condition can only hold while the owner's own
 * conscience band is `breaking` — the seam-2 discharge marker.
 *
 * Conservative by construction: `and` requires it in some operand, `or`
 * in every operand; negation and every other arm prove nothing. A
 * condition this returns false for may still mention breaking — it is
 * just not PROVABLY self-breaking-gated, so it does not discharge.
 *
 * @param cond - The compiled gate condition
 * @param selfIrId - The owner's IR entity id, when the caller knows it
 *   (enables the named-self spelling; `it` needs no id)
 * @returns True exactly when the condition requires self at `breaking`
 */
export function conditionRequiresSelfBreaking(cond: IRCondition, selfIrId?: string): boolean {
  switch (cond.kind) {
    case 'and':
      return cond.operands.some((c) => conditionRequiresSelfBreaking(c, selfIrId));
    case 'or':
      return cond.operands.length > 0 && cond.operands.every((c) => conditionRequiresSelfBreaking(c, selfIrId));
    case 'predicate':
      return (
        cond.pred === 'is' &&
        !cond.negated &&
        isSelf(cond.subject, selfIrId) &&
        cond.object.kind === 'symbol' &&
        cond.object.name === BREAKING
      );
    default:
      return false;
  }
}
