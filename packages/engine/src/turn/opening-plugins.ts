/**
 * The opening-plugins stage: give every plugin that has an `onOpening`
 * hook its one call, just before the opening's first look.
 *
 * The opening runs no plugin tick, so a plugin that announces something
 * at the start of play (the chapters extension's opening card) would
 * otherwise have no moment to do it before the first room is described.
 * Each hook's events take the route a tick's batch takes: new facts are
 * applied to the world, the batch passes the one enrichment funnel as that
 * plugin's, and it joins the events the look's render reads. No
 * `onAfterAction` is called here and nothing ticks.
 *
 * Public interface: `openingPluginsStage`.
 * Owner context: `@sharpee/engine` — the opening routine.
 *
 * References: ADR-404 decision 8 (the hook); ADR-120 (the plugin contract).
 */

import type { TurnPluginContext } from '@sharpee/plugins';
import type { TurnStage } from './context.js';
import { processPluginEvents } from './plugin-tick.js';

export const openingPluginsStage: TurnStage = {
  name: 'opening-plugins',
  requires: [],
  async run(context) {
    const { engine, turn } = context;
    const playerLocation = engine.world.getLocation(engine.context.player.id);
    const pluginContext: TurnPluginContext = {
      world: engine.world,
      turn,
      playerId: engine.context.player.id,
      playerLocation: playerLocation || '',
      random: engine.randomService,
      emitSound: (sound) => {
        engine.soundBuffer.push(sound);
      }
    };
    for (const plugin of engine.pluginRegistry.getAll()) {
      const pluginEvents = plugin.onOpening?.(pluginContext) ?? [];
      if (pluginEvents.length > 0) {
        processPluginEvents(engine, pluginEvents, turn, playerLocation, plugin.id);
      }
    }
    return 'continue';
  }
};
