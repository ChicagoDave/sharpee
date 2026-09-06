/**
 * Examined event handler — the id-mode description path (ADR-107, ADR-333 D1a).
 *
 * `if.event.examined` carries a message id and normally renders through the
 * domain-message path. When the examining action bound the entity's
 * `descriptionId` instead of (or beside) literal text, this handler resolves
 * the id to the author's text, realizes the action's own template with it,
 * and stamps the blocks with the entity's id — mirroring what the room
 * handler does for room descriptions.
 *
 * Public interface: `tryProcessExamined`. The pipeline consults it for
 * `if.event.examined` before the domain-message path; on null the event
 * falls through unchanged.
 *
 * Owner context: `@sharpee/engine` — internal prose pipeline.
 */

import type { ITextBlock } from '@sharpee/text-blocks';
import { BLOCK_KEYS } from '@sharpee/text-blocks';
import type { ISemanticEvent } from '@sharpee/core';
import type { HandlerContext } from './types.js';
import { phraseAvailable, primitiveFacts, renderViaPhrase } from '../phrase-render.js';
import { resolveDescriptionId, stampDescriptionSource } from './description-id.js';

interface ExaminedData {
  messageId?: string;
  params?: Record<string, unknown>;
}

/**
 * Render an examined event whose params carry a `descriptionId`.
 *
 * @param event the `if.event.examined` event
 * @param context the handler context
 * @returns the realized blocks stamped with the description id, or null when
 *   the event carries no id, the id is unregistered, or the phrase path is
 *   unavailable — the caller falls through to the domain-message path
 */
export function tryProcessExamined(event: ISemanticEvent, context: HandlerContext): ITextBlock[] | null {
  const data = event.data as ExaminedData | undefined;
  const descriptionId = data?.params?.descriptionId;
  if (!data?.messageId || typeof descriptionId !== 'string' || !descriptionId) return null;
  if (!phraseAvailable(context)) return null;

  const text = resolveDescriptionId(context.languageProvider, descriptionId);
  if (text === undefined) return null;

  const params = { ...data.params, description: text };
  const blocks = renderViaPhrase(context, data.messageId, params, BLOCK_KEYS.ACTION_RESULT, event.entities?.actor, primitiveFacts(data));
  return blocks ? stampDescriptionSource(blocks, descriptionId) : null;
}
