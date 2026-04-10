/**
 * Event type definitions for the hiding and revealing actions (ADR-148)
 *
 * Public interface: PlayerConcealedEventData, PlayerRevealedEventData.
 * Owner context: @sharpee/stdlib / actions / hiding
 */

import { EntityId } from '@sharpee/core';
import { ConcealmentPosition, ConcealmentQuality } from '@sharpee/world-model';

/**
 * Event data emitted when an actor becomes concealed.
 */
export interface PlayerConcealedEventData {
  /** The hiding spot entity */
  targetId: EntityId;
  /** How the actor is hiding */
  position: ConcealmentPosition;
  /** Quality of the concealment */
  quality: ConcealmentQuality;
}

/**
 * Event data emitted when concealment breaks.
 */
export interface PlayerRevealedEventData {
  /** Why concealment ended */
  reason: 'explicit' | 'action' | 'detected';
  /** Action ID that caused the reveal (when reason is 'action') */
  revealingAction?: string;
  /** NPC ID that detected the player (when reason is 'detected') */
  detectorId?: EntityId;
}
