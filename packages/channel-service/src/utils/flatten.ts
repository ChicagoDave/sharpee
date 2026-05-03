/**
 * @sharpee/channel-service/utils — text-content flattening helper.
 *
 * Owner context: platform package. Small utility used by consumers
 * (renderers, debug logs, custom extractors) that need to project an
 * `ITextBlock`'s decorated content tree into a plain string.
 *
 * Public interface:
 *  - `flattenContent(content)` — recursive concat of string nodes,
 *    stripping decoration wrappers (preserving their inner content).
 *
 * Originally lived inside `platform-rules.ts`; extracted here as part
 * of the ADR-163 R1 rewrite (rule machinery removed; this helper kept
 * because consumers may still want a one-liner string projection).
 *
 * @see ADR-163 — Channel-Service Platform — §6, §14
 */

import type { TextContent } from '@sharpee/text-blocks';

/**
 * Flatten a `TextContent` array to a plain string.
 *
 * Recursively concatenates string nodes and strips decoration wrappers
 * (preserving their inner content). Side-effect-free; safe to call
 * inside producer closures.
 */
export function flattenContent(content: ReadonlyArray<TextContent>): string {
  let out = '';
  for (const node of content) {
    if (typeof node === 'string') {
      out += node;
    } else {
      out += flattenContent(node.content);
    }
  }
  return out;
}
