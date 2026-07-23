/**
 * @sharpee/platform-browser/channels/panel — the generic dynamic-channel
 * panel renderer (ADR-241 D4).
 *
 * Owner context: browser default. Any dynamic channel with no exact-id
 * story renderer and no family match renders here, so a pure-IR story
 * can throw anything into a dynamic channel and SEE it — no story
 * TypeScript required for visibility. The console JSON-tree fallback
 * remains the debug view underneath; this is the player-facing default.
 *
 * Contract (pinned in ADR-241 D4):
 *  - one labelled box per channel id, hidden until its first value
 *    (the box is not created until a value arrives);
 *  - `replace` mode overwrites the box's key/value rows;
 *  - `append` mode appends rows;
 *  - `event` mode shows the latest value;
 *  - a `null` value (replace-mode hide signal, ADR-163 §6) removes
 *    the box.
 *
 * Public interface: `createGenericPanelRenderer(slot, channelId)` —
 * consumed by `registerDefaultBrowserRenderers` as the match-all
 * renderer factory; exported for stories that want the same box in a
 * custom layout.
 */

import type { ChannelRenderer, ChannelDefinition } from '@sharpee/channel-service';

/** DOM id for a channel's panel box. */
const panelId = (channelId: string): string => `channel-panel-${channelId.replace(/[^a-z0-9_-]/gi, '-')}`;

/**
 * Render one value as key/value row elements. Objects become one row
 * per entry; primitives become a single unlabelled row.
 */
function rowsFor(doc: Document, value: unknown): HTMLElement[] {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return Object.entries(value as Record<string, unknown>).map(([key, entry]) => {
      const row = doc.createElement('div');
      row.className = 'sharpee-channel-panel-row';
      const dt = doc.createElement('span');
      dt.className = 'sharpee-channel-panel-key';
      dt.textContent = key;
      const dd = doc.createElement('span');
      dd.className = 'sharpee-channel-panel-value';
      dd.textContent = typeof entry === 'string' ? entry : JSON.stringify(entry);
      row.append(dt, dd);
      return row;
    });
  }
  const row = doc.createElement('div');
  row.className = 'sharpee-channel-panel-row';
  const dd = doc.createElement('span');
  dd.className = 'sharpee-channel-panel-value';
  dd.textContent = typeof value === 'string' ? value : JSON.stringify(value);
  row.append(dd);
  return [row];
}

/**
 * Construct the generic panel renderer for one dynamic channel.
 *
 * @param slot — the container the box mounts into (the default layout's
 *   sidebar).
 * @param channelId — the channel this instance renders; labels the box.
 */
export function createGenericPanelRenderer(slot: HTMLElement, channelId: string): ChannelRenderer {
  const doc = slot.ownerDocument;

  const removeBox = (): void => {
    doc.getElementById(panelId(channelId))?.remove();
  };

  const ensureBox = (): HTMLElement => {
    let box = doc.getElementById(panelId(channelId));
    if (!box) {
      box = doc.createElement('div');
      box.id = panelId(channelId);
      box.className = 'sharpee-channel-panel';
      box.dataset.channel = channelId;
      const title = doc.createElement('div');
      title.className = 'sharpee-channel-panel-title';
      title.textContent = channelId;
      const rows = doc.createElement('div');
      rows.className = 'sharpee-channel-panel-rows';
      box.append(title, rows);
      slot.appendChild(box);
    }
    return box.querySelector('.sharpee-channel-panel-rows') as HTMLElement;
  };

  // ADR-253 D2: an author-supplied element named for the channel (`id=<channelId>`)
  // receives the value as text. The panel's own box is `id=channel-panel-<id>`, so
  // it never matches here. Absent → the generic panel below is the fallback.
  const namedElement = (): HTMLElement | null => doc.getElementById(channelId);

  return {
    onValue(value: unknown, channel: ChannelDefinition): void {
      // Render-by-DOM-name (ADR-253 D2): a string/primitive value lands as
      // textContent in the author's `#<channelId>` element when it exists.
      const named = namedElement();
      if (named && (value === null || typeof value !== 'object')) {
        if (value === null) named.textContent = '';
        else if (value !== undefined) named.textContent = String(value);
        return;
      }
      // No named element (or a structured value with no single-element text form,
      // ADR-253 D2) → the generic sidebar panel (D4 fallback).
      if (value === null) {
        removeBox();
        return;
      }
      if (value === undefined) return;
      const rows = ensureBox();
      if (channel.mode === 'append') {
        const entries = Array.isArray(value) ? value : [value];
        for (const entry of entries) rows.append(...rowsFor(doc, entry));
        return;
      }
      // replace + event: the box shows the latest value.
      rows.replaceChildren(...rowsFor(doc, value));
    },
    onClear(): void {
      const named = namedElement();
      if (named) named.textContent = '';
      removeBox();
    },
    onDestroy(): void {
      const named = namedElement();
      if (named) named.textContent = '';
      removeBox();
    },
  };
}
