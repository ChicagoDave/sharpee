/**
 * Generic event handlers — game.message and the catch-all generic
 * fallback for unknown event types.
 *
 * Public interface: `handleGameMessage`, `handleGenericEvent`. Used
 * by the pipeline's event-type dispatch.
 *
 * Owner context: `@sharpee/engine` — internal prose pipeline.
 *
 * @see ADR-174 §Engine-internal prose pipeline (port from text-service)
 */

import type { ITextBlock } from '@sharpee/text-blocks';
import { BLOCK_KEYS } from '@sharpee/text-blocks';
import type { ISemanticEvent } from '@sharpee/core';
import type { HandlerContext, GenericEventData } from './types';
import { createBlocks } from '../assemble';

interface GameMessageData {
  text?: string;
  message?: string;
  messageId?: string;
  params?: Record<string, unknown>;
}

/**
 * Handle `game.message` events.
 */
export function handleGameMessage(
  event: ISemanticEvent,
  context: HandlerContext,
): ITextBlock[] {
  const data = event.data as GameMessageData;

  if (data.messageId && context.languageProvider) {
    const message = context.languageProvider.getMessage(
      data.messageId,
      data.params,
    );
    if (message && message !== data.messageId) {
      return createBlocks(BLOCK_KEYS.GAME_MESSAGE, message);
    }
  }

  const text = data.text ?? data.message;
  if (text) {
    return createBlocks(BLOCK_KEYS.GAME_MESSAGE, text);
  }

  return [];
}

/**
 * Handle generic / unknown events using `event.type` as the template key.
 *
 * Story-defined events follow the simple pattern:
 *   - event.type is the template key
 *   - event.data is the template params
 */
export function handleGenericEvent(
  event: ISemanticEvent,
  context: HandlerContext,
): ITextBlock[] {
  const data = event.data as GenericEventData;

  if (!data) {
    return [];
  }

  if (data.message || data.text) {
    const text = data.message ?? data.text ?? '';
    if (text) {
      return createBlocks(BLOCK_KEYS.ACTION_RESULT, text);
    }
  }

  if (context.languageProvider) {
    const message = context.languageProvider.getMessage(event.type, data);

    if (message && message !== event.type) {
      return createBlocks(BLOCK_KEYS.ACTION_RESULT, message);
    }

    if (data.messageId) {
      const msgFromId = context.languageProvider.getMessage(
        data.messageId,
        data,
      );
      if (msgFromId && msgFromId !== data.messageId) {
        return createBlocks(BLOCK_KEYS.ACTION_RESULT, msgFromId);
      }
    }
  }

  return [];
}
