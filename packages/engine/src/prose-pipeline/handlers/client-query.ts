/**
 * Client-query handler — `client.query`.
 *
 * Today only the `disambiguation` source is rendered. The handler
 * formats a candidate list as natural English ("the X or the Y" /
 * "the X, the Y, or the Z") and resolves the
 * `core.disambiguation_prompt` template with the resulting `options`
 * string.
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
import type { HandlerContext } from './types';
import { createBlocks } from '../assemble';

interface ClientQueryData {
  source?: string;
  type?: string;
  messageId?: string;
  candidates?: Array<{ id: string; name: string; description?: string }>;
}

export function handleClientQuery(
  event: ISemanticEvent,
  context: HandlerContext,
): ITextBlock[] {
  const data = event.data as ClientQueryData;

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
