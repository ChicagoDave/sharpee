/**
 * Room description event handler
 *
 * Handles: if.event.room.description (standard format)
 * Also handles: if.event.room_description (legacy/alternate)
 *
 * Note: room.description uses a deliberate dot separator, unlike most
 * events which use underscores for compound words (e.g., actor_moved).
 *
 * @see ADR-096 Text Service Architecture
 */

import type { ITextBlock } from '@sharpee/text-blocks';
import { BLOCK_KEYS } from '@sharpee/text-blocks';
import type { ISemanticEvent } from '@sharpee/core';
import type { HandlerContext } from './types.js';
import { createBlock, extractValue } from '../stages/assemble.js';

/**
 * Room description event data
 */
interface RoomDescriptionData {
  roomId?: string;
  verbose?: boolean;
  room?: {
    id: string;
    name: string;
    description?: string;
  };
  roomName?: string;
  roomDescription?: string;
}

/**
 * Handle room description events
 */
export function handleRoomDescription(
  event: ISemanticEvent,
  _context: HandlerContext
): ITextBlock[] {
  const data = event.data as RoomDescriptionData;
  const blocks: ITextBlock[] = [];

  // Room name (if verbose)
  if (data.verbose) {
    const name = data.room?.name ?? data.roomName;
    if (name) {
      const resolvedName = extractValue(name);
      if (resolvedName) {
        blocks.push(createBlock(BLOCK_KEYS.ROOM_NAME, resolvedName));
      }
    }
  }

  // Room description
  const description = data.room?.description ?? data.roomDescription;
  if (description) {
    const resolvedDesc = extractValue(description);
    if (resolvedDesc) {
      blocks.push(createBlock(BLOCK_KEYS.ROOM_DESCRIPTION, resolvedDesc));
    }
  }

  return blocks;
}
