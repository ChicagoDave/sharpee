/**
 * The held-command stage: spend a command held after a missing-object
 * question on this input.
 *
 * A command held after a clarification question is completed by this
 * input when the input is not a command of its own; either way the hold
 * is spent here — exactly one input.
 *
 * Public interface: `heldCommandStage`.
 * Owner context: `@sharpee/engine` — the turn cycle.
 *
 * References: ADR-225 as amended (GH #318).
 */

import { hasWorldContext } from '../ports/parser-interface.js';
import type { TurnStage, TurnEngine } from './context.js';

/**
 * Spend the held command (GH #318): when a clarification question is open
 * and this input does not parse as a command of its own, splice it onto
 * the held input (`drop` + `pear` → `drop pear`; `put pear` + `in the
 * box`) and run the spliced form if it parses. An input that parses on
 * its own drops the hold and runs as written. The hold is cleared here
 * whatever happens — exactly one input.
 * @param engine the turn-facing engine surface
 * @param input the raw input for this turn
 * @returns the input to run: spliced, or as given
 */
function spliceHeldCommand(engine: TurnEngine, input: string): string {
  const held = engine.takeHeldCommand();
  const parser = engine.parser;
  if (held === undefined || !parser) return input;
  const world = engine.world;
  const player = world.getPlayer();
  if (player && hasWorldContext(parser)) {
    parser.setWorldContext(world, player.id, world.getLocation(player.id) || '');
  }
  if (parser.parse(input).success) return input;
  const spliced = `${held} ${input}`;
  return parser.parse(spliced).success ? spliced : input;
}

export const heldCommandStage: TurnStage = {
  name: 'held-command',
  requires: ['chain'],
  async run(context) {
    context.input = spliceHeldCommand(context.engine, context.input);
    return 'continue';
  }
};
