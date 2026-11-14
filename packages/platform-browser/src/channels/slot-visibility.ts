/**
 * @sharpee/platform-browser/channels/slot-visibility — a layout slot is
 * shown exactly while it holds content.
 *
 * Owner context: browser default. The sidebar and media slots start
 * hidden (in the default page, and when `BrowserClient` synthesizes them
 * for a page that omits them), because most stories never fill them. A
 * renderer that mounts content into such a slot reveals it, and conceals
 * it again once the last piece of content is gone, so nothing a story
 * shows is ever in the document but invisible (GH #718).
 *
 * Invariant: only a slot this module revealed is ever concealed. A slot
 * the author's page shows on its own (no `hidden` attribute) is never
 * hidden, whatever it holds.
 *
 * Public interface: `revealSlot`, `concealSlotWhenEmpty` — used by the
 * panel and image renderers.
 */

/** Marks a slot whose `hidden` attribute this module cleared. */
const REVEALED_ATTRIBUTE = 'data-sharpee-revealed';

/**
 * Show a slot that is about to hold content.
 *
 * @param slot the layout slot; a slot that is already shown is left alone
 */
export function revealSlot(slot: HTMLElement): void {
  if (!slot.hidden) return;
  slot.hidden = false;
  slot.setAttribute(REVEALED_ATTRIBUTE, '');
}

/**
 * Hide a slot again once it holds no content, if this module revealed it.
 *
 * @param slot the layout slot
 * @param contentSelector matches the content a renderer mounts in this
 *   slot; the slot stays shown while any element matches
 */
export function concealSlotWhenEmpty(slot: HTMLElement, contentSelector: string): void {
  if (!slot.hasAttribute(REVEALED_ATTRIBUTE)) return;
  if (slot.querySelector(contentSelector)) return;
  slot.hidden = true;
  slot.removeAttribute(REVEALED_ATTRIBUTE);
}
