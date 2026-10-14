/**
 * Buying action — `buy <thing>` (ADR-372 D5).
 *
 * A sale's outcome belongs to whoever keeps the money, so the action is
 * implementation-dispatching (ADR-371's shape) behind a trait gate: a thing
 * without `PurchasableTrait` refuses not_for_sale, and the buyer already
 * holding it refuses already_have, both before any implementation is looked
 * up. Otherwise the thing's registered `if.action.buying` capability
 * behavior decides — the story-loader registers one on the trait that
 * spends a counter on the buyer, refusing cant_afford when the purse is
 * short; a TypeScript story registers its own. A Chord `on the player
 * buying` clause is consulted around the behavior and may refuse or add.
 *
 * Public interface: buyingAction, buyingLifecycle, BuyingMessages.
 * Owner context: stdlib / standard actions / social
 */

import { TraitType, PurchasableTrait } from '@sharpee/world-model';
import { IFActions } from '../../constants.js';
import { nounPhraseFor } from '../../../utils/index.js';
import { ScopeLevel } from '../../../scope/types.js';
import { createImplementationDispatchingAction } from '../dispatch-shared.js';
import type { ActionLifecycleDescriptor } from '../../lifecycle/index.js';

/** Message ids the buying action can emit (short keys; the language layer prefixes). */
export const BuyingMessages = {
  NO_TARGET: 'no_target',
  NOT_FOR_SALE: 'not_for_sale',
  ALREADY_HAVE: 'already_have',
  CANT_AFFORD: 'cant_afford',
  BOUGHT: 'bought'
} as const;

const built = createImplementationDispatchingAction({
  actionId: IFActions.BUYING,
  group: 'social',
  reportEventType: 'if.event.bought',
  blockedEventType: 'if.event.buy_blocked',
  targetScope: ScopeLevel.VISIBLE,
  messages: {
    noTarget: BuyingMessages.NO_TARGET,
    // A priced thing whose story registered no implementation is, to the
    // player, not for sale — the same line as an unpriced one.
    cantDoThat: BuyingMessages.NOT_FOR_SALE,
    done: BuyingMessages.BOUGHT
  },
  extraMessages: [BuyingMessages.ALREADY_HAVE, BuyingMessages.CANT_AFFORD],
  earlyRefusal(context, target) {
    if (!target.has(TraitType.PURCHASABLE)) {
      return { valid: false, error: BuyingMessages.NOT_FOR_SALE, params: { item: nounPhraseFor(target) } };
    }
    if (context.world.getLocation(target.id) === context.actor.id) {
      return { valid: false, error: BuyingMessages.ALREADY_HAVE, params: { item: nounPhraseFor(target) } };
    }
    return undefined;
  },
  seed(context) {
    const target = context.command.directObject?.entity;
    const price = target?.get(TraitType.PURCHASABLE) as PurchasableTrait | undefined;
    return price ? { price: price.price, currency: price.currency } : {};
  }
});

export const buyingAction = built.action;
export const buyingLifecycle: ActionLifecycleDescriptor = built.lifecycle;
