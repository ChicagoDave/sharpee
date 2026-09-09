/**
 * The enrichment stage: the action's events pass the one funnel, join
 * the turn's store and the event source, and queue any platform request.
 *
 * Events already stored for the turn (a `game.started` from `start()`)
 * are kept ahead of the action's. Platform requests among the enriched
 * events go to the pending list the platform-operations stage drains.
 *
 * Public interface: `enrichEventsStage`, `enrichWithEngineContext`.
 * Owner context: `@sharpee/engine` — the turn cycle.
 *
 * References: ADR-334 D4 (the one funnel).
 */

import { isPlatformRequestEvent, type IPlatformEvent, type ISemanticEvent, type Presence } from '@sharpee/core';
import { enrichTurnEvents, type TurnEventSource } from './turn-event-processor.js';
import type { TurnStage, TurnEngine } from './context.js';

/**
 * The presence resolver enrichment stamps events with: the current
 * player's presence at the location a producer stamped, asked of the
 * perception service. None when the engine has no perception service.
 */
function presenceResolver(engine: TurnEngine): ((locationId: string) => Presence) | undefined {
  const service = engine.perceptionService;
  if (!service) return undefined;
  return (locationId) => service.presenceOf(engine.context.player, locationId, engine.world);
}

/**
 * The one enrichment funnel with the engine's context filled in: the
 * turn, the player, the location the producer ran at, presence, and
 * perception filtering. Both the action's events and each plugin's batch
 * pass through here.
 * @param engine the turn-facing engine surface
 * @param events the batch to enrich
 * @param turn the turn the batch belongs to
 * @param locationId the player's location when the batch was produced
 * @param source who produced the batch: the action, or a plugin by id
 * @returns the enriched, perception-filtered events
 */
export function enrichWithEngineContext(
  engine: TurnEngine,
  events: readonly ISemanticEvent[],
  turn: number,
  locationId: string | null | undefined,
  source: TurnEventSource
): ISemanticEvent[] {
  return enrichTurnEvents(events, source, {
    turn,
    playerId: engine.context.player.id,
    locationId: locationId ?? undefined,
    presenceOf: presenceResolver(engine),
    perception: engine.perceptionService
      ? { service: engine.perceptionService, player: engine.context.player, world: engine.world }
      : undefined
  });
}

export const enrichEventsStage: TurnStage = {
  name: 'enrich-events',
  requires: ['execute-command'],
  async run(context) {
    const { engine, turn } = context;
    const result = context.result!;

    context.semanticEvents = enrichWithEngineContext(
      engine,
      result.events,
      turn,
      engine.world.getLocation(engine.context.player.id),
      { kind: 'action' }
    );

    engine.storeTurnEvents(turn, context.semanticEvents);

    for (const semanticEvent of context.semanticEvents) {
      engine.eventSource.emit(semanticEvent);
      if (isPlatformRequestEvent(semanticEvent)) {
        engine.queuePlatformOperation(semanticEvent as IPlatformEvent);
      }
    }
    return 'continue';
  }
};
