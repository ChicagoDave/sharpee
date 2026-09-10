/**
 * The exchange-offer stage: an open exchange is offered the input before
 * the parse.
 *
 * Public interface: `exchangeOfferStage`.
 * Owner context: `@sharpee/engine` — the turn cycle.
 *
 * References: GH #346.
 */

import { sceneWith } from '@sharpee/world-model';
import type { TurnStage, TurnEngine } from './context.js';

/**
 * GH #346: while the player's live conversation scene holds an open
 * exchange, bare input the exchange claims (`yes`, `norwich`) is offered
 * to it first and runs as an answer; input the exchange does not claim
 * runs unchanged — the innermost open question gets the first offer.
 * @param engine the turn-facing engine surface
 * @param input the raw input for this turn
 * @returns `answer <input>` when the open exchange claims it, else the input
 */
function offerToOpenExchange(engine: TurnEngine, input: string): string {
  const world = engine.world;
  const player = world.getPlayer();
  if (!player) return input;
  const scene = sceneWith(world, player.id);
  const exchange = scene?.openExchange;
  const registration = world.getDialogueSelector();
  if (!scene || !exchange || !registration?.exchangeClaims) return input;
  const speaker = world.getEntity(exchange.speakerId);
  if (!speaker) return input;
  const text = input.trim();
  const claimed = registration.exchangeClaims(
    speaker,
    { type: 'say', text },
    { world, speakerId: player.id, scene },
  );
  return claimed ? `answer ${text}` : input;
}

export const exchangeOfferStage: TurnStage = {
  name: 'exchange-offer',
  requires: ['held-command'],
  async run(context) {
    context.input = offerToOpenExchange(context.engine, context.input);
    return 'continue';
  }
};
