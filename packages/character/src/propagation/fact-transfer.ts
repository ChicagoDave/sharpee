/**
 * Fact transfer and provenance tracking (ADR-144)
 *
 * Applies propagation transfers by creating facts in the listener's
 * knowledge base with full provenance chain. Records transfers in
 * the already-told record.
 *
 * Public interface: transferFact, TransferResult.
 * Owner context: @sharpee/character / propagation
 */

import { CharacterModelTrait } from '@sharpee/world-model';
import {
  PropagationTransfer,
  AlreadyToldRecord,
  ReceivesAs,
} from './propagation-types';

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
 * Creates a fact in the listener's knowledge with provenance,
 * records the transfer in the already-told record.
 *
 * @param transfer - The transfer to apply
 * @param listenerTrait - The listener's CharacterModelTrait
 * @param alreadyTold - The shared already-told record
 * @param turn - Current turn number
 * @param receivesAs - How the listener treats received info (default: 'as fact')
 * @returns The transfer result
 */
export function transferFact(
  transfer: PropagationTransfer,
  listenerTrait: CharacterModelTrait,
  alreadyTold: AlreadyToldRecord,
  turn: number,
  receivesAs: ReceivesAs = 'as fact',
): TransferResult {
  const source = `told by ${transfer.speakerId}`;

  // Check if listener already knows this topic
  const alreadyKnew = listenerTrait.knows(transfer.topic);

  if (!alreadyKnew) {
    if (receivesAs === 'as fact') {
      // Add as knowledge fact
      listenerTrait.addFact(
        transfer.topic,
        'told',
        'believes',
        turn,
      );
    } else {
      // Add as belief (skeptical NPC)
      listenerTrait.addBelief(
        transfer.topic,
        'suspects',
        'none',
      );
    }
  }

  // Record in already-told (even if listener already knew,
  // this prevents the speaker from trying again)
  alreadyTold.record(transfer.speakerId, transfer.listenerId, transfer.topic);

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
 * @param getListenerTrait - Function to get a listener's CharacterModelTrait by ID
 * @param alreadyTold - The shared already-told record
 * @param turn - Current turn number
 * @param getReceivesAs - Function to get how a listener receives info
 * @returns Array of transfer results
 */
export function applyTransfers(
  transfers: PropagationTransfer[],
  getListenerTrait: (id: string) => CharacterModelTrait | undefined,
  alreadyTold: AlreadyToldRecord,
  turn: number,
  getReceivesAs?: (listenerId: string) => ReceivesAs,
): TransferResult[] {
  const results: TransferResult[] = [];

  for (const transfer of transfers) {
    const listenerTrait = getListenerTrait(transfer.listenerId);
    if (!listenerTrait) continue;

    const receivesAs = getReceivesAs?.(transfer.listenerId) ?? 'as fact';
    const result = transferFact(transfer, listenerTrait, alreadyTold, turn, receivesAs);
    results.push(result);
  }

  return results;
}
