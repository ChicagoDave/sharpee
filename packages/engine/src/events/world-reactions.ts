/**
 * world-reactions.ts — run events through the world's handlers and keep
 * what they produce.
 *
 * An action's events are applied to the world through the event processor,
 * so story handlers (ADR-052) react to them, and a handler that fails
 * surfaces as `command.failed` rather than vanishing (ADR-329 Phase 9b). A
 * sound heard in the world is the same kind of fact (ADR-374 D6), so the
 * sound stage applies its events the same way. This is that one way.
 *
 * Public interface: withWorldReactions.
 * Owner context: `@sharpee/engine` — event application.
 */

import type { ISemanticEvent } from '@sharpee/core';
import type { EventProcessor } from '@sharpee/event-processor';

/**
 * Apply events through the event processor.
 *
 * @param processor - The engine's event processor (world handlers wired, ADR-086)
 * @param events - The events to apply, in order
 * @param turn - The turn they belong to, for a failure's id
 * @param input - The player's input, when the events came from a command
 * @returns The events, then any handler reactions, then one `command.failed`
 *   per event whose application threw — a chain-fired clause's failure is a
 *   story rule's diagnostic by construction (GH #345)
 */
export function withWorldReactions(
  processor: EventProcessor,
  events: ISemanticEvent[],
  turn: number,
  input?: string
): ISemanticEvent[] {
  if (events.length === 0) return events;
  const processed = processor.processEvents(events);
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
