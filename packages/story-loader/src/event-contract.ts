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
 * Public interface: EVENT_TRIGGERS, EVENT_PAYLOAD_FIELDS,
 * enteringDestination.
 * Owner context: @sharpee/story-loader (type-only stdlib dep; erased at emit).
 */
import type { ActorMovedEventData } from '@sharpee/stdlib';

/**
 * Chord event verb → stdlib event type it binds to. Gerund register since
 * the ownership package (ratchet D3): entity clauses read `after entering
 * it`, so the map keys are gerunds.
 */
export const EVENT_TRIGGERS: Record<string, string> = {
  entering: 'if.event.actor_moved',
};

/**
 * Payload fields each trigger's filter reads. The mapped types are
 * compile-time probes: if stdlib renames a field, this file stops
 * compiling — the AC-9 CI failure.
 */
export const EVENT_PAYLOAD_FIELDS: { entering: keyof ActorMovedEventData & 'toRoom' } = {
  entering: 'toRoom',
};

/**
 * Type-guarded read of an `entering` event's destination — the runtime's
 * consumption-side half of the AC-9 contract (no blind payload casts). The
 * return type is chained to the stdlib payload type so a field-type change
 * fails this build too.
 * @param data the raw event payload (unknown shape at the seam)
 * @returns the destination room id, or undefined when absent/mis-shaped
 */
export function enteringDestination(data: unknown): ActorMovedEventData['toRoom'] | undefined {
  if (typeof data !== 'object' || data === null) return undefined;
  const value = (data as Record<string, unknown>)[EVENT_PAYLOAD_FIELDS.entering];
  return typeof value === 'string' ? value : undefined;
}

/**
 * Chord event verb → crossing event type when the clause owner is a REGION
 * (ADR-236 D6): going.ts emits one event per boundary actually crossed
 * (`getRegionCrossings` is the source of truth), so nesting transitivity —
 * a parent's reaction fires only when the parent boundary is crossed — is
 * the emitter's guarantee, not a runtime filter.
 */
export const REGION_EVENT_TRIGGERS: Record<string, string> = {
  entering: 'if.event.region_entered',
  leaving: 'if.event.region_exited', // ratchet R3 — the verb exists only for regions
};

/**
 * Type-guarded read of a crossing event's region — which region's boundary
 * was crossed (the WORLD entity id going.ts stamps as `regionId`). No
 * stdlib payload type exists for the crossing events (going.ts emits
 * inline objects), so the runtime pin is tests/event-selector.test.ts plus
 * the region-crossing REAL-PATH suite.
 * @param data the raw event payload (unknown shape at the seam)
 * @returns the crossed region's world entity id, or undefined
 */
export function crossingRegionId(data: unknown): string | undefined {
  if (typeof data !== 'object' || data === null) return undefined;
  const value = (data as Record<string, unknown>)['regionId'];
  return typeof value === 'string' ? value : undefined;
}
