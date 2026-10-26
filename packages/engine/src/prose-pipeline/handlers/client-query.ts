/**
 * Client-query handler — `client.query`.
 *
 * Two sources are rendered. A `disambiguation` query formats its candidate
 * list as natural English ("the X or the Y" / "the X, the Y, or the Z") and
 * resolves the `core.disambiguation_prompt` template with the resulting
 * `options` string. A `clarification` query (GH #318) carries the parser's
 * message id and its bindings, and the language words the seat question
 * (ADR-387 D3): the handler holds no sentence of its own.
 *
 * Public interface: `handleClientQuery`. Used by the pipeline's
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
import type { ParseErrorParams } from '@sharpee/world-model';
import type { HandlerContext } from './types.js';
import { createBlocks } from '../assemble.js';

interface ClientQueryData {
  source?: string;
  type?: string;
  messageId?: string;
  candidates?: Array<{ id: string; name: string; description?: string }>;
  /** A clarification query's template bindings (the verb, the slot), rendered with `messageId`. */
  params?: ParseErrorParams;
}

export function handleClientQuery(
  event: ISemanticEvent,
  context: HandlerContext,
): ITextBlock[] {
  const data = event.data as ClientQueryData;

  // GH #318: a held-command clarification renders the language's seat
  // question, the same block kind as a disambiguation prompt.
  if (data?.source === 'clarification') {
    if (!data.messageId) return [];
    const question = context.languageProvider?.getMessage(data.messageId, data.params ?? {}) ?? data.messageId;
    return createBlocks(BLOCK_KEYS.ERROR, question);
  }

  if (data?.source !== 'disambiguation') {
    return [];
  }

  const candidateNames = (data.candidates || []).map((c) => c.name);
  const options = formatCandidateList(candidateNames);

  const message =
    context.languageProvider?.getMessage('core.disambiguation_prompt', {
      options,
    }) ?? `Which do you mean: ${options}?`;

  return createBlocks(BLOCK_KEYS.ERROR, message);
}

/**
 * Format a list of candidate names as natural English.
 *
 * Examples:
 *   ["red ball", "blue ball"]            → "the red ball or the blue ball"
 *   ["sword", "axe", "knife"]            → "the sword, the axe, or the knife"
 */
function formatCandidateList(names: string[]): string {
  if (names.length === 0) return '';
  if (names.length === 1) return `the ${names[0]}`;

  const withArticles = names.map((n) => `the ${n}`);

  if (withArticles.length === 2) {
    return `${withArticles[0]} or ${withArticles[1]}`;
  }

  // Oxford-comma style: "the X, the Y, or the Z"
  const last = withArticles.pop();
  return `${withArticles.join(', ')}, or ${last}`;
}
