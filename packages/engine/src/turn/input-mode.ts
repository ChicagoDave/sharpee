/**
 * The input-mode stage: while an alternate input mode is active, its
 * handler owns the raw line and the turn ends with what it produced.
 *
 * The handler's events are emitted, rendered through the text service
 * with the prompt block, and carried on a channel packet; the turn
 * counter advances only if the mode says so. A mode id with no
 * registered handler falls through to the standard pipeline.
 *
 * Public interface: `inputModeStage`.
 * Owner context: `@sharpee/engine` — the turn cycle.
 *
 * References: ADR-137 (alternate input modes); ADR-163 (modes fire
 * channel packets too).
 */

import { INPUT_MODE_STATE_KEY } from '../types.js';
import type { TurnStage } from './context.js';

export const inputModeStage: TurnStage = {
  name: 'input-mode',
  requires: ['turn-start'],
  async run(context) {
    const { engine, input, turn } = context;
    const activeModeId = engine.world.getStateValue(INPUT_MODE_STATE_KEY) as string | undefined;
    if (!activeModeId) return 'continue';
    const handler = engine.inputModeHandlers.get(activeModeId);
    if (!handler) return 'continue';

    const events = handler.handleInput(input, engine.world);

    for (const event of events) {
      engine.emit('event', event);
    }

    if (engine.textService) {
      const blocks = engine.textService.processTurn(events);
      engine.appendPromptBlock(blocks);
      if (blocks.length > 0) {
        engine.emit('text:output', blocks, turn);
      }
      engine.emitChannelPacket(events, blocks, turn);
    }

    if (handler.advancesTurn) {
      engine.context.currentTurn++;
    }

    context.result = {
      type: 'turn',
      turn,
      input,
      success: true,
      events
    };
    return 'stop';
  }
};
