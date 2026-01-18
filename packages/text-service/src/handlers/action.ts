/**
 * Action event handlers
 *
 * Handles: action.success, action.failure, action.blocked
 *
 * @see ADR-096 Text Service Architecture
 */

import type { ITextBlock } from '@sharpee/text-blocks';
import { BLOCK_KEYS } from '@sharpee/text-blocks';
import type { ISemanticEvent } from '@sharpee/core';
import type { HandlerContext } from './types.js';
import { createBlock } from '../stages/assemble.js';

/**
 * Action success event data
 */
interface ActionSuccessData {
  actionId: string;
  messageId: string;
  params?: Record<string, unknown>;
  message?: string;
  text?: string;
}

/**
 * Action failure event data
 */
interface ActionFailureData {
  actionId?: string;
  messageId?: string;
  params?: Record<string, unknown>;
  reason?: string;
  message?: string;
}

/**
 * Handle action.success events
 */
export function handleActionSuccess(
  event: ISemanticEvent,
  context: HandlerContext
): ITextBlock[] {
  const data = event.data as ActionSuccessData;

  // Try to get message from language provider
  if (data.messageId && context.languageProvider) {
    const fullMessageId = data.actionId
      ? `${data.actionId}.${data.messageId}`
      : data.messageId;

    let message = context.languageProvider.getMessage(fullMessageId, data.params);

    // Fallback to just messageId
    if (message === fullMessageId && data.messageId) {
      message = context.languageProvider.getMessage(data.messageId, data.params);
    }

    if (message !== data.messageId && message !== fullMessageId) {
      return [createBlock(BLOCK_KEYS.ACTION_RESULT, message)];
    }
  }

  // Fallback to data in event
  const text = data.message ?? data.text;
  if (text) {
    return [createBlock(BLOCK_KEYS.ACTION_RESULT, text)];
  }

  return [];
}

/**
 * Handle action.failure and action.blocked events
 */
export function handleActionFailure(
  event: ISemanticEvent,
  context: HandlerContext
): ITextBlock[] {
  const data = event.data as ActionFailureData;

  // Try language provider
  if (data.messageId && context.languageProvider) {
    const fullMessageId = data.actionId
      ? `${data.actionId}.${data.messageId}`
      : data.messageId;

    let message = context.languageProvider.getMessage(fullMessageId, data.params);

    // Fallback to just messageId (matches handleActionSuccess behavior)
    // This allows capability behaviors to use story-specific messageIds like
    // 'dungeo.troll.spits_at_player' without needing the action prefix
    if (message === fullMessageId && data.messageId) {
      message = context.languageProvider.getMessage(data.messageId, data.params);
    }

    if (message !== data.messageId && message !== fullMessageId) {
      return [createBlock(BLOCK_KEYS.ACTION_BLOCKED, message)];
    }
  }

  // Fallback
  const text =
    (data.params as { reason?: string })?.reason ??
    data.reason ??
    data.message ??
    "You can't do that.";
  return [createBlock(BLOCK_KEYS.ACTION_BLOCKED, text)];
}
