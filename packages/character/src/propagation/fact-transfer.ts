/**
 * Fact transfer and provenance tracking (ADR-144, ADR-310 D14/D17)
 *
 * Applies propagation transfers by creating facts in the listener's
 * knowledge base with provenance, and recording the transfer on the
 * speaker's trait told-record (the AlreadyToldRecord service is retired —
 * ADR-310 D17).
 *
 * Public interface: transferFact, applyTransfers, TransferResult.
 * Owner context: @sharpee/character / propagation
 */

import { CharacterModelTrait } from '@sharpee/world-model';
import {
  PropagationTransfer,
  ReceivesAs,
} from './propagation-types.js';

// ---------------------------------------------------------------------------
// Transfer result
// ---------------------------------------------------------------------------

/** The result of applying a fact transfer. */
export interface TransferResult {
  /** The transfer that was applied. */
  transfer: PropagationTransfer;

  /** The source string recorded on the listener's fact. */
  source: string;

  /** Whether the listener already knew this topic (no-op transfer). */
  alreadyKnew: boolean;
}

// ---------------------------------------------------------------------------
// Fact transfer
// ---------------------------------------------------------------------------

/**
 * Apply a single propagation transfer.
 *
 * Creates a fact in the listener's knowledge with provenance, and records
 * the transfer on the speaker's told-record. A skeptical listener
 * (`receives: 'as belief'`) holds the fact at lower confidence
 * ('suspects') — the fold of the retired standalone belief map
 * (ADR-310 D14).
 *
 * @param transfer - The transfer to apply
 * @param speakerTrait - The speaker's CharacterModelTrait (told-record home)
 * @param listenerTrait - The listener's CharacterModelTrait
 * @param turn - Current turn number
 * @param receivesAs - How the listener treats received info (default: 'as fact')
 * @returns The transfer result
 */
export function transferFact(
  transfer: PropagationTransfer,
  speakerTrait: CharacterModelTrait,
  listenerTrait: CharacterModelTrait,
  turn: number,
  receivesAs: ReceivesAs = 'as fact',
): TransferResult {
  const source = `told by ${transfer.speakerId}`;

  // Check if listener already knows this topic
  const alreadyKnew = listenerTrait.knows(transfer.topic);

  if (!alreadyKnew) {
    listenerTrait.addFact(
      transfer.topic,
      'told',
      receivesAs === 'as fact' ? 'believes' : 'suspects',
      turn,
    );
  }

  // Record on the speaker's told-record (even if the listener already knew,
  // this prevents the speaker from trying again)
  speakerTrait.recordTold(transfer.listenerId, transfer.topic);

  return {
    transfer,
    source,
    alreadyKnew,
  };
}

/**
 * Apply multiple propagation transfers in sequence.
 *
 * @param transfers - The transfers to apply
 * @param getTrait - Function to get an entity's CharacterModelTrait by ID
 *   (used for both speakers and listeners)
 * @param turn - Current turn number
 * @param getReceivesAs - Function to get how a listener receives info
 * @returns Array of transfer results
 */
export function applyTransfers(
  transfers: PropagationTransfer[],
  getTrait: (id: string) => CharacterModelTrait | undefined,
  turn: number,
  getReceivesAs?: (listenerId: string) => ReceivesAs,
): TransferResult[] {
  const results: TransferResult[] = [];

  for (const transfer of transfers) {
    const speakerTrait = getTrait(transfer.speakerId);
    const listenerTrait = getTrait(transfer.listenerId);
    if (!speakerTrait || !listenerTrait) continue;

    const receivesAs = getReceivesAs?.(transfer.listenerId) ?? 'as fact';
    const result = transferFact(transfer, speakerTrait, listenerTrait, turn, receivesAs);
    results.push(result);
  }

  return results;
}
