/**
 * @sharpee/platform-browser/channels/main — `main` channel renderer.
 *
 * Owner context: browser default. Implements ADR-165 §8 main-channel
 * behavior: append a `<p>` per entry to the `main` slot, with
 * decorations preserved.
 *
 * The `main` channel is append-mode; `value` is a `TextContent[][]`
 * (array of new entries this turn). Each entry becomes one `<p>`.
 *
 * `onClear(target)` empties the slot when a `clear` event with a
 * matching target arrives (ADR-165 §4 step 2).
 */

import type { ChannelRenderer } from '@sharpee/channel-service';
import type { TextContent } from '@sharpee/text-blocks';
import { renderTextContent } from './text-content';

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
      for (const entry of value) {
        if (!Array.isArray(entry)) continue;
        const p = doc.createElement('p');
        p.classList.add('main-entry');
        p.appendChild(renderTextContent(doc, entry as ReadonlyArray<TextContent>));
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
