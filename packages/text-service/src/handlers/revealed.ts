/**
 * Revealed event handler
 *
 * Handles: if.event.revealed - when items become visible in a container
 *
 * @see ADR-094 Event Chaining
 * @see ADR-096 Text Service Architecture
 */

import type { ITextBlock } from '@sharpee/text-blocks';
import { BLOCK_KEYS } from '@sharpee/text-blocks';
import type { ISemanticEvent } from '@sharpee/core';
import type { HandlerContext, ChainableEventData } from './types.js';
import { createBlock } from '../stages/assemble.js';

/**
 * Revealed event data
 */
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
 * Handle if.event.revealed events
 */
export function handleRevealed(
  event: ISemanticEvent,
  context: HandlerContext
): ITextBlock[] {
  const data = event.data as RevealedEventData;

  // Check for direct message first (simple case)
  if (data.message || data.text) {
    const text = data.message ?? data.text ?? '';
    if (text) {
      return [createBlock(BLOCK_KEYS.ACTION_RESULT, text)];
    }
  }

  // Try language provider with event type as template key
  if (context.languageProvider) {
    const message = context.languageProvider.getMessage(event.type, {
      containerId: data.containerId,
      containerName: data.containerName,
      container: data.containerName,
      items: data.items,
    });

    // If we got a real message (not just the key echoed back)
    if (message && message !== event.type) {
      return [createBlock(BLOCK_KEYS.ACTION_RESULT, message)];
    }
  }

  // Fallback: Build a basic revealed message
  if (data.items && data.items.length > 0) {
    const itemNames = data.items
      .map((item) => item.name ?? item.messageId ?? item.entityId)
      .join(', ');

    const container = data.containerName ?? 'it';
    const text = `Inside the ${container} you see ${itemNames}.`;
    return [createBlock(BLOCK_KEYS.ACTION_RESULT, text)];
  }

  return [];
}
