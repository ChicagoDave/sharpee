/**
 * Generic event handlers
 *
 * Handles: game.message, and fallback for unknown events
 *
 * @see ADR-096 Text Service Architecture
 */

import type { ITextBlock } from '@sharpee/text-blocks';
import { BLOCK_KEYS } from '@sharpee/text-blocks';
import type { ISemanticEvent } from '@sharpee/core';
import type { HandlerContext, GenericEventData } from './types.js';
import { createBlock } from '../stages/assemble.js';

/**
 * Game message event data
 */
interface GameMessageData {
  text?: string;
  message?: string;
  messageId?: string;
  params?: Record<string, unknown>;
}

/**
 * Handle game.message events
 */
export function handleGameMessage(
  event: ISemanticEvent,
  context: HandlerContext
): ITextBlock[] {
  const data = event.data as GameMessageData;

  // Try language provider
  if (data.messageId && context.languageProvider) {
    const message = context.languageProvider.getMessage(data.messageId, data.params);
    if (message && message !== data.messageId) {
      return [createBlock(BLOCK_KEYS.GAME_MESSAGE, message)];
    }
  }

  const text = data.text ?? data.message;
  if (text) {
    return [createBlock(BLOCK_KEYS.GAME_MESSAGE, text)];
  }

  return [];
}

/**
 * Handle generic/unknown events using event.type as template key
 *
 * Many events (especially story-defined ones) follow a simple pattern:
 * - Event type is the template key
 * - Event data is the template params
 */
export function handleGenericEvent(
  event: ISemanticEvent,
  context: HandlerContext
): ITextBlock[] {
  const data = event.data as GenericEventData;

  // Guard against undefined data
  if (!data) {
    return [];
  }

  // First check for explicit message/text in event data
  if (data.message || data.text) {
    const text = data.message ?? data.text ?? '';
    if (text) {
      return [createBlock(BLOCK_KEYS.ACTION_RESULT, text)];
    }
  }

  // Try language provider with event type as template key
  if (context.languageProvider) {
    const message = context.languageProvider.getMessage(event.type, data);

    // If we got a real message (not just the key echoed back)
    if (message && message !== event.type) {
      return [createBlock(BLOCK_KEYS.ACTION_RESULT, message)];
    }

    // Try with explicit messageId if present
    if (data.messageId) {
      const msgFromId = context.languageProvider.getMessage(data.messageId, data);
      if (msgFromId && msgFromId !== data.messageId) {
        return [createBlock(BLOCK_KEYS.ACTION_RESULT, msgFromId)];
      }
    }
  }

  // No template found - skip this event (it's probably a state change)
  return [];
}
