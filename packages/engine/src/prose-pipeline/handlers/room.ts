/**
 * Room description event handler.
 *
 * Handles `if.event.room.description` (canonical form) and
 * `if.event.room_description` (legacy alternate). Resolves the
 * room name and description through the language provider when a
 * message id is present (ADR-107 dual-mode), falling back to literal
 * text otherwise.
 *
 * Public interface: `handleRoomDescription`. Used by the pipeline's
 * event-type dispatch.
 *
 * Owner context: `@sharpee/engine` — internal prose pipeline.
 *
 * @see ADR-107 — Dual-mode literal/messageId handling
 * @see ADR-174 §Engine-internal prose pipeline (port from text-service)
 */

import type { ITextBlock } from '@sharpee/text-blocks';
import { BLOCK_KEYS } from '@sharpee/text-blocks';
import type { ISemanticEvent } from '@sharpee/core';
import type { HandlerContext } from './types';
import { createBlock, createBlocks, extractValue } from '../assemble';
import { phraseAvailable, renderViaPhrase } from '../phrase-render';

/**
 * Core template id for the room description body (ADR-195). Realized through the
 * phrase pipeline so its `{slot:here}` room-occupant channel fills with the
 * presence clauses staged this turn. Registered in `@sharpee/lang-en-us`.
 */
const ROOM_DESCRIPTION_BODY_ID = 'if.room.description_body';

/**
 * Room description event data.
 *
 * Supports ADR-107 dual-mode: either literal text or message IDs for
 * localization. ID fields take precedence over literal fields if both
 * are present.
 */
interface RoomDescriptionData {
  roomId?: string;
  verbose?: boolean;
  room?: {
    id: string;
    name: string;
    description?: string;
    nameId?: string;
    descriptionId?: string;
  };
  roomName?: string;
  roomDescription?: string;
  roomNameId?: string;
  roomDescriptionId?: string;
}

/**
 * Handle room description events.
 */
export function handleRoomDescription(
  event: ISemanticEvent,
  context: HandlerContext,
): ITextBlock[] {
  const data = event.data as RoomDescriptionData;
  const blocks: ITextBlock[] = [];

  // Room name (if verbose).
  if (data.verbose) {
    let name: string | undefined;

    // ADR-107: message ID takes precedence.
    const nameId = data.roomNameId ?? data.room?.nameId;
    if (nameId && context.languageProvider) {
      const resolved = context.languageProvider.getMessage(nameId, {});
      if (resolved && resolved !== nameId) {
        name = resolved;
      }
    }

    if (!name) {
      name = data.room?.name ?? data.roomName;
    }

    if (name) {
      const resolvedName = extractValue(name);
      if (resolvedName) {
        blocks.push(
          createBlock(BLOCK_KEYS.ROOM_NAME, `[room:${resolvedName}]`),
        );
      }
    }
  }

  // Room description.
  let description: string | undefined;

  const descriptionId = data.roomDescriptionId ?? data.room?.descriptionId;
  if (descriptionId && context.languageProvider) {
    const resolved = context.languageProvider.getMessage(descriptionId, {});
    if (resolved && resolved !== descriptionId) {
      description = resolved;
    }
  }

  if (!description) {
    description = data.room?.description ?? data.roomDescription;
  }

  if (description) {
    const resolvedDesc = extractValue(description);
    if (resolvedDesc) {
      // ADR-192/195: realize the description body through the phrase pipeline so
      // its `{slot:here}` occupant channel fills with the presence clauses staged
      // this turn. The room's prose is bound as a `{verbatim:description}` param;
      // the slot owns the connective grammar. Degrade to literal blocks only when
      // the pipeline has no world (the legacy string path, e.g. some unit tests).
      const descBlocks = phraseAvailable(context)
        ? renderViaPhrase(
            context,
            ROOM_DESCRIPTION_BODY_ID,
            { description: resolvedDesc },
            BLOCK_KEYS.ROOM_DESCRIPTION,
          ) ?? createBlocks(BLOCK_KEYS.ROOM_DESCRIPTION, resolvedDesc)
        : createBlocks(BLOCK_KEYS.ROOM_DESCRIPTION, resolvedDesc);
      // When the room name was emitted in this packet, the description's
      // first block continues the room "heading" visually — mark it tight
      // so the renderer collapses the inter-paragraph margin and the
      // description sits flush under the bold room name.
      if (descBlocks.length > 0 && blocks.length > 0) {
        descBlocks[0] = { ...descBlocks[0], tight: true };
      }
      blocks.push(...descBlocks);
    }
  }

  return blocks;
}
