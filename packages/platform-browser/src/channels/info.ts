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
 * `info` channel — replace, json. Full story metadata.
 *
 * The renderer sets `document.title` from `value.title` and projects
 * every non-empty payload field as a `data-<field>` attribute on the
 * slot. Stories or author scripts query the slot for the fields they
 * want to display (about dialog, footer credits, etc.).
 *
 * Fields handled:
 *  - `title` → `document.title` and `data-title`
 *  - `author` → `data-author`
 *  - `version` → `data-version`
 *  - `description` → `data-description`
 *  - `buildDate` → `data-build-date`
 *  - `engineVersion` → `data-engine-version`
 *  - `clientVersion` → `data-client-version`
 *
 * Empty fields are skipped (the channel closure already filters
 * empties); the renderer does not clear stale attributes between
 * emissions because story info is stable across a session.
 */
export function createInfoChannelRenderer(
  slot: HTMLElement,
  opts: InfoChannelRendererOptions = {},
): ChannelRenderer {
  const doc = opts.doc ?? slot.ownerDocument;
  return {
    onValue(value: unknown): void {
      if (!value || typeof value !== 'object') return;
      const data = value as {
        title?: string;
        author?: string;
        version?: string;
        description?: string;
        buildDate?: string;
        engineVersion?: string;
        clientVersion?: string;
      };
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
      if (typeof data.description === 'string') {
        slot.setAttribute('data-description', data.description);
      }
      if (typeof data.buildDate === 'string') {
        slot.setAttribute('data-build-date', data.buildDate);
      }
      if (typeof data.engineVersion === 'string') {
        slot.setAttribute('data-engine-version', data.engineVersion);
      }
      if (typeof data.clientVersion === 'string') {
        slot.setAttribute('data-client-version', data.clientVersion);
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
