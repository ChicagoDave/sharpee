/**
 * Claim delivery bookkeeping (ADR-318 D9 / contracts.md §4)
 *
 * The lie ledger's two rules, shared by every dialogue surface (the TS
 * dialogue extension and the loader's topic dispatch):
 *
 * - Pin rule: a pinned claim to an audience forbids delivering a line
 *   whose claim contradicts the pinned value — mood and disposition
 *   drift cannot evaporate a maintained lie.
 * - Mint rule: delivering a line whose claim contradicts the speaker's
 *   own held belief mints a pinned ledger entry; honest assertion mints
 *   nothing (disagreement is not lying); every pinned delivery — mint or
 *   maintenance — is a duty defeat feeding conscience pressure.
 *
 * Public interface: pinAllowsClaim, recordClaimDelivery, ClaimTag.
 * Owner context: @sharpee/character / conversation
 */

import { type ISemanticEvent } from '@sharpee/core';
import { CharacterModelTrait } from '@sharpee/world-model';
import { depositPressure } from '../arbiter/pressure.js';
import { createAuthorEvent } from './author-events.js';

/** What a response line asserts: `(factId, value)` (ADR-318 D9). */
export interface ClaimTag {
  factId: string;
  value: string;
}

/**
 * Whether an active pin permits delivering a line with this claim tag.
 * Lines that claim nothing are always allowed.
 *
 * @param trait - The speaker's trait
 * @param audienceId - Who the line would be delivered to
 * @param claims - The line's claim tag, if any
 * @returns False exactly when a pin to this audience holds a different value
 */
export function pinAllowsClaim(
  trait: CharacterModelTrait,
  audienceId: string,
  claims: ClaimTag | undefined,
): boolean {
  if (!claims) return true;
  const pin = trait.getActivePin(audienceId, claims.factId);
  return !pin || pin.claimedValue === claims.value;
}

/**
 * Ledger bookkeeping for a delivered claim (ADR-318 D9).
 *
 * Mint rule as documented above. Re-delivering an already-pinned claim
 * mints no duplicate, but every pinned selection deposits pressure —
 * maintaining a lie costs by construction.
 *
 * @param trait - The speaker's trait (mutated: ledger, pressure)
 * @param npcId - The speaker's entity id (author-channel attribution)
 * @param audienceId - Who the claim was delivered to
 * @param claims - The line's claim tag
 * @param turn - Current turn number
 * @returns Author-channel events for the mint/maintenance/deposit (ADR-318 D11)
 */
export function recordClaimDelivery(
  trait: CharacterModelTrait,
  npcId: string,
  audienceId: string,
  claims: ClaimTag,
  turn: number,
): ISemanticEvent[] {
  const held = trait.getFactBelief(claims.factId)?.value;
  const isLie = held !== undefined && held !== claims.value;
  const pin = trait.getActivePin(audienceId, claims.factId);
  const events: ISemanticEvent[] = [];

  if (isLie && !pin) {
    trait.mintLedgerEntry({
      kind: 'claim',
      audience: audienceId,
      factId: claims.factId,
      claimedValue: claims.value,
      turnMinted: turn,
      pinned: true,
    });
    events.push(createAuthorEvent('character.author.ledger_mint', npcId, {
      audience: audienceId, factId: claims.factId,
      claimedValue: claims.value, heldValue: held,
    }));
  } else if (pin) {
    events.push(createAuthorEvent('character.author.pin_held', npcId, {
      audience: audienceId, factId: claims.factId,
      claimedValue: pin.claimedValue,
    }));
  }

  // D9: every pinned selection is a duty defeat feeding pressure —
  // both the minting delivery and every maintenance of it.
  if (isLie || pin) {
    const transition = depositPressure(trait, {
      winner: 'duty',
      act: 'comply',
      readings: [],
      defeats: [{ force: 'duty', feed: `pin:${claims.factId}` }],
    });
    events.push(createAuthorEvent('character.author.pressure_deposit', npcId, {
      feed: `pin:${claims.factId}`,
      value: trait.pressure.value,
      band: trait.pressure.band,
      ...(transition ? { transition } : {}),
    }));
  }

  return events;
}
