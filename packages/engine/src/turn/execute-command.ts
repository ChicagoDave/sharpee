/**
 * The execute stage: run the command through the executor's four-phase
 * pipeline and take its result as the turn's.
 *
 * The per-turn sound buffer is reset first; sounds the report phase
 * emits live there until the sound stage fans them out. A result that
 * asked a question carries the command to hold for the next input.
 *
 * Public interface: `executeCommandStage`.
 * Owner context: `@sharpee/engine` — the turn cycle.
 *
 * References: ADR-172 Phase 6 (the sound buffer); GH #318 and ADR-385
 * D11 (the hold).
 */

import type { TurnStage } from './context.js';

export const executeCommandStage: TurnStage = {
  name: 'execute-command',
  requires: ['parse'],
  async run(context) {
    const { engine } = context;
    engine.soundBuffer.length = 0;

    const result = await engine.commandExecutor.execute(
      context.input,
      engine.world,
      engine.context,
      engine.config,
      engine.soundBuffer
    );
    if (result.hold) {
      engine.holdCommand(result.hold);
    }
    context.result = result;
    return 'continue';
  }
};
