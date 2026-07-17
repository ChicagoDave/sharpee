/**
 * Domain message handler — `event.data.messageId` resolution path.
 *
 * Handles any event whose data carries a `messageId`, regardless of
 * event type (per ADR-097). All stdlib actions use this pattern;
 * story actions emitting `action.success` / `action.blocked` events
 * also flow through here.
 *
 * Params bind nested-preferred with flat fallback (`data.params ?? data`,
 * ADR-206 unified rule) — emitters may nest template params under
 * `params` or carry them flat on the event data; nested wins when both
 * exist.
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
import { createBlocks } from '../assemble';
import { phraseAvailable, renderViaPhrase } from '../phrase-render';

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

  // Block key chosen by event-type semantics.
  const blockKey =
    event.type.includes('blocked') || event.type.includes('failure')
      ? BLOCK_KEYS.ACTION_BLOCKED
      : BLOCK_KEYS.ACTION_RESULT;

  const inlineFallback = (): ITextBlock[] | null => {
    // Many events carry both a messageId and pre-rendered text (melee combat,
    // GDT, …). When the id is unregistered, render that inline text.
    const fallback = data.message ?? data.text;
    if (typeof fallback === 'string' && fallback) {
      return createBlocks(blockKey, fallback);
    }
    // No inline text — skip silently for result events (domain if.event.*
    // ids carry semantic association, not text). A BLOCKED event ending
    // here is different: the player sees nothing where a refusal belongs
    // (ADR-231 D1 — every historical blank-refusal bug exited on this
    // path), so it warns instead of vanishing.
    if (blockKey === BLOCK_KEYS.ACTION_BLOCKED) {
      // eslint-disable-next-line no-console
      console.warn(
        `[phrase] blocked event "${event.type}" rendered blank: no template registered for "${data.messageId}" and no inline fallback`
      );
    }
    return null;
  };

  // Params binding (ADR-206 unified rule, 2026-07-02): prefer the nested
  // `data.params` object; fall back to the flat event data — the same
  // nested-preferred/flat-fallback rule handleGameMessage uses. Before
  // this, the domain path was nested-only while the generic fallback bound
  // flat, so a messageId + flat-params event failed here (stderr "param not
  // bound" noise) and only rendered by accident via the generic handler.
  const params = (data.params ?? data) as Record<string, unknown>;

  // Phrase path (ADR-192): render the template to a phrase tree and realize it.
  if (phraseAvailable(context)) {
    const blocks = renderViaPhrase(context, data.messageId, params, blockKey);
    return blocks ?? inlineFallback();
  }

  // Legacy string path — only when the pipeline has no world (some unit tests).
  const message = context.languageProvider.getMessage(data.messageId, params);
  if (message === data.messageId || !message) {
    return inlineFallback();
  }
  return createBlocks(blockKey, message);
}
