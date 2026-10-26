/**
 * Command-failed handler — `command.failed`.
 *
 * Maps parser / entity-resolution failure reasons to user-facing
 * error prose. Recognized reason fragments:
 *   - `storyRule: true` (a story rule's own diagnostic — the loader's
 *     LoadError thrown from a condition or clause, GH #345) →
 *     `core.story_rule_failed` followed by the reason, never the parser's
 *     refusal: the command parsed; a rule blew up.
 *   - a `messageId` with `params` (a parse-time scope violation, ADR-385
 *     D8) → that message through the phrase path, naming the entity
 *   - `ENTITY_NOT_FOUND` / `modifiers_not_matched` →
 *     `core.entity_not_found` (default: "I don't see that here."); with a
 *     `phrase` (a list item that named nothing, ADR-385 D5) →
 *     `core.entity_not_found_named`, which names it
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
import type { NounPhrase } from '@sharpee/if-domain';
import type { HandlerContext } from './types.js';
import { createBlocks } from '../assemble.js';
import { phraseAvailable, primitiveFacts, renderViaPhrase } from '../phrase-render.js';

interface CommandFailedData {
  reason?: string;
  input?: string;
  /** The failure is a story rule's diagnostic (GH #345), not a parse failure. */
  storyRule?: boolean;
  /** The content words of a phrase that named nothing (ADR-385 D5, D8). */
  phrase?: string;
  /** A language message to render with `params` (a parse-time scope violation, ADR-385 D8). */
  messageId?: string;
  params?: Record<string, NounPhrase | string>;
}

export function handleCommandFailed(
  event: ISemanticEvent,
  context: HandlerContext,
): ITextBlock[] {
  const data = event.data as CommandFailedData;
  const provider = context.languageProvider;

  if (data?.storyRule === true) {
    const lead = provider?.getMessage('core.story_rule_failed') ?? 'One of the story\'s rules failed:';
    return createBlocks(BLOCK_KEYS.ERROR, data.reason ? `${lead} ${data.reason}` : lead);
  }

  if (data?.messageId && data.params) {
    if (phraseAvailable(context)) {
      const blocks = renderViaPhrase(context, data.messageId, data.params, BLOCK_KEYS.ERROR, undefined, primitiveFacts(data));
      if (blocks) return blocks;
    }
    const message = provider?.getMessage(data.messageId, data.params);
    if (message && message !== data.messageId) {
      return createBlocks(BLOCK_KEYS.ERROR, message);
    }
  }

  if (data?.reason) {
    if (
      data.reason.includes('ENTITY_NOT_FOUND') ||
      data.reason.includes('modifiers_not_matched')
    ) {
      if (data.phrase) {
        const named = provider?.getMessage('core.entity_not_found_named', { phrase: data.phrase });
        if (named && named !== 'core.entity_not_found_named') {
          return createBlocks(BLOCK_KEYS.ERROR, named);
        }
      }
      const message =
        provider?.getMessage('core.entity_not_found') ??
        "I don't see that here.";
      return createBlocks(BLOCK_KEYS.ERROR, message);
    }

    // AMBIGUOUS_ENTITY now uses client.query event, not command.failed.

    if (data.reason.includes('NO_MATCH') || data.reason.includes('parse')) {
      const message =
        provider?.getMessage('core.command_not_understood') ??
        "I don't understand that.";
      return createBlocks(BLOCK_KEYS.ERROR, message);
    }
  }

  const message =
    provider?.getMessage('core.command_failed') ??
    "I don't understand that.";
  return createBlocks(BLOCK_KEYS.ERROR, message);
}
