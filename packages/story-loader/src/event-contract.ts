/**
 * event-contract.ts — the event-selector map (AC-9, ADR-210 Interface
 * Contract 2 slice): Chord event verbs → the stdlib event types/payload
 * fields the runtime binds and filters on.
 *
 * SYNC ENFORCEMENT: the type-only stdlib import below makes this package's
 * BUILD fail if stdlib renames the event payload fields the map depends on
 * (`toRoom` on actor-moved). Renaming the event TYPE string is caught by
 * tests/event-selector.test.ts and the golden transcript gates.
 *
 * Public interface: EVENT_TRIGGERS, EVENT_PAYLOAD_FIELDS.
 * Owner context: @sharpee/story-loader (type-only stdlib dep; erased at emit).
 */
import type { ActorMovedEventData } from '@sharpee/stdlib';

/** Chord event verb → stdlib event type it binds to (Phase A/B set). */
export const EVENT_TRIGGERS: Record<string, string> = {
  enters: 'if.event.actor_moved',
};

/**
 * Payload fields each trigger's filter reads. The mapped types are
 * compile-time probes: if stdlib renames a field, this file stops
 * compiling — the AC-9 CI failure.
 */
export const EVENT_PAYLOAD_FIELDS: { enters: keyof ActorMovedEventData & 'toRoom' } = {
  enters: 'toRoom',
};
