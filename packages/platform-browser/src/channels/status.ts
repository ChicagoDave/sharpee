/**
 * @sharpee/platform-browser/channels/status — `location`, `score`,
 * `turn` channel renderers.
 *
 * Owner context: browser default. Implements ADR-165 §8 status-line
 * behavior: each status field is its own renderer writing into a
 * dedicated DOM element. Three small renderers, factored for clarity.
 *
 * The default browser layout's `status` slot contains three
 * sub-elements (`status-location`, `status-score`, `status-turn`).
 * Stories that customize the status line replace individual renderers
 * by registering a different `ChannelRenderer` against the same
 * channel id.
 */

import type { ChannelRenderer } from '@sharpee/channel-service';

/**
 * `location` channel — replace, json `LocationHeadingValue` (ADR-349 D12).
 *
 * Writes the heading the locale already joined. A client that wants a narrower
 * status bar reads `parts` and drops one — ADR-174's classes are how a part is
 * shortened or hidden — rather than asking the engine for a different string;
 * the two surfaces carry the same content by construction (D3a).
 *
 * The payload's shape changed from a bare `string` in the same one-shot cutover
 * that changed the producer (D12), so a stale client fails loudly here rather
 * than rendering half a heading.
 */
export function createLocationChannelRenderer(
  el: HTMLElement,
): ChannelRenderer {
  return {
    onValue(value: unknown): void {
      if (!value || typeof value !== 'object') return;
      const heading = value as { text?: unknown };
      if (typeof heading.text !== 'string') return;
      el.textContent = heading.text;
    },
  };
}

/**
 * `score` channel — replace, json `{ current, max }`. Writes
 * `Score: 42` (no max) or `Score: 42 / 100` (bounded).
 */
export function createScoreChannelRenderer(el: HTMLElement): ChannelRenderer {
  return {
    onValue(value: unknown): void {
      if (!value || typeof value !== 'object') return;
      const data = value as { current?: number; max?: number | null };
      const current = typeof data.current === 'number' ? data.current : 0;
      const max = typeof data.max === 'number' ? data.max : null;
      el.textContent = max !== null
        ? `Score: ${current} / ${max}`
        : `Score: ${current}`;
    },
  };
}

/**
 * `turn` channel — replace, number. Writes `Turns: N`.
 */
export function createTurnChannelRenderer(el: HTMLElement): ChannelRenderer {
  return {
    onValue(value: unknown): void {
      if (typeof value !== 'number') return;
      el.textContent = `Turns: ${value}`;
    },
  };
}
