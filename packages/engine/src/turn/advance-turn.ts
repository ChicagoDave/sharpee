/**
 * The advance stage: move the turn counter and the session statistics
 * past this turn.
 *
 * The engine's context takes the result (turn counter, player state)
 * and the session counts one more turn, plus one more move when the
 * command succeeded. Meta commands never reach this stage.
 *
 * Public interface: `advanceTurnStage`.
 * Owner context: `@sharpee/engine` — the turn cycle.
 */

import type { TurnResult } from '../types.js';
import type { TurnStage, TurnEngine } from './context.js';

/**
 * Record the result in the context's history (trimmed to `maxHistory`),
 * advance the turn counter, stamp last-played, refresh the scope
 * vocabulary for the new turn, and announce the changed state.
 */
function updateContext(engine: TurnEngine, result: TurnResult): void {
  const { context, config } = engine;
  // Add to history
  context.history.push(result);

  // Trim history if needed
  if (context.history.length > config.maxHistory!) {
    context.history = context.history.slice(-config.maxHistory!);
  }

  // Increment turn
  context.currentTurn++;

  // Update last played
  context.metadata.lastPlayed = new Date();

  // Update vocabulary for new scope
  engine.updateScopeVocabulary();

  engine.emit('state:changed', context);
}

export const advanceTurnStage: TurnStage = {
  name: 'advance-turn',
  requires: ['sound-dispatch'],
  async run(context) {
    const result = context.result!;
    updateContext(context.engine, result);
    context.engine.countSessionTurn(result.success);
    return 'continue';
  }
};
