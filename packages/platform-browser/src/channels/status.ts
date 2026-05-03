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
 * `location` channel — replace, text. Writes the room name into a
 * status-line element.
 */
export function createLocationChannelRenderer(
  el: HTMLElement,
): ChannelRenderer {
  return {
    onValue(value: unknown): void {
      if (typeof value !== 'string') return;
      el.textContent = value;
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
