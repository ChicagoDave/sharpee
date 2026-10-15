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
 * The events join the turn's store, the event source, the configured
 * callback, the engine's emitter, and the result's events.
 *
 * Public interface: `soundDispatchStage`.
 * Owner context: `@sharpee/engine` — the turn cycle.
 *
 * References: ADR-172 Phase 6 (spatial sound propagation).
 */

import { SOUND_EVENT_TYPES, type ISound } from '@sharpee/if-domain';
import type { TurnStage } from './context.js';

export const soundDispatchStage: TurnStage = {
  name: 'sound-dispatch',
  requires: ['plugin-tick'],
  async run(context) {
    const { engine, turn } = context;
    for (const event of engine.turnEventsOf(turn)) {
      if (event.type === SOUND_EVENT_TYPES.EMITTED) engine.soundBuffer.push(event.data as ISound);
    }
    if (engine.soundBuffer.length > 0) {
      const heard = engine.soundDispatcher.dispatch(engine.soundBuffer, engine.world, turn);
      const audibilityEvents = engine.withWorldReactions(heard, turn);
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
