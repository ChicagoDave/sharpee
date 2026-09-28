/**
 * Examined event handler — the id-mode description path (ADR-107, ADR-333 D1a).
 *
 * `if.event.examined` carries a message id and normally renders through the
 * domain-message path. When the examining action bound the entity's
 * `descriptionId` instead of (or beside) literal text, this handler resolves
 * the id to the author's text, realizes the action's own template with it,
 * and stamps the blocks with the entity's id — mirroring what the room
 * handler does for room descriptions. When the event also carries the
 * entity's `snippets` map (GH #364), the resolved text is spliced through
 * stdlib's snippet resolver first, exactly as a room's `roomSnippets` are,
 * so `{snippet:name}` markers in an entity description resolve instead of
 * printing literally.
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
import type { SnippetMap } from '@sharpee/if-domain';
import { resolveSnippetDescription } from '@sharpee/stdlib';
import type { HandlerContext } from './types.js';
import { phraseAvailable, primitiveFacts, renderViaPhrase } from '../phrase-render.js';
import { resolveDescriptionId, stampDescriptionSource } from './description-id.js';

interface ExaminedData {
  messageId?: string;
  params?: Record<string, unknown>;
  /** The examined entity's id — the snippet Choice counter's primary key. */
  targetId?: string;
  /** The entity's description snippet map (GH #364); absent = no splice pass. */
  snippets?: SnippetMap;
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

  // GH #364: a snippet-bearing entity's description is spliced before
  // binding — the same stdlib resolver (scan/gate) the room handler runs,
  // keyed on the entity's id. Entities without a map bind the plain text.
  let description: unknown = text;
  if (data.snippets && data.targetId && context.makeRenderContext) {
    const lp = context.languageProvider;
    description = resolveSnippetDescription(
      text,
      data.targetId,
      data.snippets,
      context.makeRenderContext({}).world,
      lp
        ? (id) => {
            const msg = lp.getMessage(id, {});
            return msg && msg !== id ? msg : undefined;
          }
        : undefined,
    );
  }

  const params = { ...data.params, description };
  const blocks = renderViaPhrase(context, data.messageId, params, BLOCK_KEYS.ACTION_RESULT, event.entities?.actor, primitiveFacts(data));
  return blocks ? stampDescriptionSource(blocks, descriptionId) : null;
}
