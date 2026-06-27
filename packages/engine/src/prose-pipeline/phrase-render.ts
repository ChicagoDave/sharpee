/**
 * Phrase-path rendering helper for the prose pipeline (ADR-192 §6, the cutover).
 *
 * Bridges a handler's `(messageId, params, blockKey)` to the language provider's
 * `renderMessage` phrase pipeline, building the per-message `RenderContext` from
 * the per-turn factory and re-keying the realized blocks to the handler's
 * channel. The legacy `getMessage` string path remains in the handlers only as a
 * fallback for world-less construction (some unit tests); it is removed in W7
 * once nothing constructs the pipeline without a world.
 *
 * Public interface: `phraseAvailable`, `renderViaPhrase`.
 *
 * Owner context: `@sharpee/engine` — internal prose pipeline.
 *
 * @see ADR-192 §6
 */

import type { ITextBlock, TextContent } from '@sharpee/text-blocks';
import type { HandlerContext } from './handlers/types';

/**
 * Whether the phrase path is wired for this turn: a render-context factory (the
 * pipeline had a world) and a provider that implements the phrase API.
 *
 * @param context the handler context
 * @returns true when `renderViaPhrase` can be used
 */
export function phraseAvailable(context: HandlerContext): boolean {
  const lp = context.languageProvider;
  return (
    typeof context.makeRenderContext === 'function' &&
    typeof lp?.renderMessage === 'function' &&
    typeof lp?.getTemplate === 'function'
  );
}

/**
 * Render a message through the phrase pipeline and re-key its blocks.
 *
 * Precondition: {@link phraseAvailable} is true.
 *
 * @param context the handler context (carries the render-context factory)
 * @param messageId the message id to render
 * @param params the message params (entity NounPhrases, scalars, …)
 * @param blockKey the channel key to stamp on the realized blocks
 * @returns the realized blocks re-keyed to `blockKey`, or `null` when the message
 *   id is not registered (the caller applies its inline-text fallback)
 */
export function renderViaPhrase(
  context: HandlerContext,
  messageId: string,
  params: Record<string, unknown>,
  blockKey: string,
): ITextBlock[] | null {
  const lp = context.languageProvider!;
  // Unregistered id: events carry a messageId for semantic association even when
  // no template exists; let the caller fall back to inline data.message/text.
  if (lp.getTemplate!(messageId) === undefined) {
    return null;
  }
  const ctx = context.makeRenderContext!(params);
  const blocks = lp.renderMessage!(messageId, params, ctx);
  return blocks.map((b) => (b.key === blockKey ? b : { ...b, key: blockKey }));
}

/** Flatten one content node to its plain text (recursing through decorations). */
function textOf(node: TextContent): string {
  if (typeof node === 'string') return node;
  return (node.content ?? []).map(textOf).join('');
}

/**
 * Flatten realized blocks to a single plain string (newlines between blocks).
 * Used when a rendered message must be embedded into another message as a
 * `{verbatim:…}` scalar param.
 *
 * @param blocks realized text blocks
 * @returns the concatenated plain text
 */
export function flattenBlocks(blocks: ITextBlock[]): string {
  return blocks.map((b) => b.content.map(textOf).join('')).join('\n');
}
