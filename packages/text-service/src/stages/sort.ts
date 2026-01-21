/**
 * Event sorting stage
 *
 * Sorts events within each transaction for correct prose order:
 * 1. action.* events first (the main action result)
 * 2. Then by chainDepth (lower depth first)
 *
 * Events arrive from Engine in emission order, but prose requires:
 * - Action result first ("You open the chest.")
 * - Then consequences ("Inside you see...")
 *
 * @see ADR-094 Event Chaining
 * @see ADR-096 Text Service Architecture
 */

import type { ISemanticEvent } from '@sharpee/core';

/**
 * Event data with chain metadata (ADR-094)
 */
interface ChainMetadata {
  _transactionId?: string;
  _chainDepth?: number;
  _chainedFrom?: string;
  _chainSourceId?: string;
}

/**
 * Sort events for correct prose order within transactions
 *
 * Uses stable sort to preserve order across different transactions.
 */
export function sortEventsForProse(events: ISemanticEvent[]): ISemanticEvent[] {
  return [...events].sort((a, b) => {
    const aData = a.data as ChainMetadata | undefined;
    const bData = b.data as ChainMetadata | undefined;

    const aTxnId = aData?._transactionId;
    const bTxnId = bData?._transactionId;

    // Game lifecycle events (game.started banner) come first, before everything
    // This ensures the banner displays before the first room description
    const aIsGameLifecycle = a.type.startsWith('game.');
    const bIsGameLifecycle = b.type.startsWith('game.');
    if (aIsGameLifecycle && !bIsGameLifecycle) return -1;
    if (!aIsGameLifecycle && bIsGameLifecycle) return 1;

    // Different transactions or no transaction: maintain original order
    if (aTxnId !== bTxnId) return 0;

    // Implicit take events should come first (before the main action result)
    // "first taking the X" should appear before "X reads:..."
    const aIsImplicitTake = a.type === 'if.event.implicit_take';
    const bIsImplicitTake = b.type === 'if.event.implicit_take';
    if (aIsImplicitTake && !bIsImplicitTake) return -1;
    if (!aIsImplicitTake && bIsImplicitTake) return 1;

    // Room description should come before action.success (for contents list)
    // This ensures "Room Name\nDescription" appears before "You see X here."
    const aIsRoomDesc = a.type === 'if.event.room.description' || a.type === 'if.event.room_description';
    const bIsRoomDesc = b.type === 'if.event.room.description' || b.type === 'if.event.room_description';
    if (aIsRoomDesc && !bIsRoomDesc) return -1;
    if (!aIsRoomDesc && bIsRoomDesc) return 1;

    // Same transaction: action.* first (after room description)
    const aIsAction = a.type.startsWith('action.');
    const bIsAction = b.type.startsWith('action.');
    if (aIsAction && !bIsAction) return -1;
    if (!aIsAction && bIsAction) return 1;

    // Then by chain depth (lower depth first)
    const aDepth = aData?._chainDepth ?? 0;
    const bDepth = bData?._chainDepth ?? 0;
    return aDepth - bDepth;
  });
}

/**
 * Extract chain metadata from event data
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
