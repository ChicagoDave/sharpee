/**
 * Event filtering stage — drops events that should not produce
 * text output (a story's own story events, system.* and platform
 * request-phase events).
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

/** The vocabulary of a story that raises no story events. */
const NO_STORY_EVENTS: ReadonlySet<string> = new Set();

/**
 * Filter events that should produce text output.
 *
 * Drops:
 *  - a story event (ADR-405) — an event whose type is in the installed
 *    story's story-event vocabulary. It is a signal the story raises for
 *    channels and machines, not prose, so no handler is offered it whatever
 *    its name or its data. Types are compared in lower case, the form the
 *    turn's event processor gives every event.
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
 *
 * @param events the turn's events
 * @param storyEvents the installed story's story-event types, in lower
 *   case; empty for a story that declares none
 * @returns the events the handlers stage is offered, in their given order
 */
export function filterEvents(
  events: ISemanticEvent[],
  storyEvents: ReadonlySet<string> = NO_STORY_EVENTS,
): ISemanticEvent[] {
  return events.filter((event) => {
    if (storyEvents.size > 0 && storyEvents.has(event.type.toLowerCase())) {
      return false;
    }
    if (event.type.startsWith('system.')) {
      return false;
    }
    if (event.type.startsWith('platform.')) {
      return !event.type.endsWith('_requested');
    }
    return true;
  });
}
