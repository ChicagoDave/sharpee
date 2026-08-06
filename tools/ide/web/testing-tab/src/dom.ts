/**
 * dom.ts — the two DOM helpers the views share.
 *
 * Purpose: the tab is framework-free by decision (the web UI carries no React,
 *   Lit or web-component layer), so element construction needs one small helper
 *   rather than a library. `el` builds and `byId` looks up; nothing else here
 *   earns a module.
 *
 *   `el` sets text via `textContent`, never `innerHTML`. Every string the tab
 *   renders — a command, a story's error text, a file path — comes from a story
 *   under test, and a page that interpolates that into markup is one `<img
 *   onerror>` away from executing it inside the IDE's web view.
 *
 * Public interface: el, byId.
 * Owner context: tools/ide — the Testing tab's web bundle.
 */

/** Builds an element with an optional class and text content. */
export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string | null,
  text?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

/** Looks up a required element by id, failing loudly if the markup drifted. */
export function byId<T extends HTMLElement = HTMLElement>(id: string): T {
  const found = document.getElementById(id);
  if (!found) throw new Error(`Testing tab markup is missing #${id}`);
  return found as T;
}
