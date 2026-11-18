/**
 * The opening-packet stage: send the first look's channel packet.
 *
 * The opening sends one packet per routine, each carrying only that
 * routine's channels, so a client that appends what it receives prints
 * the routines in the story's order. The look's packet carries every
 * channel a turn's packet carries except `prologue` and `banner`, which
 * belong to their own routines. It is stamped with turn 0: the `turn`
 * channel counts commands that have cost a turn, and none has.
 *
 * Public interface: `openingPacketStage`, `OPENING_PACKET_TURN`,
 * `lookChannelIds`.
 * Owner context: `@sharpee/engine` — the opening routine.
 *
 * References: ADR-404 decisions 6 (one packet per routine) and 14 (the
 * `turn` channel sends 0 through the opening).
 */

import { STANDARD_CHANNEL_IDS } from '@sharpee/stdlib';
import type { TurnStage, TurnEngine } from './context.js';
import { emitChannelPacket } from './channel-packet.js';

/** The turn every opening packet is stamped with: no command has cost a turn. */
export const OPENING_PACKET_TURN = 0;

/**
 * The channels the first look's packet may carry: every channel this
 * client's manifest lists, less the two that have routines of their own.
 * @param engine the turn-facing engine surface
 */
export function lookChannelIds(engine: TurnEngine): string[] {
  return engine.channelService.buildManifest().channels
    .map((channel) => channel.id)
    .filter((id) => id !== STANDARD_CHANNEL_IDS.PROLOGUE && id !== STANDARD_CHANNEL_IDS.BANNER);
}

export const openingPacketStage: TurnStage = {
  name: 'opening-packet',
  requires: ['render-prose'],
  async run(context) {
    const { engine, turn } = context;
    if (engine.textService && context.blocks) {
      emitChannelPacket(engine, engine.turnEventsOf(turn), context.blocks, OPENING_PACKET_TURN, lookChannelIds(engine));
    }
    return 'continue';
  }
};
