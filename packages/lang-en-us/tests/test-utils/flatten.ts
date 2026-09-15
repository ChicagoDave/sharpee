/**
 * @file Test-side `TextContent` flattening — the one place that knows the union's shape.
 *
 * Every assembler test projects a realized block's content down to a string to
 * assert on, and each did it with its own inline lambda over
 * `typeof c === 'string' ? c : …`. That worked while `TextContent` had exactly
 * two members. ADR-353 D4 added a third — `IChosen`, a span whose text the world
 * selected from alternatives — and thirty tests went red at once, each having
 * silently assumed the union could not grow.
 *
 * These two helpers hold that assumption in one file instead of twenty-four, and
 * they preserve the two behaviors the suites actually rely on:
 *
 *  - `plainNode` — a decoration contributes NOTHING (not its inner text). That is
 *    what the existing expectations are written against; it is a deliberate
 *    projection, not a bug, and `extractPlainText` is not a substitute because it
 *    keeps the inner text.
 *  - `markedNode` — a decoration becomes the sentinel `⟦deco⟧`, for suites whose
 *    subject IS the decoration.
 *
 * Both pass through `IChosen` transparently, which is correct in the domain and
 * not just convenient: provenance is invisible to a reader, so a test asserting
 * on what a player sees should not see it either.
 *
 * Public interface: `plainNode`, `markedNode`.
 * Owner context: `@sharpee/lang-en-us` tests.
 */

import type { TextContent } from '@sharpee/text-blocks';
import { isChosen } from '@sharpee/text-blocks';

/** A content node that is not a plain string. */
type NodeContent = Exclude<TextContent, string>;

/**
 * Project a non-string node with decorations contributing nothing.
 *
 * @param node the content node
 * @returns the chosen span's own projection, or `''` for a decoration
 */
export function plainNode(node: NodeContent): string {
  if (isChosen(node)) {
    return node.content.map((c) => (typeof c === 'string' ? c : plainNode(c))).join('');
  }
  return '';
}

/**
 * Project a non-string node with decorations marked by a sentinel.
 *
 * @param node the content node
 * @returns the chosen span's own projection, or `'⟦deco⟧'` for a decoration
 */
export function markedNode(node: NodeContent): string {
  if (isChosen(node)) {
    return node.content.map((c) => (typeof c === 'string' ? c : markedNode(c))).join('');
  }
  return '⟦deco⟧';
}
