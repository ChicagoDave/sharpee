/**
 * Platform-event handler — renders `platform.*` lifecycle events.
 *
 * Platform events (core `createPlatformEvent`) carry their information in
 * `payload`, not `data`, so the ADR-097 domain-message path never sees them.
 * This handler renders them in the same prose-pipeline manner: the event
 * type itself is the messageId (`platform.save_completed`,
 * `platform.undo_failed`, ...) and params bind from the payload. lang-en-us
 * registers the standard texts; stories override by registering the same id.
 *
 * Events with no registered message render nothing — request-phase events
 * (`platform.save_requested`, ...) are intentionally silent by default.
 *
 * Public interface: `handlePlatformEvent`.
 * Owner context: `@sharpee/engine` — internal prose pipeline.
 */

import type { ITextBlock } from '@sharpee/text-blocks';
import { BLOCK_KEYS } from '@sharpee/text-blocks';
import type { ISemanticEvent } from '@sharpee/core';
import type { HandlerContext } from './types.js';
import { createBlocks } from '../assemble.js';
import { phraseAvailable, renderViaPhrase } from '../phrase-render.js';

/**
 * Render a `platform.*` event via the message registered under its event
 * type. Returns [] when no message is registered (silent by design).
 */
export function handlePlatformEvent(
  event: ISemanticEvent,
  context: HandlerContext,
): ITextBlock[] {
  if (!context.languageProvider) {
    return [];
  }

  const payload =
    (event as { payload?: Record<string, unknown> }).payload ?? {};

  // Failure/cancellation outcomes block-key as blocked; successes as result
  // (mirrors the domain-message handler's event-type semantics).
  const blockKey =
    event.type.includes('failed') || event.type.includes('cancelled')
      ? BLOCK_KEYS.ACTION_BLOCKED
      : BLOCK_KEYS.ACTION_RESULT;

  // Phrase path (ADR-192).
  if (phraseAvailable(context)) {
    return renderViaPhrase(context, event.type, payload, blockKey) ?? [];
  }

  // Legacy string path — only when the pipeline has no world (unit tests).
  const message = context.languageProvider.getMessage(event.type, payload);
  if (!message || message === event.type) {
    return [];
  }
  return createBlocks(blockKey, message);
}
