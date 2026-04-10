/**
 * Propagation visibility (ADR-144)
 *
 * Determines what the player sees when NPC-to-NPC information
 * transfer occurs. Three modes: offscreen (absent), witnessed
 * (present), eavesdropped (concealed).
 *
 * Public interface: PropagationVisibility, getVisibilityMessage.
 * Owner context: @sharpee/character / propagation
 */

import { PropagationTransfer, PropagationColoring } from './propagation-types';
import type { WorldModel, IFEntity } from '@sharpee/world-model';

// ---------------------------------------------------------------------------
// Player state
// ---------------------------------------------------------------------------

/** The player's presence state relative to the propagation event. */
export type PlayerPresence = 'absent' | 'present' | 'concealed';

// ---------------------------------------------------------------------------
// Visibility result
// ---------------------------------------------------------------------------

/** The visibility output for a single propagation transfer. */
export interface PropagationVisibilityResult {
  /** The transfer this result is for. */
  transfer: PropagationTransfer;

  /** The player's presence state. */
  presence: PlayerPresence;

  /** Message ID to emit (undefined if offscreen). */
  messageId?: string;

  /** Whether the player gains the fact with source 'overheard'. */
  playerLearns: boolean;
}

// ---------------------------------------------------------------------------
// Platform defaults per coloring
// ---------------------------------------------------------------------------

/**
 * Platform default witnessed message IDs per coloring.
 * Authors override per fact via FactOverride.witnessed.
 */
export const PROPAGATION_WITNESSED_DEFAULTS: Record<PropagationColoring, string> = {
  neutral:        'character.propagation.witnessed.neutral',
  dramatic:       'character.propagation.witnessed.dramatic',
  vague:          'character.propagation.witnessed.vague',
  fearful:        'character.propagation.witnessed.fearful',
  conspiratorial: 'character.propagation.witnessed.conspiratorial',
};

// ---------------------------------------------------------------------------
// Visibility evaluation
// ---------------------------------------------------------------------------

/**
 * Determine visibility output for a propagation transfer.
 *
 * @param transfer - The propagation transfer
 * @param presence - The player's presence state
 * @returns Visibility result with message ID and player-learns flag
 */
export function getVisibilityResult(
  transfer: PropagationTransfer,
  presence: PlayerPresence,
): PropagationVisibilityResult {
  switch (presence) {
    case 'absent':
      // Offscreen — state mutation only, no message
      return {
        transfer,
        presence,
        playerLearns: false,
      };

    case 'present':
      // Witnessed — player sees a summary message
      return {
        transfer,
        presence,
        messageId: transfer.witnessedOverride
          ?? PROPAGATION_WITNESSED_DEFAULTS[transfer.coloring],
        playerLearns: false,
      };

    case 'concealed':
      // Eavesdropped — player sees full dialogue and learns the fact
      return {
        transfer,
        presence,
        messageId: transfer.witnessedOverride
          ?? PROPAGATION_WITNESSED_DEFAULTS[transfer.coloring],
        playerLearns: true,
      };
  }
}

/**
 * Evaluate visibility for multiple transfers.
 *
 * @param transfers - The transfers to evaluate
 * @param presence - The player's presence state
 * @returns Array of visibility results
 */
export function getVisibilityResults(
  transfers: PropagationTransfer[],
  presence: PlayerPresence,
): PropagationVisibilityResult[] {
  return transfers.map(t => getVisibilityResult(t, presence));
}

// ---------------------------------------------------------------------------
// Player presence resolution (ADR-148)
// ---------------------------------------------------------------------------

/**
 * Determine the player's presence state relative to an NPC.
 *
 * Used by the propagation evaluator to decide what the player observes:
 * - `absent`: different room — state mutation only, no message
 * - `present`: same room, visible — witnessed summary
 * - `concealed`: same room, hidden — full eavesdropping, player learns the fact
 *
 * NPC-to-player visibility (can the NPC see the player?) is handled separately
 * by ConcealedVisibilityBehavior via the canSee() pipeline.
 *
 * @param world - The world model
 * @param playerId - The player entity ID
 * @param npcId - The NPC entity ID
 * @returns The player's presence state
 */
export function resolvePlayerPresence(
  world: WorldModel,
  playerId: string,
  npcId: string,
): PlayerPresence {
  const playerRoom = world.getContainingRoom(playerId);
  const npcRoom = world.getContainingRoom(npcId);

  // Different room → absent
  if (!playerRoom || !npcRoom || playerRoom.id !== npcRoom.id) {
    return 'absent';
  }

  // Same room but concealed → eavesdropping
  const player = world.getEntity(playerId);
  if (player?.has('if.trait.concealed_state')) {
    return 'concealed';
  }

  // Same room and visible → witnessed
  return 'present';
}
