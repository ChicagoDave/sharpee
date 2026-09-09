/**
 * The channel-packet stage: emit the turn's channel packet alongside its
 * rendered blocks.
 *
 * The packet co-emits with `text:output` so the channel and legacy paths
 * see the same turn boundary. It fires every turn a text service is
 * configured — an idle turn with no blocks included — so 'always'
 * channels still re-emit.
 *
 * Public interface: `channelPacketStage`.
 * Owner context: `@sharpee/engine` — the turn cycle.
 *
 * References: ADR-163 (the channel packet as the universal UI surface).
 */

import type { TurnStage } from './context.js';

export const channelPacketStage: TurnStage = {
  name: 'channel-packet',
  requires: ['render-prose'],
  async run(context) {
    const { engine, turn } = context;
    if (engine.textService && context.blocks) {
      const turnEvents = engine.turnEvents.get(turn) || [];
      engine.emitChannelPacket(turnEvents, context.blocks, turn);
    }
    return 'continue';
  }
};
