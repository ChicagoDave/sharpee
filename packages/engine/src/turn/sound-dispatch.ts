/**
 * The sound stage: fan every sound buffered this turn out to every
 * listener, one audibility event per (sound × listener) pair delivered.
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

import type { TurnStage } from './context.js';

export const soundDispatchStage: TurnStage = {
  name: 'sound-dispatch',
  requires: ['plugin-tick'],
  async run(context) {
    const { engine, turn } = context;
    if (engine.soundBuffer.length > 0) {
      const audibilityEvents = engine.soundDispatcher.dispatch(engine.soundBuffer, engine.world, turn);
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
