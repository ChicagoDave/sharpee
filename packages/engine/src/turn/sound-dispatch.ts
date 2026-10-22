/**
 * The sound stage: fan every sound made this turn out to every listener,
 * one audibility event per (sound × listener) pair delivered.
 *
 * A sound is made two ways, and both land in the buffer before the fan-out:
 * an action calls `context.emitSound` (ADR-172), and anything else — a
 * story's clause, a timer, a handler — records a `sound.emitted` event
 * carrying the `ISound` (ADR-374 D6), gathered here from the turn's events.
 * What is heard is applied through the world's handlers, as an action's
 * events are, so a listener's `after hearing` reacts in this turn.
 *
 * Runs after the plugin tick so sounds an NPC action emitted from the
 * tick are in the buffer too, and before the prose renders so the
 * audibility channel and the text see the events in this turn's packet.
 * The heard events and their reactions pass the one enrichment funnel as
 * their own source (`sound`), like the action's and each plugin's batch,
 * then join the turn's store, the event source, the configured callback,
 * the engine's emitter, and the result's events.
 *
 * A hearing is witnessed where the listener is, not where the sound came
 * from: a heard event names the sound's room as its location, so the stage
 * stamps its presence from the listener first — present when the player
 * heard it, else the player's presence at the listener's room — and the
 * funnel keeps that stamp.
 *
 * Public interface: `soundDispatchStage`.
 * Owner context: `@sharpee/engine` — the turn cycle.
 *
 * References: ADR-172 Phase 6 (spatial sound propagation), ADR-334 D4
 * (the one funnel), ADR-328 D3 (presence).
 */

import type { ISemanticEvent, Presence } from '@sharpee/core';
import { SOUND_EVENT_TYPES, type ISound } from '@sharpee/if-domain';
import type { TurnEngine, TurnStage } from './context.js';
import { enrichWithEngineContext, presenceResolver } from './enrich-events.js';

/**
 * A heard event with its presence taken from the listener (its `target`):
 * present when the listener is the player, else the player's presence at
 * the listener's room. Left unstamped without a perception service.
 *
 * @param engine the turn-facing engine surface
 * @param event a `sound.audibility.heard` event
 * @returns the event, stamped
 */
function witnessedByListener(engine: TurnEngine, event: ISemanticEvent): ISemanticEvent {
  const resolve = presenceResolver(engine);
  const listener = event.entities.target;
  if (!resolve || listener === undefined) return event;
  let presence: Presence | undefined;
  if (listener === engine.context.player.id) {
    presence = 'present';
  } else {
    const room = engine.world.getContainingRoom(listener);
    presence = room ? resolve(room.id) : undefined;
  }
  return presence === undefined ? event : { ...event, presence };
}

export const soundDispatchStage: TurnStage = {
  name: 'sound-dispatch',
  requires: ['plugin-tick'],
  async run(context) {
    const { engine, turn } = context;
    for (const event of engine.turnEventsOf(turn)) {
      if (event.type === SOUND_EVENT_TYPES.EMITTED) engine.soundBuffer.push(event.data as ISound);
    }
    if (engine.soundBuffer.length > 0) {
      const heard = engine.soundDispatcher.dispatch(engine.soundBuffer, engine.world, turn)
        .map((event) => witnessedByListener(engine, event));
      const audibilityEvents = enrichWithEngineContext(
        engine,
        engine.withWorldReactions(heard, turn),
        turn,
        engine.world.getLocation(engine.context.player.id),
        { kind: 'sound' }
      );
      if (audibilityEvents.length > 0) {
        engine.storeTurnEvents(turn, audibilityEvents);
        for (const e of audibilityEvents) {
          engine.eventSource.emit(e);
          if (engine.config.onEvent) engine.config.onEvent(e);
          engine.emit('event', e);
        }
        const result = context.result!;
        result.events = [...result.events, ...audibilityEvents];
      }
    }
    return 'continue';
  }
};
