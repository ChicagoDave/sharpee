/**
 * @sharpee/story-channel-service-test/renderer — `debug-stats`
 * `ChannelRenderer`.
 *
 * Owner context: AC-15 fixture story. Pure projection from the
 * `DebugStatsPayload` wire shape to a one-line string, plus a
 * `ChannelRenderer` factory that pipes that string to a caller-
 * supplied sink. The same projection is consumed by:
 *  - the CLI test harness, which uses `formatDebugStats` directly
 *    and asserts on the formatted lines;
 *  - the browser-renderer parity test, which constructs the
 *    `ChannelRenderer` and observes its DOM mutations.
 *
 * Keeping the projection separate from the sink ensures wire-
 * equivalence and renderer-equivalence assertions in AC-15 are
 * inspecting the same logic.
 */

import type { ChannelRenderer } from '@sharpee/channel-service';
import type { DebugStatsPayload } from './channels';

/**
 * Project a `DebugStatsPayload` (or any structurally-similar value)
 * into a single-line debug string. Returns `''` for shapes that
 * don't match — defensive against `null` / `undefined` emissions.
 */
export function formatDebugStats(value: unknown): string {
  if (!value || typeof value !== 'object') return '';
  const data = value as Partial<DebugStatsPayload>;
  if (typeof data.inventoryCount !== 'number') {
    return '';
  }
  return `[debug-stats inv=${data.inventoryCount}]`;
}

/**
 * Construct the story's `ChannelRenderer` for `debug-stats`. Each
 * `onValue` invocation projects the payload via `formatDebugStats`
 * and forwards the result to the supplied `sink`.
 *
 * Browser host: pass `(line) => slot.appendChild(doc.createElement('p')).textContent = line`.
 * CLI host: pass `(line) => console.log(line)` or push-to-buffer.
 */
export function createDebugStatsRenderer(
  sink: (line: string) => void,
): ChannelRenderer {
  return {
    onValue(value: unknown): void {
      const line = formatDebugStats(value);
      if (line) sink(line);
    },
  };
}

/**
 * Convenience factory: constructs a renderer that appends a `<p>` for
 * each emission to the supplied DOM container. Used by the AC-15
 * renderer-parity test (and any browser-side consumer that wants the
 * default visual presentation).
 */
export function createDebugStatsDomRenderer(slot: HTMLElement): ChannelRenderer {
  return createDebugStatsRenderer((line) => {
    const doc = slot.ownerDocument;
    const p = doc.createElement('p');
    p.classList.add('debug-stats-line');
    p.textContent = line;
    slot.appendChild(p);
  });
}
