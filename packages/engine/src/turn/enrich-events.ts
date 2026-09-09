/**
 * The enrichment stage: the action's events pass the one funnel, join
 * the turn's store and the event source, and queue any platform request.
 *
 * Events already stored for the turn (a `game.started` from `start()`)
 * are kept ahead of the action's. Platform requests among the enriched
 * events go to the pending list the platform-operations stage drains.
 *
 * Public interface: `enrichEventsStage`.
 * Owner context: `@sharpee/engine` — the turn cycle.
 *
 * References: ADR-334 D4 (the one funnel).
 */

import { isPlatformRequestEvent, type IPlatformEvent } from '@sharpee/core';
import type { TurnStage } from './context.js';

export const enrichEventsStage: TurnStage = {
  name: 'enrich-events',
  requires: ['execute-command'],
  async run(context) {
    const { engine, turn } = context;
    const result = context.result!;

    context.semanticEvents = engine.enrichTurnEvents(
      result.events,
      turn,
      engine.world.getLocation(engine.context.player.id),
      { kind: 'action' }
    );

    const existingEvents = engine.turnEvents.get(turn) || [];
    engine.turnEvents.set(turn, [...existingEvents, ...context.semanticEvents]);

    for (const semanticEvent of context.semanticEvents) {
      engine.eventSource.emit(semanticEvent);
      if (isPlatformRequestEvent(semanticEvent)) {
        engine.pendingPlatformOps.push(semanticEvent as IPlatformEvent);
      }
    }
    return 'continue';
  }
};
