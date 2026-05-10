/**
 * Event filtering stage — drops events that should not produce
 * text output (system.* and platform.*).
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
 *  - `platform.*` — save/restore/quit/restart requests and completions.
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
      return false;
    }
    return true;
  });
}
