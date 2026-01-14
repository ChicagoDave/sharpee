/**
 * Event filtering stage
 *
 * Filters out events that should not produce text output:
 * - System events (system.*)
 *
 * @see ADR-096 Text Service Architecture
 */

import type { ISemanticEvent } from '@sharpee/core';

/**
 * Filter events that should produce text output
 */
export function filterEvents(events: ISemanticEvent[]): ISemanticEvent[] {
  return events.filter((event) => {
    // Skip system events
    if (event.type.startsWith('system.')) {
      return false;
    }

    return true;
  });
}
