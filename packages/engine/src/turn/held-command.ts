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

import type { TurnStage } from './context.js';

export const heldCommandStage: TurnStage = {
  name: 'held-command',
  requires: ['chain'],
  async run(context) {
    context.input = context.engine.spliceHeldCommand(context.input);
    return 'continue';
  }
};
