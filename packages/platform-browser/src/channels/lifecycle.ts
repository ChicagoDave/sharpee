/**
 * @sharpee/platform-browser/channels/lifecycle — `lifecycle` channel
 * renderer for save/restore signals.
 *
 * Owner context: browser default. Replaces the legacy
 * `engine.on('event', ...)` branches that handled
 * `platform.save_failed`, `platform.restore_failed`, and
 * `platform.restore_completed` (Phase 2 of the
 * `channel-io-event-retirement` plan).
 *
 * The renderer is callback-driven rather than slot-driven because its
 * two side effects already exist as `BrowserClient` private methods
 * (`appendSystemMessage` writes to the main slot with a
 * `system-message` class; `renderCombinedStatus` refreshes the
 * combined score+turn element). Wiring both as callbacks keeps the
 * renderer testable in isolation and avoids re-implementing the
 * system-message DOM shape outside `BrowserClient`.
 *
 * @see ADR-163 — Channel-Service Platform — §6
 * @see docs/work/channel-io-event-retirement/plan-20260504-event-listener-retirement.md
 */

import type { ChannelRenderer } from '@sharpee/channel-service';
import type { LifecyclePayload } from '@sharpee/stdlib';

/**
 * Callbacks the lifecycle renderer invokes per payload kind.
 *
 * `appendSystemMessage` is invoked on `save_failed` and
 * `restore_failed` with a fully formatted `[Save failed: …]` /
 * `[Restore failed: …]` string. The fallback strings (`'Unknown
 * error'`, `'No saved game found'`) match the pre-Phase-2 messages so
 * the user-visible text is identical when the platform event carries
 * no `payload.error`.
 *
 * `onRestoreCompleted` is invoked with no arguments. The callback is
 * expected to refresh any UI derived from world state (score, turn,
 * location). The lifecycle channel does **not** carry the new turn
 * count — the standard `turn` channel's renderer keeps `currentTurn`
 * in sync because its closure re-emits every turn via `always`-mode.
 */
export interface LifecycleChannelRendererOptions {
  appendSystemMessage(text: string): void;
  onRestoreCompleted?(): void;
}

function isLifecyclePayload(value: unknown): value is LifecyclePayload {
  if (!value || typeof value !== 'object') return false;
  const kind = (value as { kind?: unknown }).kind;
  return (
    kind === 'save_failed' ||
    kind === 'restore_failed' ||
    kind === 'restore_completed'
  );
}

/**
 * Build the `lifecycle` channel renderer.
 *
 * Behavior per kind:
 * - `save_failed` → `appendSystemMessage('[Save failed: <message>]')`
 *   — message defaults to `'Unknown error'`.
 * - `restore_failed` → `appendSystemMessage('[Restore failed: <message>]')`
 *   — message defaults to `'No saved game found'`.
 * - `restore_completed` → `onRestoreCompleted?.()`.
 *
 * Unknown kinds are silently ignored (forward-compatible with future
 * lifecycle event types).
 */
export function createLifecycleChannelRenderer(
  opts: LifecycleChannelRendererOptions,
): ChannelRenderer {
  return {
    onValue(value: unknown): void {
      if (!isLifecyclePayload(value)) return;
      if (value.kind === 'save_failed') {
        opts.appendSystemMessage(
          `[Save failed: ${value.message ?? 'Unknown error'}]`,
        );
        return;
      }
      if (value.kind === 'restore_failed') {
        opts.appendSystemMessage(
          `[Restore failed: ${value.message ?? 'No saved game found'}]`,
        );
        return;
      }
      if (value.kind === 'restore_completed') {
        opts.onRestoreCompleted?.();
        return;
      }
    },
  };
}
