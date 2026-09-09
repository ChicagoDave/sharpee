/**
 * The chain stage: a line of several statements runs each as a turn of
 * its own, in order, and a failed statement flushes the rest.
 *
 * "open gate. south", "take feed; feed goats", and "unlock gate with
 * keycard then open gate" are classic-IF command chains. When the line
 * splits into more than one statement the stage runs each through
 * `executeTurn`, stops at the first that fails, and ends this turn with
 * the last result. A single statement that differs from the raw line had
 * separator punctuation to shed and runs in its cleaned form the same
 * way. Skipped while an alternate input mode is active — mode handlers
 * own the raw line, punctuation and all.
 *
 * Public interface: `chainStage`, `splitChainedInput`.
 * Owner context: `@sharpee/engine` — the turn cycle.
 *
 * References: ADR-137 (input modes own the raw line).
 */

import { INPUT_MODE_STATE_KEY } from '../types.js';
import type { TurnStage } from './context.js';

/**
 * Split a raw input line into chained statements. Separators are `.`,
 * `;`, and the standalone word `then`. Commas are NOT separators — they
 * belong to multi-object phrases ("take lamp, sword"). Empty statements
 * (doubled or trailing separators) are dropped.
 *
 * @param input - The raw line
 */
export function splitChainedInput(input: string): string[] {
  return input
    .split(/(?:[.;]|\bthen\b)+/i)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

export const chainStage: TurnStage = {
  name: 'chain',
  requires: [],
  async run(context) {
    const { engine, input } = context;
    if (typeof input !== 'string' || engine.world.getStateValue(INPUT_MODE_STATE_KEY)) {
      return 'continue';
    }
    const statements = splitChainedInput(input);
    if (statements.length > 1) {
      let result;
      for (const statement of statements) {
        result = await engine.executeTurn(statement);
        if (!result.success) break;
      }
      context.result = result;
      return 'stop';
    }
    if (statements.length === 1 && statements[0] !== input) {
      context.result = await engine.executeTurn(statements[0]);
      return 'stop';
    }
    return 'continue';
  }
};
