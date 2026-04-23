/**
 * Role-hierarchy helpers used to drive authority-dependent UI.
 *
 * Public interface: {@link canModerate}, {@link canPromoteTo},
 * {@link canDemoteTo}, {@link TIER_RANK}, {@link PromoteToTier},
 * {@link DemoteToTier}.
 *
 * Bounded context: client state layer (ADR-153 Decision 4 — role hierarchy).
 *
 * The client re-implements the matrix *only* to decide which menus, buttons,
 * and form fields to render. The server is authoritative and rejects any
 * unauthorized action regardless of what the client lets through.
 */

import type { ParticipantSummary, Tier } from '../types/wire';

/** Tiers that a promote intent can target (wire constraint). */
export type PromoteToTier = 'co_host' | 'command_entrant';
/** Tiers that a demote intent can target (wire constraint). */
export type DemoteToTier = 'participant' | 'command_entrant' | 'co_host';

/**
 * Numeric rank for fast comparisons. Higher rank = more authority.
 * Not intended to be read as-is — use the helpers below.
 */
export const TIER_RANK: Record<Tier, number> = {
  participant: 0,
  command_entrant: 1,
  co_host: 2,
  primary_host: 3,
};

/**
 * Return true iff `viewer` can mute/unmute `target`, per ADR-153 Decision 4:
 *   - PH: anyone except themselves
 *   - CH: Participants and Command Entrants (not other CHs, not the PH, not self)
 *   - CE / Participant: no authority
 *
 * Both arguments are expected to identify *different* participants; passing
 * the same id yields `false` (you cannot moderate yourself).
 */
export function canModerate(
  viewer: { participant_id: string; tier: Tier } | null,
  target: { participant_id: string; tier: Tier },
): boolean {
  if (!viewer) return false;
  if (viewer.participant_id === target.participant_id) return false;
  if (viewer.tier === 'primary_host') return true;
  if (viewer.tier === 'co_host') {
    return target.tier === 'participant' || target.tier === 'command_entrant';
  }
  return false;
}

/**
 * Return true iff `viewer` may promote `target` to `to_tier`, per
 * ADR-153 Decision 4:
 *   - PH: may promote Participants or Command Entrants; `to_tier` may be
 *         CE or Co-Host.
 *   - CH: may only promote Participant → Command Entrant (no PH, no CH
 *         creation; a new CH requires PH action).
 *   - CE / Participant: no authority.
 *
 * PH is never a valid promote-to target — successor nomination is the
 * only path to PH. The `to_tier` parameter's union already excludes
 * `primary_host`, but we also guard against the target already being at
 * or above the requested tier (a no-op promote is still disallowed).
 */
export function canPromoteTo(
  viewer: { participant_id: string; tier: Tier } | null,
  target: { participant_id: string; tier: Tier },
  to_tier: PromoteToTier,
): boolean {
  if (!viewer) return false;
  if (viewer.participant_id === target.participant_id) return false;
  // Promotion must raise the target.
  if (TIER_RANK[target.tier] >= TIER_RANK[to_tier]) return false;
  if (viewer.tier === 'primary_host') return true;
  if (viewer.tier === 'co_host') {
    return target.tier === 'participant' && to_tier === 'command_entrant';
  }
  return false;
}

/**
 * Return true iff `viewer` may demote `target` to `to_tier`:
 *   - PH: may demote any non-self, non-PH target to any strictly lower tier.
 *   - CH: may only demote CE → Participant.
 *   - CE / Participant: no authority.
 */
export function canDemoteTo(
  viewer: { participant_id: string; tier: Tier } | null,
  target: { participant_id: string; tier: Tier },
  to_tier: DemoteToTier,
): boolean {
  if (!viewer) return false;
  if (viewer.participant_id === target.participant_id) return false;
  // Demotion must lower the target.
  if (TIER_RANK[target.tier] <= TIER_RANK[to_tier]) return false;
  if (viewer.tier === 'primary_host') {
    // PH can't demote another PH — in practice there's only one PH at a
    // time, so this is belt-and-braces.
    return target.tier !== 'primary_host';
  }
  if (viewer.tier === 'co_host') {
    return target.tier === 'command_entrant' && to_tier === 'participant';
  }
  return false;
}

/**
 * Resolve the DM thread peer for an incoming `dm` ServerMsg, or return
 * `null` if the viewer isn't entitled to see this message
 * (ADR-153 Decision 8 — DMs only on the PH ↔ Co-Host axis).
 *
 *   - Self = PH:        peer = whichever of {from, to} is not self.
 *   - Self = Co-Host:   peer = the current PH's id, but only if the
 *                       message is between the viewer and the PH;
 *                       any other routing is dropped defensively.
 *   - Self = CE / Participant / unknown: always `null`.
 */
export function dmPeerFor(
  selfId: string | null,
  participants: ParticipantSummary[],
  msg: { from: string; to: string },
): string | null {
  if (selfId === null) return null;
  const self = participants.find((p) => p.participant_id === selfId);
  if (!self) return null;

  if (self.tier === 'primary_host') {
    if (msg.from === selfId) return msg.to;
    if (msg.to === selfId) return msg.from;
    return null;
  }

  if (self.tier === 'co_host') {
    const ph = participants.find((p) => p.tier === 'primary_host');
    if (!ph) return null;
    const involvesSelf = msg.from === selfId || msg.to === selfId;
    const involvesPh = msg.from === ph.participant_id || msg.to === ph.participant_id;
    if (!involvesSelf || !involvesPh) return null;
    return ph.participant_id;
  }

  return null;
}
