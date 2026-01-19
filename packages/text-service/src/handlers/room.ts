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
 *
 * Supports ADR-107 dual-mode: either literal text or message IDs for localization.
 * ID fields take precedence over literal fields if both are present.
 */
interface RoomDescriptionData {
  roomId?: string;
  verbose?: boolean;
  room?: {
    id: string;
    name: string;
    description?: string;
    // ADR-107 dual-mode
    nameId?: string;
    descriptionId?: string;
  };
  // Literal text mode
  roomName?: string;
  roomDescription?: string;
  // ADR-107 ID mode (take precedence over literals)
  roomNameId?: string;
  roomDescriptionId?: string;
}

/**
 * Handle room description events
 *
 * Supports ADR-107 dual-mode: resolves message IDs through language provider
 * when present, otherwise uses literal text directly.
 */
export function handleRoomDescription(
  event: ISemanticEvent,
  context: HandlerContext
): ITextBlock[] {
  const data = event.data as RoomDescriptionData;
  const blocks: ITextBlock[] = [];

  // Room name (if verbose)
  if (data.verbose) {
    let name: string | undefined;

    // ADR-107: Check for message ID first (takes precedence)
    const nameId = data.roomNameId ?? data.room?.nameId;
    if (nameId && context.languageProvider) {
      const resolved = context.languageProvider.getMessage(nameId, {});
      if (resolved && resolved !== nameId) {
        name = resolved;
      }
    }

    // Fall back to literal text
    if (!name) {
      name = data.room?.name ?? data.roomName;
    }

    if (name) {
      const resolvedName = extractValue(name);
      if (resolvedName) {
        blocks.push(createBlock(BLOCK_KEYS.ROOM_NAME, resolvedName));
      }
    }
  }

  // Room description
  let description: string | undefined;

  // ADR-107: Check for message ID first (takes precedence)
  const descriptionId = data.roomDescriptionId ?? data.room?.descriptionId;
  if (descriptionId && context.languageProvider) {
    const resolved = context.languageProvider.getMessage(descriptionId, {});
    if (resolved && resolved !== descriptionId) {
      description = resolved;
    }
  }

  // Fall back to literal text
  if (!description) {
    description = data.room?.description ?? data.roomDescription;
  }

  if (description) {
    const resolvedDesc = extractValue(description);
    if (resolvedDesc) {
      blocks.push(createBlock(BLOCK_KEYS.ROOM_DESCRIPTION, resolvedDesc));
    }
  }

  return blocks;
}
