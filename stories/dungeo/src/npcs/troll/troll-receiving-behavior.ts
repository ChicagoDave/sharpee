/**
 * Troll Receiving Behavior
 *
 * Capability behavior for if.action.giving and if.action.throwing.
 * Implements MDL logic (act1.254, lines 216-230):
 * - Knife: troll throws it back to the floor
 * - Non-knife: troll gleefully eats it (item destroyed)
 *
 * Registered on TrollTrait.
 */

import {
  CapabilityBehavior,
  CapabilityValidationResult,
  CapabilityEffect,
  CapabilitySharedData,
  createEffect,
  IFEntity,
  WorldModel,
  IdentityTrait
} from '@sharpee/world-model';
import { TrollTrait } from '../../traits/troll-trait';
import { TrollMessages } from './troll-messages';

/**
 * Check if an entity is a knife/stiletto.
 */
function isKnife(entity: IFEntity): boolean {
  const identity = entity.get(IdentityTrait);
  if (!identity) return false;
  const name = identity.name?.toLowerCase() || '';
  const aliases = (identity.aliases || []).map((a: string) => a.toLowerCase());
  return [name, ...aliases].some(n => n.includes('knife') || n.includes('stiletto'));
}

export const TrollReceivingBehavior: CapabilityBehavior = {
  validate(
    entity: IFEntity,
    _world: WorldModel,
    _actorId: string,
    sharedData: CapabilitySharedData
  ): CapabilityValidationResult {
    // Troll accepts anything — validation always passes
    return { valid: true };
  },

  execute(
    entity: IFEntity,
    world: WorldModel,
    actorId: string,
    sharedData: CapabilitySharedData
  ): void {
    const trait = entity.get(TrollTrait);
    if (!trait) return;

    const itemId = sharedData.itemId as string;
    const item = world.getEntity(itemId);
    if (!item) return;

    if (isKnife(item)) {
      // Knife: troll throws it back to the floor
      world.moveEntity(item.id, trait.roomId);
      sharedData.trollAction = 'throws_back';
    } else {
      // Non-knife: troll eats it
      world.removeEntity(item.id);
      sharedData.trollAction = 'eats';
    }

    sharedData.itemName = item.name;
  },

  report(
    entity: IFEntity,
    _world: WorldModel,
    _actorId: string,
    sharedData: CapabilitySharedData
  ): CapabilityEffect[] {
    const itemName = sharedData.itemName as string || 'object';
    const effects: CapabilityEffect[] = [];
    const isThrow = sharedData.throwType === 'at_target';

    // MDL: THROW gets "catches the [item]", GIVE gets "graciously accepts the gift"
    effects.push(createEffect('game.message', {
      messageId: isThrow ? TrollMessages.CATCHES_ITEM : TrollMessages.ACCEPTS_GIFT,
      itemName
    }));

    // Then eat or throw back
    if (sharedData.trollAction === 'throws_back') {
      effects.push(createEffect('game.message', {
        messageId: TrollMessages.THROWS_KNIFE_BACK,
        itemName
      }));
    } else {
      effects.push(createEffect('game.message', {
        messageId: TrollMessages.EATS_ITEM,
        itemName
      }));
    }

    return effects;
  },

  blocked(
    entity: IFEntity,
    _world: WorldModel,
    _actorId: string,
    _error: string,
    _sharedData: CapabilitySharedData
  ): CapabilityEffect[] {
    return [];
  }
};
