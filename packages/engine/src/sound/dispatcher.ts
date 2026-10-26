// packages/engine/src/sound/dispatcher.ts

/**
 * Per-turn audibility dispatcher (ADR-172 Phase 6).
 *
 * Closes the loop between `emitSound` (authoring API; Step 6.1) and the
 * `audibility` channel (Phase 5). For each `ISound` buffered during a
 * turn, the dispatcher walks every entity carrying `ListenerTrait`,
 * calls `propagate(sound, listenerId, world, timestamp)`, and emits one
 * `sound.audibility.heard` `ISemanticEvent` per (sound × listener) pair
 * that produced a non-null `IAudibilityEvent`.
 *
 * The dispatcher is pure: same buffer + same world state + same
 * timestamp → same event array. Listeners are processed in entity-id
 * sort order for deterministic event ordering across turns and runs.
 *
 * Owner context: `@sharpee/engine` — runtime / sound subsystem.
 *
 * Public interface:
 *   - `class SoundDispatcher` — the dispatcher itself.
 *   - `SoundDispatcher.dispatch(buffer, world, timestamp)` — produces
 *     the `sound.audibility.heard` events for the turn.
 *
 * @see ADR-172 — Spatial Sound Propagation
 * @see ADR-163 — Channel-Service Platform (audibility channel)
 */

import { createEvent, type ISemanticEvent } from '@sharpee/core';
import { SOUND_EVENT_TYPES, type IAudibilityEvent, type ISound } from '@sharpee/if-domain';
import { TraitType, type IFEntity, type WorldModel } from '@sharpee/world-model';
import { propagate as defaultPropagate } from './propagation.js';

/**
 * Per-turn audibility dispatcher.
 *
 * The class shape (rather than a free function) leaves room for a
 * future propagate-injection point in tests and for caching listener
 * lookups across multi-action turns. For Phase 6 the dispatcher is a
 * thin wrapper around `propagate()`; the class structure is the
 * extension seam for L2's "NPC voice profile" layer.
 */
export class SoundDispatcher {
  /**
   * The propagation function the dispatcher uses. Defaulted to the
   * production `propagate` from `./propagation`; tests may inject a
   * fake to isolate dispatcher behavior from edge-graph + Dijkstra
   * complexity.
   */
  private readonly propagate: (
    sound: ISound,
    listenerId: string,
    world: WorldModel,
    timestamp: number,
  ) => IAudibilityEvent | null;

  constructor(
    propagateFn: (
      sound: ISound,
      listenerId: string,
      world: WorldModel,
      timestamp: number,
    ) => IAudibilityEvent | null = defaultPropagate,
  ) {
    this.propagate = propagateFn;
  }

  /**
   * Dispatch every buffered sound to every listener.
   *
   * @param buffer    The per-turn sound buffer; iterated in insertion
   *                  order. May be empty (quiet turn).
   * @param world     The world model the propagation function reads
   *                  from. Must be the same instance the actions
   *                  mutated during the turn.
   * @param timestamp The turn-sequence integer the engine assigns to
   *                  this turn. Used as the `IAudibilityEvent.timestamp`
   *                  for ordering across multi-emission turns.
   * @returns         Array of `sound.audibility.heard` events, one per
   *                  (sound × listener) where `propagate()` returned
   *                  non-null. Order: outer iteration over the buffer in
   *                  emission order, inner iteration over listeners
   *                  sorted by entity id ascending.
   */
  dispatch(
    buffer: readonly ISound[],
    world: WorldModel,
    timestamp: number,
  ): ISemanticEvent[] {
    if (buffer.length === 0) return [];

    const listeners = world
      .findByTrait(TraitType.LISTENER)
      .slice()
      .sort((a: IFEntity, b: IFEntity) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));

    if (listeners.length === 0) return [];

    const events: ISemanticEvent[] = [];

    for (const sound of buffer) {
      for (const listener of listeners) {
        const audibility = this.propagate(sound, listener.id, world, timestamp);
        if (!audibility) continue;
        events.push(buildAudibilityEvent(audibility, listener.id));
      }
    }

    return events;
  }
}

/**
 * Build the `sound.audibility.heard` semantic event from a propagation
 * result and the listener that perceived it.
 *
 * `entities` mapping:
 *  - `actor`    → `sourceEntityId` (who emitted the sound)
 *  - `location` → `sourceRoomId`   (where the sound came from)
 *  - `target`   → listenerId       (who heard it)
 *
 * The `audibility` channel projection (ADR-163, ADR-172 Phase 5) reads
 * the `IAudibilityEvent` from `event.data`; `entities` is provided for
 * downstream filters and handlers that want a fast "who heard / from
 * where" lookup without re-reading `data`.
 */
function buildAudibilityEvent(
  audibility: IAudibilityEvent,
  listenerId: string,
): ISemanticEvent {
  return createEvent(
    SOUND_EVENT_TYPES.AUDIBILITY_HEARD,
    audibility as unknown as Record<string, unknown>,
    {
      actor: audibility.sourceEntityId,
      location: audibility.sourceRoomId,
      target: listenerId,
    },
  );
}
