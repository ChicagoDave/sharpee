/**
 * The prose stage: render the turn's stored events into text blocks.
 *
 * Runs after platform operations so their completion events render in
 * the same turn. The prose pipeline turns the turn's events into blocks,
 * the prompt block is appended, the blocks join the result, and
 * `text:output` fires when there is anything to show. Without a text
 * service the turn renders nothing and leaves no blocks for the channel
 * packet.
 *
 * Public interface: `renderProseStage`.
 * Owner context: `@sharpee/engine` — the turn cycle.
 *
 * References: ADR-133 (structured text blocks); ADR-137 (the prompt block).
 */

import type { TurnStage } from './context.js';

export const renderProseStage: TurnStage = {
  name: 'render-prose',
  requires: ['platform-operations', 'player-switch'],
  async run(context) {
    const { engine, turn } = context;
    if (engine.textService) {
      const turnEvents = engine.turnEvents.get(turn) || [];
      const blocks = engine.textService.processTurn(turnEvents);
      engine.appendPromptBlock(blocks);
      context.blocks = blocks;
      context.result!.blocks = blocks;
      if (blocks.length > 0) {
        engine.emit('text:output', blocks, turn);
      }
    }
    return 'continue';
  }
};
