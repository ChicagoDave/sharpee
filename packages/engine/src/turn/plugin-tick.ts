/**
 * The plugin-tick stage: after a successful player action, run every
 * turn plugin in priority order and route each one's events through the
 * enrichment funnel.
 *
 * The tick's view of the action reports GENUINE success: the executor's
 * flag only checks for `action.error` events, but modern `blocked()`
 * paths reuse the primary event type with `blocked: true` / `failed:
 * true`, and a refused action would otherwise advance state-machine
 * transitions it never earned. Sounds a plugin emits land in the same
 * per-turn buffer the action's sounds use.
 *
 * Public interface: `pluginTickStage`, `wasRefused`.
 * Owner context: `@sharpee/engine` — the turn cycle.
 *
 * References: ADR-120 (the plugin tick), ADR-332 (the bands that order
 * it), ADR-320 Phase 8 (scene sounds from the tick).
 */

import { isPlatformRequestEvent, type IPlatformEvent, type ISemanticEvent } from '@sharpee/core';
import type { TurnPluginContext } from '@sharpee/plugins';
import type { TurnStage, TurnEngine } from './context.js';
import { enrichWithEngineContext } from './enrich-events.js';

/**
 * Route one plugin's events through the enrichment funnel and deliver
 * them: into the turn's stored events, the event source (queueing any
 * platform request), the config's `onEvent` callback, and the engine's
 * emitter — the same four destinations the action's events reach.
 */
function processPluginEvents(
  engine: TurnEngine,
  events: ISemanticEvent[],
  turn: number,
  playerLocation: string | null | undefined,
  pluginId: string
): void {
  const processed = enrichWithEngineContext(engine, events, turn, playerLocation, { kind: 'plugin', pluginId });

  // Add to turn events
  engine.storeTurnEvents(turn, processed);

  // Track in event source and check for platform requests
  for (const event of processed) {
    engine.eventSource.emit(event);
    if (isPlatformRequestEvent(event)) {
      engine.queuePlatformOperation(event as IPlatformEvent);
    }
  }

  // Emit through callbacks and event system
  if (engine.config.onEvent) {
    for (const event of processed) {
      engine.config.onEvent(event);
    }
  }
  for (const event of processed) {
    engine.emit('event', event);
  }
}

/**
 * Whether an action that produced these events was refused: modern
 * `blocked()` paths reuse the primary event type with `blocked: true` /
 * `failed: true` instead of emitting `action.error`, so the result's
 * success flag alone would report a refused action as a success.
 *
 * @param events - The action's events
 */
export function wasRefused(events: ISemanticEvent[]): boolean {
  return events.some((e) => {
    const data = e.data as { blocked?: unknown; failed?: unknown } | undefined;
    return data?.blocked === true || data?.failed === true;
  });
}

export const pluginTickStage: TurnStage = {
  name: 'plugin-tick',
  requires: ['emit-events'],
  async run(context) {
    const { engine, turn, semanticEvents } = context;
    const result = context.result!;

    if (result.success) {
      const playerLocation = engine.world.getLocation(engine.context.player.id);
      const actionRefused = wasRefused(semanticEvents);
      const pluginContext: TurnPluginContext = {
        world: engine.world,
        turn,
        playerId: engine.context.player.id,
        playerLocation: playerLocation || '',
        random: engine.randomService,
        actionResult: {
          actionId: result.actionId || '',
          success: result.success && !actionRefused,
          targetId: result.validatedCommand?.directObject?.entity?.id
        },
        actionEvents: semanticEvents,
        emitSound: (sound) => {
          engine.soundBuffer.push(sound);
        }
      };
      for (const plugin of engine.pluginRegistry.getAll()) {
        const pluginEvents = plugin.onAfterAction(pluginContext);
        if (pluginEvents.length > 0) {
          processPluginEvents(engine, pluginEvents, turn, playerLocation, plugin.id);
        }
      }
    }
    return 'continue';
  }
};
