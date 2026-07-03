/**
 * Event filtering stage — drops events that should not produce
 * text output (system.* and platform request-phase events).
 *
 * Public interface: `filterEvents`. Used internally by the prose
 * pipeline as the first per-turn stage.
 *
 * Owner context: `@sharpee/engine` — internal prose pipeline.
 *
 * @see ADR-174 §Engine-internal prose pipeline
 * @see ADR-096 (preserved): the filter responsibility ports unchanged
 *   from `@sharpee/text-service`.
 */

import type { ISemanticEvent } from '@sharpee/core';

/**
 * Filter events that should produce text output.
 *
 * Drops:
 *  - `system.*` — internal turn-cycle bookkeeping the player never sees.
 *  - `platform.*_requested` — request-phase platform events are control
 *    flow, never narration.
 *
 * Platform OUTCOME events (`platform.save_completed`,
 * `platform.undo_failed`, ...) pass through to the handlers stage, where
 * `handlePlatformEvent` renders the lang message registered under the
 * event type (silent when none is registered — quit/restart outcomes stay
 * quiet by default).
 *
 * Pass-through for everything else (domain events, action results,
 * lifecycle events, sound, etc.) — they reach the handlers stage.
 */
export function filterEvents(events: ISemanticEvent[]): ISemanticEvent[] {
  return events.filter((event) => {
    if (event.type.startsWith('system.')) {
      return false;
    }
    if (event.type.startsWith('platform.')) {
      return !event.type.endsWith('_requested');
    }
    return true;
  });
}
