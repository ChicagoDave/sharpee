/**
 * event-selector.test.ts — AC-9: the event-selector map (Chord event verbs
 * → stdlib event types/payload fields) stays in sync with stdlib.
 *
 * Two enforcement layers:
 *  1. COMPILE TIME — src/event-contract.ts imports the payload TYPE from
 *     stdlib; renaming `toRoom` breaks this package's build.
 *  2. RUNTIME — this test pins the map's completeness against the chord
 *     catalog and the event-type strings against stdlib's actual emission
 *     site (the golden transcript gates prove the full end-to-end path).
 */
import { describe, expect, it } from 'vitest';
import { EVENT_VERBS } from '@sharpee/chord';
import { EVENT_PAYLOAD_FIELDS, EVENT_TRIGGERS, REGION_EVENT_TRIGGERS } from '../src';

describe('AC-9: event-selector map sync', () => {
  it('every curated chord event verb has a trigger binding (room-side or region-side)', () => {
    for (const verb of EVENT_VERBS) {
      expect(
        EVENT_TRIGGERS[verb] ?? REGION_EVENT_TRIGGERS[verb],
        `trigger for \`${verb}\``,
      ).toBeDefined();
    }
  });

  it('pins the region crossing contract (ADR-236 D6, ratchet R3)', () => {
    expect(REGION_EVENT_TRIGGERS.entering).toBe('if.event.region_entered');
    expect(REGION_EVENT_TRIGGERS.leaving).toBe('if.event.region_exited');
    // `leaving` is region-only: no room-side binding may appear without its
    // own ratchet entry.
    expect(EVENT_TRIGGERS.leaving).toBeUndefined();
  });

  it('every trigger names a payload field the filter reads', () => {
    for (const verb of Object.keys(EVENT_TRIGGERS)) {
      expect(
        EVENT_PAYLOAD_FIELDS[verb as keyof typeof EVENT_PAYLOAD_FIELDS],
        `payload field for \`${verb}\``,
      ).toBeDefined();
    }
  });

  it('pins the entering contract (type string + payload field)', () => {
    // Gerund register since the ownership package (ratchet D3): entity
    // clauses read `after entering it`. The type string is pinned here AND
    // proven live by the Cloak/Zoo golden gates (the stumble clause fires
    // on real movement events).
    expect(EVENT_TRIGGERS.entering).toBe('if.event.actor_moved');
    expect(EVENT_PAYLOAD_FIELDS.entering).toBe('toRoom');
  });
});
