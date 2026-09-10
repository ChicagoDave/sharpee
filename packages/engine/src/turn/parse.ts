/**
 * The parse stage: parse the input once to route the turn — a meta
 * command (VERSION, SCORE, SAVE, UNDO, and the rest of the registry's
 * set) takes the meta list and never touches turn machinery; everything
 * else, a failed parse included, takes the regular list.
 *
 * The parser is first given the player's world context. This stage is
 * the only one that writes `route`; the runner reads it and switches
 * lists. The parsed command is kept for the meta stages; the regular
 * path's executor parses again itself.
 *
 * Public interface: `parseStage`.
 * Owner context: `@sharpee/engine` — the turn cycle.
 *
 * References: ADR-334 D1 (the route set by parse alone), D1a (where the
 * two lists part).
 */

import { MetaCommandRegistry } from '@sharpee/stdlib';
import type { TurnStage } from './context.js';

export const parseStage: TurnStage = {
  name: 'parse',
  requires: ['input-mode'],
  async run(context) {
    const { engine } = context;
    const player = engine.world.getPlayer();
    if (player) {
      const playerLocation = engine.world.getLocation(player.id) || '';
      engine.parser.setWorldContext(engine.world, player.id, playerLocation);
    }

    const parseResult = engine.parser.parse(context.input);
    if (parseResult.success) {
      const parsedCommand = parseResult.value;
      const actionId = parsedCommand.action;
      if (actionId && MetaCommandRegistry.isMeta(actionId)) {
        context.route = 'meta';
        context.parsedCommand = parsedCommand;
        return 'continue';
      }
    }
    context.route = 'turn';
    return 'continue';
  }
};
