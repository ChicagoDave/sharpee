/**
 * The exchange-offer stage: an open exchange is offered the input before
 * the parse.
 *
 * Public interface: `exchangeOfferStage`.
 * Owner context: `@sharpee/engine` — the turn cycle.
 *
 * References: GH #346.
 */

import type { TurnStage } from './context.js';

export const exchangeOfferStage: TurnStage = {
  name: 'exchange-offer',
  requires: ['held-command'],
  async run(context) {
    context.input = context.engine.offerToOpenExchange(context.input);
    return 'continue';
  }
};
