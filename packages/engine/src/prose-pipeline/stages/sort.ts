/**
 * Event sorting stage — orders events within a turn for correct prose
 * sequence: lifecycle first, then per-transaction implicit-take →
 * room-description → action.* → others, finally by chain depth.
 *
 * Public interface: `sortEventsForProse`, `getChainMetadata`. Used
 * internally by the prose pipeline as the second per-turn stage,
 * after filtering.
 *
 * Owner context: `@sharpee/engine` — internal prose pipeline.
 *
 * @see ADR-094 Event Chaining (preserved; the sort responsibility
 *   ports from `@sharpee/text-service`)
 * @see ADR-174 §Engine-internal prose pipeline
 */

import type { ISemanticEvent } from '@sharpee/core';

/**
 * Event data with chain metadata (ADR-094).
 */
interface ChainMetadata {
  _transactionId?: string;
  _chainDepth?: number;
  _chainedFrom?: string;
  _chainSourceId?: string;
}

const LIFECYCLE_EVENTS = [
  'game.started',
  'game.starting',
  'game.loading',
  'game.loaded',
  'game.initialized',
];

/**
 * Sort events for correct prose order within transactions.
 *
 * Stable sort — preserves cross-transaction order while applying
 * within-transaction rules.
 */
export function sortEventsForProse(events: ISemanticEvent[]): ISemanticEvent[] {
  return [...events].sort((a, b) => {
    const aData = a.data as ChainMetadata | undefined;
    const bData = b.data as ChainMetadata | undefined;

    const aTxnId = aData?._transactionId;
    const bTxnId = bData?._transactionId;

    // Game lifecycle events come first, before everything.
    // Ensures the banner displays before the first room description.
    // Note: matches specific lifecycle events only, NOT game.message.
    const aIsGameLifecycle = LIFECYCLE_EVENTS.includes(a.type);
    const bIsGameLifecycle = LIFECYCLE_EVENTS.includes(b.type);
    if (aIsGameLifecycle && !bIsGameLifecycle) return -1;
    if (!aIsGameLifecycle && bIsGameLifecycle) return 1;

    // Different transactions or no transaction: maintain original order.
    if (aTxnId !== bTxnId) return 0;

    // Implicit take events come first, before the main action result:
    //   "first taking the X" before "X reads:..."
    const aIsImplicitTake = a.type === 'if.event.implicit_take';
    const bIsImplicitTake = b.type === 'if.event.implicit_take';
    if (aIsImplicitTake && !bIsImplicitTake) return -1;
    if (!aIsImplicitTake && bIsImplicitTake) return 1;

    // Room description before action.success (for contents list):
    //   "Room Name\nDescription" before "You see X here."
    const aIsRoomDesc =
      a.type === 'if.event.room.description' ||
      a.type === 'if.event.room_description';
    const bIsRoomDesc =
      b.type === 'if.event.room.description' ||
      b.type === 'if.event.room_description';
    if (aIsRoomDesc && !bIsRoomDesc) return -1;
    if (!aIsRoomDesc && bIsRoomDesc) return 1;

    // Within transaction: action.* first (after room description).
    const aIsAction = a.type.startsWith('action.');
    const bIsAction = b.type.startsWith('action.');
    if (aIsAction && !bIsAction) return -1;
    if (!aIsAction && bIsAction) return 1;

    // Then by chain depth (lower depth first).
    const aDepth = aData?._chainDepth ?? 0;
    const bDepth = bData?._chainDepth ?? 0;
    return aDepth - bDepth;
  });
}

/**
 * Extract chain metadata from event data.
 */
export function getChainMetadata(event: ISemanticEvent): ChainMetadata {
  const data = event.data as ChainMetadata | undefined;
  return {
    _transactionId: data?._transactionId,
    _chainDepth: data?._chainDepth,
    _chainedFrom: data?._chainedFrom,
    _chainSourceId: data?._chainSourceId,
  };
}
