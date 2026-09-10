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
 * Public interface: `renderProseStage`, `appendPromptBlock`.
 * Owner context: `@sharpee/engine` — the turn cycle.
 *
 * References: ADR-133 (structured text blocks); ADR-137 (the prompt block).
 */

import { BLOCK_KEYS, type ITextBlock } from '@sharpee/text-blocks';
import type { TurnStage, TurnEngine } from './context.js';

/**
 * Append the prompt block to a turn's rendered blocks: the world's
 * current prompt resolved through the language provider. Nothing is
 * appended when the message does not resolve (the provider echoes the
 * id back) or before a language provider is set.
 * @param engine the turn-facing engine surface
 * @param blocks the rendered blocks, extended in place
 */
export function appendPromptBlock(engine: TurnEngine, blocks: ITextBlock[]): void {
  const { languageProvider, world } = engine;
  if (!languageProvider || !world) return;

  const prompt = world.getPrompt();
  const resolved = languageProvider.getMessage(
    prompt.messageId,
    prompt.params as Record<string, any>
  );

  // Only append if the message resolved (not echoed back as the ID)
  if (resolved && resolved !== prompt.messageId) {
    blocks.push({ key: BLOCK_KEYS.PROMPT, content: [resolved] });
  }
}

export const renderProseStage: TurnStage = {
  name: 'render-prose',
  requires: ['platform-operations', 'player-switch'],
  async run(context) {
    const { engine, turn } = context;
    if (engine.textService) {
      const turnEvents = engine.turnEventsOf(turn);
      const blocks = engine.textService.processTurn(turnEvents);
      appendPromptBlock(engine, blocks);
      context.blocks = blocks;
      context.result!.blocks = blocks;
      if (blocks.length > 0) {
        engine.emit('text:output', blocks, turn);
      }
    }
    return 'continue';
  }
};
