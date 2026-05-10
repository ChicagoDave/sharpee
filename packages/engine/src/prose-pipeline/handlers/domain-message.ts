/**
 * Domain message handler — `event.data.messageId` resolution path.
 *
 * Handles any event whose data carries a `messageId`, regardless of
 * event type (per ADR-097). All stdlib actions use this pattern;
 * story actions emitting `action.success` / `action.blocked` events
 * also flow through here.
 *
 * Public interface: `tryProcessDomainEventMessage`. The pipeline
 * consults this first; on null, it falls through to the type-keyed
 * handlers (room, revealed, generic, etc.).
 *
 * Owner context: `@sharpee/engine` — internal prose pipeline.
 *
 * @see ADR-097 Domain Events with messageId
 * @see ADR-174 §Engine-internal prose pipeline (extracted from
 *   text-service.ts inline)
 */

import type { ITextBlock } from '@sharpee/text-blocks';
import { BLOCK_KEYS } from '@sharpee/text-blocks';
import type { ISemanticEvent } from '@sharpee/core';
import type { HandlerContext } from './types';
import { createBlock } from '../assemble';

interface DomainMessageData {
  messageId?: string;
  params?: Record<string, unknown>;
  message?: unknown;
  text?: unknown;
}

/**
 * Process domain events that carry messageId directly (ADR-097).
 *
 * @returns Text blocks if event has messageId. Returns null when the
 *   event has no messageId (caller falls through to type-keyed
 *   handlers). Falls back to inline `data.message` / `data.text`
 *   when the messageId fails to resolve.
 */
export function tryProcessDomainEventMessage(
  event: ISemanticEvent,
  context: HandlerContext,
): ITextBlock[] | null {
  const data = event.data as DomainMessageData | undefined;

  if (!data?.messageId) {
    return null;
  }

  // Skip client.query — it needs specialized handling (disambiguation
  // builds options from candidates).
  if (event.type === 'client.query') {
    return null;
  }

  if (!context.languageProvider) {
    return null;
  }

  const message = context.languageProvider.getMessage(
    data.messageId,
    data.params,
  );

  // If the messageId echoes (not registered) or resolves to empty,
  // fall back to inline text. Many events carry both a messageId and
  // pre-rendered text (melee combat, GDT, etc.).
  if (message === data.messageId || !message) {
    const fallback = data.message ?? data.text;
    if (typeof fallback === 'string' && fallback) {
      return [createBlock(BLOCK_KEYS.ACTION_RESULT, fallback)];
    }
    // No inline text — skip silently rather than showing an error.
    // Domain events (if.event.*) carry messageId for semantic
    // association, not for text rendering. Actual prose comes from
    // game.message events.
    return null;
  }

  // Block key chosen by event-type semantics.
  const blockKey =
    event.type.includes('blocked') || event.type.includes('failure')
      ? BLOCK_KEYS.ACTION_BLOCKED
      : BLOCK_KEYS.ACTION_RESULT;

  return [createBlock(blockKey, message)];
}
