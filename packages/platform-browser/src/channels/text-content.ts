/**
 * @sharpee/platform-browser/channels — TextContent → DOM helper.
 *
 * Owner context: browser default channel renderers. Projects a
 * `TextContent[]` array (the shape stdlib's `mainChannel` emits per
 * append entry) into a flat `<span>`-based fragment that preserves
 * decorations as nested elements.
 *
 * Decorations recognized: `em`, `strong`, `item`, `room`, `npc`,
 * `command`, `direction`, `underline`, `strikethrough`, `super`, `sub`
 * (per `@sharpee/text-blocks` `CORE_DECORATION_TYPES`). Unknown
 * decoration types render as `<span class="deco-{type}">` so stories
 * can style custom types via CSS.
 *
 * The function returns a `DocumentFragment` so the caller (the main
 * channel renderer) can append directly without an extra wrapper.
 */

import type { TextContent } from '@sharpee/text-blocks';

const DECORATION_TAG_MAP: Record<string, string> = {
  em: 'em',
  strong: 'strong',
  underline: 'u',
  strikethrough: 's',
  super: 'sup',
  sub: 'sub',
};

/**
 * Render a `TextContent[]` array into a `DocumentFragment`. String
 * nodes become text nodes; decoration nodes become tagged elements
 * with `data-deco` and a CSS class (`deco-em`, `deco-item`, etc.) so
 * authors can style them.
 */
export function renderTextContent(
  doc: Document,
  content: ReadonlyArray<TextContent>,
): DocumentFragment {
  const fragment = doc.createDocumentFragment();
  for (const node of content) {
    fragment.appendChild(renderNode(doc, node));
  }
  return fragment;
}

function renderNode(doc: Document, node: TextContent): Node {
  if (typeof node === 'string') {
    return doc.createTextNode(node);
  }
  const tag = DECORATION_TAG_MAP[node.type] ?? 'span';
  const el = doc.createElement(tag);
  el.setAttribute('data-deco', node.type);
  el.classList.add(`deco-${node.type}`);
  el.appendChild(renderTextContent(doc, node.content));
  return el;
}

/**
 * Project a `TextContent[]` array to a plain string (decorations
 * stripped). Used by status / prompt renderers that don't preserve
 * decorations.
 */
export function flattenTextContent(content: ReadonlyArray<TextContent>): string {
  let out = '';
  for (const node of content) {
    if (typeof node === 'string') out += node;
    else out += flattenTextContent(node.content);
  }
  return out;
}
