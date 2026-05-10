/**
 * Command-failed handler — `command.failed`.
 *
 * Maps parser / entity-resolution failure reasons to user-facing
 * error prose. Recognized reason fragments:
 *   - `ENTITY_NOT_FOUND` / `modifiers_not_matched` →
 *     `core.entity_not_found` (default: "I don't see that here.")
 *   - `NO_MATCH` / `parse` →
 *     `core.command_not_understood` (default: "I don't understand that.")
 * Anything else → `core.command_failed` (same default).
 *
 * Public interface: `handleCommandFailed`. Used by the pipeline's
 * event-type dispatch.
 *
 * Owner context: `@sharpee/engine` — internal prose pipeline.
 *
 * @see ADR-174 §Engine-internal prose pipeline (extracted from
 *   text-service.ts inline)
 */

import type { ITextBlock } from '@sharpee/text-blocks';
import { BLOCK_KEYS } from '@sharpee/text-blocks';
import type { ISemanticEvent } from '@sharpee/core';
import type { HandlerContext } from './types';
import { createBlock } from '../assemble';

interface CommandFailedData {
  reason?: string;
  input?: string;
}

export function handleCommandFailed(
  event: ISemanticEvent,
  context: HandlerContext,
): ITextBlock[] {
  const data = event.data as CommandFailedData;
  const provider = context.languageProvider;

  if (data?.reason) {
    if (
      data.reason.includes('ENTITY_NOT_FOUND') ||
      data.reason.includes('modifiers_not_matched')
    ) {
      const message =
        provider?.getMessage('core.entity_not_found') ??
        "I don't see that here.";
      return [createBlock(BLOCK_KEYS.ERROR, message)];
    }

    // AMBIGUOUS_ENTITY now uses client.query event, not command.failed.

    if (data.reason.includes('NO_MATCH') || data.reason.includes('parse')) {
      const message =
        provider?.getMessage('core.command_not_understood') ??
        "I don't understand that.";
      return [createBlock(BLOCK_KEYS.ERROR, message)];
    }
  }

  const message =
    provider?.getMessage('core.command_failed') ??
    "I don't understand that.";
  return [createBlock(BLOCK_KEYS.ERROR, message)];
}
