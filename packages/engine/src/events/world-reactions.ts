/**
 * world-reactions.ts — run events through the world's handlers and keep
 * what they produce.
 *
 * An action's events are applied to the world through the event processor,
 * so story handlers (ADR-052) react to them, and a handler that fails
 * surfaces as `command.failed` rather than vanishing (ADR-329 Phase 9b). A
 * sound heard in the world is the same kind of fact (ADR-374 D6), so the
 * sound stage applies its events the same way, and so does the plugin
 * stage for each new fact a turn plugin records. This is that one way, and
 * it stamps what it has applied (`ISemanticEvent.applied`), so a stage that
 * delivers an event again never applies it twice.
 *
 * Public interface: withWorldReactions, unappliedOf.
 * Owner context: `@sharpee/engine` — event application.
 */

import type { ISemanticEvent } from '@sharpee/core';
import type { EventProcessor } from '@sharpee/event-processor';

/**
 * Apply events through the event processor, and stamp each event and each
 * reaction `applied`: the world has had its one chance to react to it.
 *
 * @param processor - The engine's event processor (world handlers wired, ADR-086)
 * @param events - The events to apply, in order; none may already be applied
 * @param turn - The turn they belong to, for a failure's id
 * @param input - The player's input, when the events came from a command
 * @returns The events, then any handler reactions, then one `command.failed`
 *   per event whose application threw — a chain-fired clause's failure is a
 *   story rule's diagnostic by construction (GH #345)
 * @throws Error when an event is already stamped applied — a caller that
 *   would apply a fact twice (filter with `unappliedOf` first)
 */
export function withWorldReactions(
  processor: EventProcessor,
  events: ISemanticEvent[],
  turn: number,
  input?: string
): ISemanticEvent[] {
  if (events.length === 0) return events;
  const twice = events.find((e) => e.applied === true);
  if (twice) {
    throw new Error(`withWorldReactions: ${twice.type} (${twice.id}) has already been applied; a fact is applied once.`);
  }
  const processed = processor.processEvents(events);
  for (const event of events) event.applied = true;
  for (const reaction of processed.reactions ?? []) reaction.applied = true;
  let all = processed.reactions && processed.reactions.length > 0 ? [...events, ...processed.reactions] : events;
  for (const failure of processed.failed) {
    all = [...all, {
      id: `cmd_failed_${turn}_${Date.now()}_${all.length}`,
      type: 'command.failed',
      timestamp: Date.now(),
      entities: {},
      data: { reason: failure.reason, input, eventType: failure.event.type, storyRule: true }
    }];
  }
  return all;
}

/**
 * The events in a batch the world has not yet reacted to, in order: the
 * new facts a stage must apply before delivering the batch.
 *
 * @param events - A batch that may mix new facts with events delivered again
 */
export function unappliedOf(events: readonly ISemanticEvent[]): ISemanticEvent[] {
  return events.filter((e) => e.applied !== true);
}
