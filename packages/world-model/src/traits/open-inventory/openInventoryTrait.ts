/**
 * @file Open Inventory Trait
 * @description Marks an NPC's inventory as reachable by other actors.
 *
 * By default, items held by an NPC (actor) are visible but not reachable
 * by the player — like a closed transparent container. Adding this trait
 * to an actor makes their inventory reachable, allowing the player to
 * take items directly from them.
 *
 * @public OpenInventoryTrait
 * @owner world-model / scope
 */

import { ITrait } from '../trait';
import { TraitType } from '../trait-types';

/**
 * When applied to an actor, makes their carried items reachable by others.
 *
 * Without this trait, NPC inventory items are VISIBLE but not REACHABLE.
 * With this trait, NPC inventory items follow normal reachability rules.
 *
 * Use cases:
 * - A horse carrying saddlebags the player can reach into
 * - A friendly NPC holding out an item for the player to take
 * - A dead NPC whose belongings are accessible
 */
export class OpenInventoryTrait implements ITrait {
  static readonly type = TraitType.OPEN_INVENTORY;
  readonly type = TraitType.OPEN_INVENTORY;

  constructor(data?: Partial<OpenInventoryTrait>) {
    if (data) {
      Object.assign(this, data);
    }
  }
}
