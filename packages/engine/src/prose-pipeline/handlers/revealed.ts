/**
 * Revealed event handler.
 *
 * Handles `if.event.revealed` — fired when items become visible inside
 * a container. Pulls a direct message/text payload first, then tries
 * the language provider keyed on event type, then falls back to a
 * built-in "Inside the {container} you see {items}." formatter.
 *
 * Public interface: `handleRevealed`. Used by the pipeline's
 * event-type dispatch.
 *
 * Owner context: `@sharpee/engine` — internal prose pipeline.
 *
 * @see ADR-094 Event Chaining
 * @see ADR-174 §Engine-internal prose pipeline (port from text-service)
 */

import type { ITextBlock } from '@sharpee/text-blocks';
import { BLOCK_KEYS } from '@sharpee/text-blocks';
import type { ISemanticEvent } from '@sharpee/core';
import type { HandlerContext, ChainableEventData } from './types.js';
import { createBlocks } from '../assemble.js';

interface RevealedEventData extends ChainableEventData {
  containerId?: string;
  containerName?: string;
  items?: Array<{
    entityId: string;
    messageId?: string;
    name?: string;
  }>;
  message?: string;
  text?: string;
}

/**
 * Handle `if.event.revealed` events.
 */
export function handleRevealed(
  event: ISemanticEvent,
  context: HandlerContext,
): ITextBlock[] {
  const data = event.data as RevealedEventData;

  if (data.message || data.text) {
    const text = data.message ?? data.text ?? '';
    if (text) {
      return createBlocks(BLOCK_KEYS.ACTION_RESULT, text);
    }
  }

  if (context.languageProvider) {
    const message = context.languageProvider.getMessage(event.type, {
      containerId: data.containerId,
      containerName: data.containerName,
      container: data.containerName,
      items: data.items,
    });

    if (message && message !== event.type) {
      return createBlocks(BLOCK_KEYS.ACTION_RESULT, message);
    }
  }

  if (data.items && data.items.length > 0) {
    const itemNames = data.items
      .map((item) => item.name ?? item.messageId ?? item.entityId)
      .join(', ');

    const container = data.containerName ?? 'it';
    const text = `Inside the ${container} you see ${itemNames}.`;
    return createBlocks(BLOCK_KEYS.ACTION_RESULT, text);
  }

  return [];
}
