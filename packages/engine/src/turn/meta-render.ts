/**
 * The meta-render stage: emit and render a meta command's events at once.
 *
 * The events are not stored in the turn's list; they are emitted to
 * listeners, rendered through the text service with the prompt block,
 * and carried on a channel packet stamped with the current turn for
 * display. Without a text service, or with nothing to show, the stage
 * does nothing at all.
 *
 * Public interface: `metaRenderStage`.
 * Owner context: `@sharpee/engine` — the turn cycle.
 *
 * References: ADR-133 (structured blocks); ADR-137 (the prompt block);
 * ADR-163 (meta commands produce a channel packet too).
 */

import { appendPromptBlock } from './render-prose.js';
import { emitChannelPacket } from './channel-packet.js';
import type { TurnStage } from './context.js';

export const metaRenderStage: TurnStage = {
  name: 'meta-render',
  requires: ['meta-command'],
  async run(context) {
    const { engine, events } = context;
    if (!engine.textService || events.length === 0) {
      return 'continue';
    }

    for (const event of events) {
      engine.emit('event', event);
    }

    const blocks = engine.textService.processTurn(events);
    appendPromptBlock(engine, blocks);

    if (blocks.length > 0) {
      engine.emit('text:output', blocks, engine.context.currentTurn);
    }
    emitChannelPacket(engine, events, blocks, engine.context.currentTurn);
    return 'continue';
  }
};
