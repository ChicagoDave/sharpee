/**
 * The channel-packet stage: emit the turn's channel packet alongside its
 * rendered blocks.
 *
 * The packet co-emits with `text:output` so the channel and legacy paths
 * see the same turn boundary. It fires every turn a text service is
 * configured — an idle turn with no blocks included — so 'always'
 * channels still re-emit.
 *
 * Public interface: `channelPacketStage`, `emitChannelPacket`.
 * Owner context: `@sharpee/engine` — the turn cycle.
 *
 * References: ADR-163 (the channel packet as the universal UI surface).
 */

import type { ISemanticEvent } from '@sharpee/core';
import type { ITextBlock } from '@sharpee/text-blocks';
import type { TurnStage, TurnEngine } from './context.js';

/**
 * Build the turn's channel packet from its events and rendered blocks and
 * emit it as `channel:packet` (ADR-163). Nothing is emitted before
 * `start()` has constructed the channel service.
 * @param engine the turn-facing engine surface
 * @param events the turn's events, as stored
 * @param blocks the turn's rendered blocks
 * @param turn the turn number the packet is stamped with
 */
export function emitChannelPacket(
  engine: TurnEngine,
  events: readonly ISemanticEvent[],
  blocks: readonly ITextBlock[],
  turn: number,
): void {
  // No `if (!channelService) return;` here any more (ADR-345 D7). That guard
  // dropped an entire turn's packet in silence — the same shape as the
  // bridges' `?? 0` quietly reporting turn 0 — and it hedged against a case
  // the phase model rules out: `start()` builds the service before the phase
  // becomes `playing`, and turns run only in `playing`.
  const { channelService } = engine;
  const packet = channelService.build({
    world: engine.world,
    events,
    blocks,
    turn,
  });
  engine.emit('channel:packet', packet, turn);
}

export const channelPacketStage: TurnStage = {
  name: 'channel-packet',
  requires: ['render-prose'],
  async run(context) {
    const { engine, turn } = context;
    if (engine.textService && context.blocks) {
      const turnEvents = engine.turnEventsOf(turn);
      emitChannelPacket(engine, turnEvents, context.blocks, turn);
    }
    return 'continue';
  }
};
