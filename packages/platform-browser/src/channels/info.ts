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
 *  - `authors` → `data-authors` (wire array joined ", " for display —
 *    the client owns formatting per ADR-298's data-only-wire rule)
 *  - `testers` → `data-testers` (joined ", ")
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
        authors?: string[];
        testers?: string[];
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
      if (Array.isArray(data.authors) && data.authors.length > 0) {
        slot.setAttribute('data-authors', data.authors.join(', '));
      }
      if (Array.isArray(data.testers) && data.testers.length > 0) {
        slot.setAttribute('data-testers', data.testers.join(', '));
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

/**
 * `banner` channel — replace, json. The opening banner as properties: title,
 * versions, sub-title, credits and any story tail.
 *
 * Each piece gets its own element and class so a page can style or reorder
 * them; the banner moved off `main` to become addressable, not to move on the
 * page, so the default order matches what it always looked like.
 */
export function createBannerChannelRenderer(slot: HTMLElement): ChannelRenderer {
  return {
    onValue(value: unknown): void {
      if (!value || typeof value !== 'object') return;
      const banner = value as Record<string, unknown>;
      const doc = slot.ownerDocument;

      const emit = (text: unknown, className: string): void => {
        if (typeof text !== 'string' || text.length === 0) return;
        const p = doc.createElement('p');
        p.className = className;
        p.textContent = text;
        slot.appendChild(p);
      };

      emit(banner.title, 'sharpee-banner-title');
      emit(banner.storyVersion, 'sharpee-banner-story-version');
      emit(banner.platformVersion, 'sharpee-banner-platform-version');
      emit(banner.subtitle, 'sharpee-banner-subtitle');
      for (const credit of (banner.credits as unknown[]) ?? []) {
        emit(credit, 'sharpee-banner-credit');
      }
      for (const line of (banner.tail as unknown[]) ?? []) {
        emit(line, 'sharpee-banner-tail');
      }
    },
  };
}

/**
 * `story.chapter` channel — replace, json (ADR-330 D4). A chapter beginning
 * as properties: `title`, `description` (empty when the row has none),
 * `name`, `ordinal`. The platform default is a title card in the prose log —
 * the title, then the description when there is one — each piece its own
 * element and class so a page can style, reorder, or hide it (ADR-165: the
 * wire is data; the card is the client's). The name and ordinal are carried
 * as data attributes for a page that wants them; they are never printed.
 */
export function createChapterChannelRenderer(slot: HTMLElement): ChannelRenderer {
  return {
    onValue(value: unknown): void {
      if (!value || typeof value !== 'object') return;
      const chapter = value as Record<string, unknown>;
      const doc = slot.ownerDocument;
      const card = doc.createElement('div');
      card.className = 'sharpee-chapter';
      if (typeof chapter.name === 'string') card.setAttribute('data-chapter', chapter.name);
      if (typeof chapter.ordinal === 'number') card.setAttribute('data-chapter-ordinal', String(chapter.ordinal));

      const emit = (text: unknown, className: string): void => {
        if (typeof text !== 'string' || text.length === 0) return;
        const p = doc.createElement('p');
        p.className = className;
        p.textContent = text;
        card.appendChild(p);
      };
      emit(chapter.title, 'sharpee-chapter-title');
      emit(chapter.description, 'sharpee-chapter-description');
      if (card.childElementCount === 0) return;
      slot.appendChild(card);
    },
  };
}

/**
 * `prologue` channel — replace, text. Pre-banner prologue prose
 * (ADR-298 D3). Renders the resolved text into the slot as one
 * paragraph per blank-line-separated chunk. The slot is expected to
 * sit before the banner/main region in the platform's default layout
 * (ADR-298's default rendering order); authors restyle or relocate it
 * per the customizable-client architecture.
 */
export function createPrologueChannelRenderer(slot: HTMLElement): ChannelRenderer {
  return {
    onValue(value: unknown): void {
      if (typeof value !== 'string' || value.length === 0) return;
      const doc = slot.ownerDocument;
      slot.textContent = '';
      for (const para of value.split(/\n{2,}/)) {
        const p = doc.createElement('p');
        p.className = 'sharpee-prologue';
        p.textContent = para;
        slot.appendChild(p);
      }
    },
  };
}
