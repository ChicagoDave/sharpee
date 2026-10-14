/**
 * The `costs <amount> <currency>` composition (ADR-372 D5): a thing with a
 * price. The platform's buying action gates on `PurchasableTrait` and finds
 * the thing's implementation; this section supplies both — the trait from
 * the composition's `price` and `currency` settings, and one ADR-090
 * capability behavior shared by every priced thing, which owns the money.
 *
 * The purse is the buyer's own per-entity counter named by the currency
 * (`counter credits starts 10` on the player character), the same world-state
 * entry the counter statements read and write (`counterKey`), so a rotating
 * player character carries a purse of its own and the platform keeps no
 * store. Refusals are fully-qualified message ids (stdlib CLAUDE.md
 * capability-effect rule).
 *
 * Public interface: PurchasableSection.
 * Owner context: @sharpee/story-loader / runtime
 */

import {
  type CapabilityBehavior,
  type CapabilityEffect,
  type CapabilitySharedData,
  type CapabilityValidationResult,
  type IFEntity,
  PurchasableTrait,
  WorldModel
} from '@sharpee/world-model';
import { nounPhraseFor } from '@sharpee/stdlib';
import { counterKey } from '../state-keys.js';
import type { RuntimeCore } from './core.js';

/** The buying action's id, as the platform declares it. */
const BUYING_ACTION_ID = 'if.action.buying';

export class PurchasableSection {
  constructor(private readonly core: RuntimeCore) {}

  /**
   * Give every priced thing its `PurchasableTrait` and register the shared
   * buying behavior (once per world — the registry is idempotent, last wins).
   * @param world the world the loader built
   */
  bindPrices(world: WorldModel): void {
    let any = false;
    for (const irEntity of this.core.ir.entities) {
      const costs = irEntity.traits.find((t) => t.name === 'costs');
      if (!costs) continue;
      const price = Number(costs.config.find((c) => c.key === 'price')?.value);
      const currency = costs.config.find((c) => c.key === 'currency')?.value ?? '';
      const worldId = this.core.host.entityId(irEntity.id);
      const entity = worldId ? world.getEntity(worldId) : undefined;
      if (!entity) continue;
      entity.add(new PurchasableTrait({ price, currency }));
      any = true;
    }
    if (any) world.registerCapabilityBehavior(PurchasableTrait.type, BUYING_ACTION_ID, this.buildBehavior());
  }

  /** The buyer's purse key — their own counter named by the currency — or undefined for a buyer the story never declared. */
  private purseKey(buyerId: string, currency: string): string | undefined {
    const irId = this.core.host.irIdOf(buyerId);
    return irId ? counterKey(currency, irId) : undefined;
  }

  private buildBehavior(): CapabilityBehavior {
    const section = this;
    const priceOf = (entity: IFEntity): PurchasableTrait => entity.get(PurchasableTrait.type) as PurchasableTrait;
    return {
      validate(entity: IFEntity, world: WorldModel, actorId: string, shared: CapabilitySharedData): CapabilityValidationResult {
        const { price, currency } = priceOf(entity);
        const key = section.purseKey(actorId, currency);
        const held = key === undefined ? undefined : world.getStateValue(key);
        if (typeof held !== 'number' || held < price) {
          return {
            valid: false,
            error: `${BUYING_ACTION_ID}.cant_afford`,
            params: { target: nounPhraseFor(entity), price, currency },
          };
        }
        shared.purseKey = key;
        shared.purseAfter = held - price;
        return { valid: true };
      },

      execute(entity: IFEntity, world: WorldModel, actorId: string, shared: CapabilitySharedData): void {
        if (typeof shared.purseKey !== 'string' || typeof shared.purseAfter !== 'number') return;
        world.setStateValue(shared.purseKey, shared.purseAfter);
        world.moveEntity(entity.id, actorId);
      },

      report(entity: IFEntity, _world: WorldModel, actorId: string, shared: CapabilitySharedData): CapabilityEffect[] {
        const { price, currency } = priceOf(entity);
        return [{
          type: 'if.event.bought',
          payload: {
            messageId: `${BUYING_ACTION_ID}.bought`,
            params: { target: nounPhraseFor(entity), price, currency },
            targetId: entity.id,
            targetName: entity.name,
            actorId,
            price,
            currency,
            purseAfter: shared.purseAfter,
          },
        }];
      },

      blocked(entity: IFEntity, _world: WorldModel, _actorId: string, error: string): CapabilityEffect[] {
        const { price, currency } = priceOf(entity);
        return [{
          type: 'if.event.buy_blocked',
          payload: {
            messageId: error,
            params: { target: nounPhraseFor(entity), price, currency },
            targetId: entity.id,
            targetName: entity.name,
            reason: error,
          },
        }];
      },
    };
  }
}
