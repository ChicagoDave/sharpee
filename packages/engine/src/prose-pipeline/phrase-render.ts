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
import type { HandlerContext } from './handlers/types.js';

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
 * @param params the message params (entity NounPhrases, scalars, …). The reserved
 *   key `__slots__` (a `{ [slotKey]: Phrase[] }` map) is not a placeholder binding:
 *   its phrases are staged into this message's turn slot store before realization,
 *   so an action that knows its target (e.g. examine staging detail clauses) can
 *   fill a `{slot:key}` in its own template without holding a render context at
 *   report time (ADR-195 S2). Plain phrase data — save/replay-safe.
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

  // ADR-195 S2: stage any pre-built slot contributions the emitter attached to
  // `params.__slots__` into this turn's slot store, before the template realizes,
  // so a `{slot:key}` in this message picks them up. Bare content; the slot owns
  // the connective grammar.
  const preStaged = params.__slots__ as Record<string, unknown[]> | undefined;
  if (preStaged && ctx.contribute) {
    for (const [slotKey, phrases] of Object.entries(preStaged)) {
      for (const phrase of phrases) {
        ctx.contribute(slotKey, phrase as Parameters<typeof ctx.contribute>[1]);
      }
    }
  }
  let blocks;
  try {
    blocks = lp.renderMessage!(messageId, params, ctx);
  } catch (e) {
    // A template that fails to parse at render time (unbound param, bad syntax)
    // is an authoring error — warn and degrade to the caller's inline fallback
    // rather than letting it abort the whole turn's prose.
    // eslint-disable-next-line no-console
    console.warn(`[phrase] renderMessage("${messageId}") failed: ${(e as Error).message}`);
    return null;
  }
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
