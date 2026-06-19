/**
 * @sharpee/platform-browser/channels — TextContent → DOM helper.
 *
 * Owner context: browser default channel renderers. Projects a
 * `TextContent[]` array (the shape stdlib's `mainChannel` emits per
 * append entry) into a flat `<span>`-based fragment that preserves
 * decorations as nested elements.
 *
 * Per ADR-174, every decoration on the wire is `IDecoration { className,
 * content }` — the bracket parser already resolved platform-vocabulary
 * names to their `sharpee-`-prefixed final form. The renderer's job is
 * to wrap the content in a `<span>` carrying that class verbatim;
 * styling is supplied by the platform's prose CSS bundle (see Phase 1
 * sub-phase 1.7). Author classes (no `sharpee-` prefix) flow through
 * unchanged so stories own their own CSS.
 */

import type { TextContent, IDecoration } from '@sharpee/text-blocks';

/**
 * Render a `TextContent[]` array into a `DocumentFragment`. String
 * nodes become text nodes; decoration nodes become `<span>` elements
 * whose `class` is the final, fully-resolved CSS class name from the
 * decoration node.
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
  return renderDecoration(doc, node);
}

function renderDecoration(doc: Document, node: IDecoration): Node {
  const inner = renderTextContent(doc, node.content);
  if (node.className === '') {
    // Defensive: parser shouldn't emit empty className per AC-12, but
    // if one slips through, render the inner content without wrapping.
    return inner;
  }
  const el = doc.createElement('span');
  el.className = node.className;
  if (node.value !== undefined) {
    // ADR-183: a parameterized decoration carries its value as a data
    // attribute — never an inline style. Platform/author CSS reads it.
    el.setAttribute('data-value', node.value);
  }
  el.appendChild(inner);
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
