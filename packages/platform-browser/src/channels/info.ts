/**
 * @sharpee/platform-browser/channels/info — `info` and `ifid` channel
 * renderers.
 *
 * Owner context: browser default. Implements ADR-165 §8 info-channel
 * behavior: set the document title from the story info payload, and
 * write the IFID to a meta region (typically hidden).
 */

import type { ChannelRenderer } from '@sharpee/channel-service';

export interface InfoChannelRendererOptions {
  /**
   * Document object whose `title` is updated. Defaults to the
   * `slot.ownerDocument`. Tests pass an explicit `Document` so they
   * can assert on the title without touching the test runner's
   * window.
   */
  doc?: Document;
}

/**
 * `info` channel — replace, json `{ title, author, version }`.
 *
 * The renderer sets `document.title` from `value.title`. Author /
 * version are stored as `data-` attributes on the slot for stories
 * that want to surface them.
 */
export function createInfoChannelRenderer(
  slot: HTMLElement,
  opts: InfoChannelRendererOptions = {},
): ChannelRenderer {
  const doc = opts.doc ?? slot.ownerDocument;
  return {
    onValue(value: unknown): void {
      if (!value || typeof value !== 'object') return;
      const data = value as { title?: string; author?: string; version?: string };
      if (typeof data.title === 'string') {
        doc.title = data.title;
        slot.setAttribute('data-title', data.title);
      }
      if (typeof data.author === 'string') {
        slot.setAttribute('data-author', data.author);
      }
      if (typeof data.version === 'string') {
        slot.setAttribute('data-version', data.version);
      }
    },
  };
}

/**
 * `ifid` channel — replace, text. Writes the IFID to a `data-ifid`
 * attribute on the slot. Typically not visible — stories query it
 * through the DOM if they need it.
 */
export function createIfidChannelRenderer(slot: HTMLElement): ChannelRenderer {
  return {
    onValue(value: unknown): void {
      if (typeof value !== 'string') return;
      slot.setAttribute('data-ifid', value);
    },
  };
}
