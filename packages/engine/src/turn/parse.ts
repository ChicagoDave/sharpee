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
 * Public interface: `parseStage`, `resolveRoute`, `RouteResolution`.
 * Owner context: `@sharpee/engine` — the turn cycle.
 *
 * References: ADR-334 D1 (the route set by parse alone), D1a (where the
 * two lists part). ADR-345 D15 (the stopped-phase preflight, the second
 * caller of `resolveRoute`).
 */

import { MetaCommandRegistry } from '@sharpee/stdlib';
import type { WorldModel, IParsedCommand } from '@sharpee/world-model';
import type { EngineParser } from '../ports/parser-interface.js';
import type { TurnStage, TurnRoute } from './context.js';

/** A routing decision: the list to run, and the parse that decided it. */
export interface RouteResolution {
  readonly route: TurnRoute;
  /** The parsed command, kept only for the meta list, which does not parse again. */
  readonly parsedCommand?: IParsedCommand;
}

/**
 * Decide which list a turn runs, by parsing the input once.
 *
 * The one implementation of the meta/turn rule, with two callers:
 * `parseStage` for the turn it is running, and `GameEngine.executeTurn`
 * for its `stopped`-phase preflight (ADR-345 D15), which has to know the
 * route before any side-effecting stage runs. A second copy of this rule
 * is exactly the one-fact-in-two-places defect ADR-345 was written about.
 *
 * Not pure: it gives the parser the player's world context first, as the
 * parse needs. That write is idempotent, which is what lets the preflight
 * and the stage both call this within one turn.
 *
 * @param parser - the parser as the engine calls it
 * @param world - the world whose player supplies the parse context
 * @param input - the input to route
 * @returns the route, carrying the parsed command when it is `'meta'`
 */
export function resolveRoute(
  parser: EngineParser,
  world: WorldModel,
  input: string
): RouteResolution {
  const player = world.getPlayer();
  if (player) {
    parser.setWorldContext(world, player.id, world.getLocation(player.id) || '');
  }

  const parseResult = parser.parse(input);
  if (parseResult.success) {
    const parsedCommand = parseResult.value;
    const actionId = parsedCommand.action;
    if (actionId && MetaCommandRegistry.isMeta(actionId)) {
      return { route: 'meta', parsedCommand };
    }
  }
  return { route: 'turn' };
}

export const parseStage: TurnStage = {
  name: 'parse',
  requires: ['input-mode'],
  async run(context) {
    const { engine } = context;
    const resolved = resolveRoute(engine.parser, engine.world, context.input);
    context.route = resolved.route;
    if (resolved.parsedCommand) {
      context.parsedCommand = resolved.parsedCommand;
    }
    return 'continue';
  }
};
