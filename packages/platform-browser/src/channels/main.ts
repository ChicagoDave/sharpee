/**
 * @sharpee/platform-browser/channels/main — `main` channel renderer.
 *
 * Owner context: browser default. Implements ADR-165 §8 main-channel
 * behavior: append a `<p>` per entry to the `main` slot, with
 * decorations preserved.
 *
 * The `main` channel is append-mode; `value` is a `MainEntry[]`
 * (array of new entries this turn). Each entry becomes one `<p>`.
 * Entries with `tight: true` get a `main-entry--tight` class so CSS
 * can collapse the inter-paragraph margin against the previous entry.
 *
 * `onClear(target)` empties the slot when a `clear` event with a
 * matching target arrives (ADR-165 §4 step 2).
 */

import type { ChannelRenderer } from '@sharpee/channel-service';
import type { MainEntry } from '@sharpee/if-domain';
import type { TextContent } from '@sharpee/text-blocks';
import { renderTextContent } from './text-content.js';

export interface MainChannelRendererOptions {
  /**
   * Optional callback fired after appending. The browser client uses
   * this to scroll the slot's containing window to the bottom.
   */
  onAfterAppend?(slot: HTMLElement): void;
}

/**
 * Construct the default browser `main` channel renderer.
 *
 * @param slot — the `main` slot HTMLElement (typically a `<div>` or
 *   `<article>` inside a scrolling container). Each turn's entries
 *   are appended as `<p>` children.
 */
export function createMainChannelRenderer(
  slot: HTMLElement,
  opts: MainChannelRendererOptions = {},
): ChannelRenderer {
  const doc = slot.ownerDocument;
  return {
    onValue(value: unknown): void {
      if (!Array.isArray(value)) return;
      for (const raw of value) {
        const entry = normalizeEntry(raw);
        if (!entry) continue;
        const p = doc.createElement('p');
        p.classList.add('main-entry');
        if (entry.tight) p.classList.add('main-entry--tight');
        if (entry.className) p.classList.add(entry.className);
        // No `white-space: pre-line`. Engine handlers split `\n` into
        // block boundaries via `createBlocks`; entries marked `tight`
        // get the `main-entry--tight` class so the inter-paragraph
        // margin collapses and continuation lines stack flush.
        // `entry.className` carries semantic identity (game-title,
        // story-version, etc.) for per-piece CSS styling.
        p.appendChild(renderTextContent(doc, entry.content));
        slot.appendChild(p);
      }
      opts.onAfterAppend?.(slot);
    },
    onClear(): void {
      // Reset slot DOM. State store is reset by the dispatcher.
      while (slot.firstChild) slot.removeChild(slot.firstChild);
    },
  };
}

/**
 * Accept either the new `MainEntry` shape or the legacy `TextContent[]`
 * array shape (saves and pre-refactor packets in flight). Returns null
 * for anything that doesn't look like an entry.
 */
function normalizeEntry(raw: unknown): MainEntry | null {
  if (Array.isArray(raw)) {
    return { content: raw as ReadonlyArray<TextContent> };
  }
  if (raw && typeof raw === 'object' && 'content' in raw) {
    const obj = raw as { content: unknown; tight?: unknown; className?: unknown };
    if (!Array.isArray(obj.content)) return null;
    return {
      content: obj.content as ReadonlyArray<TextContent>,
      ...(obj.tight ? { tight: true } : {}),
      ...(typeof obj.className === 'string' && obj.className
        ? { className: obj.className }
        : {}),
    };
  }
  return null;
}
