/**
 * Cake Handler - Tea Room / Well Area puzzle mechanics
 *
 * Handles eating effects for the four Alice-themed cakes:
 * - Eat-Me (ECAKE): In Tea Room → teleport to Posts Room
 * - Blue-icing (BLICE): In Posts Room → teleport to Tea Room; In Tea Room → crush death
 * - Red-icing (RDICE): Tastes terrible (no special effect when eaten)
 * - Orange-icing (ORICE): Explosion → player death
 *
 * Also handles throwing red cake in Pool Room → dissolves pool, reveals spices.
 *
 * From MDL Dungeon source (1981):
 * - ECAKE: "Eat Me" in ALITR (Tea Room) shrinks player to ALISM (Posts Room)
 * - BLICE: "Enlarge" in ALISM enlarges player back to ALITR
 * - RDICE: "Evaporate" thrown at pool dissolves it, reveals SAFFR (spices)
 * - ORICE: "Explode" causes explosion death
 */

import { ISemanticEvent } from '@sharpee/core';
import { WorldModel, IdentityBehavior, IdentityTrait, TraitType } from '@sharpee/world-model';

// Message IDs for lang layer
export const CakeMessages = {
  // Eating effects
  EAT_ME_SHRINK: 'dungeo.cake.eat_me.shrink',
  BLUE_ENLARGE: 'dungeo.cake.blue.enlarge',
  BLUE_CRUSH: 'dungeo.cake.blue.crush_death',
  ORANGE_EXPLODE: 'dungeo.cake.orange.explode_death',
  RED_TERRIBLE: 'dungeo.cake.red.terrible',

  // Throwing effects
  RED_POOL_DISSOLVE: 'dungeo.cake.red.pool_dissolve',
  SPICES_REVEALED: 'dungeo.cake.spices_revealed',

  // Pool Room description after dissolving
  POOL_DISSOLVED_DESC: 'dungeo.pool_room.dissolved',
} as const;

/**
 * Register cake eating handler.
 * Listens for 'if.event.eaten' and reacts based on cake type + player location.
 */
export function registerCakeEatingHandler(world: WorldModel): void {
  world.registerEventHandler('if.event.eaten', (event: ISemanticEvent, w) => {
    const data = event.data as Record<string, any> | undefined;
    if (!data || data.blocked) return [];

    const itemId = data.item;
    if (!itemId) return [];

    // Get the eaten entity and check if it's a cake
    const item = w.getEntity(itemId);
    if (!item) return [];
    const cakeType = (item as any).cakeType as string | undefined;
    if (!cakeType) return [];

    // Get player location
    const player = w.getPlayer();
    if (!player) return [];
    const playerLocation = w.getLocation(player.id);

    // Get room IDs from state
    const teaRoomId = w.getStateValue('dungeo.tea_room.id') as string;
    const postsRoomId = w.getStateValue('dungeo.posts_room.id') as string;

    switch (cakeType) {
      case 'eat-me': {
        // In Tea Room → shrink, teleport to Posts Room
        if (playerLocation === teaRoomId) {
          w.moveEntity(player.id, postsRoomId);
          return [{
            type: 'message',
            id: CakeMessages.EAT_ME_SHRINK,
            data: { destination: 'Posts Room' }
          }];
        }
        return [];
      }

      case 'blue-icing': {
        if (playerLocation === postsRoomId) {
          // In Posts Room → enlarge, teleport back to Tea Room
          w.moveEntity(player.id, teaRoomId);
          return [{
            type: 'message',
            id: CakeMessages.BLUE_ENLARGE,
            data: { destination: 'Tea Room' }
          }];
        } else if (playerLocation === teaRoomId) {
          // In Tea Room → crush death (already full size, enlarging crushes you)
          w.setStateValue('dungeo.player.dead', true);
          w.setStateValue('dungeo.player.death_cause', 'cake_crush');
          return [
            {
              type: 'message',
              id: CakeMessages.BLUE_CRUSH,
              data: {}
            },
            {
              type: 'emit',
              event: {
                id: `cake-crush-death-${Date.now()}`,
                type: 'if.event.player.died',
                timestamp: Date.now(),
                entities: {},
                data: {
                  messageId: CakeMessages.BLUE_CRUSH,
                  cause: 'cake_crush'
                }
              }
            }
          ];
        }
        return [];
      }

      case 'orange-icing': {
        // Explosion → death anywhere
        w.setStateValue('dungeo.player.dead', true);
        w.setStateValue('dungeo.player.death_cause', 'cake_explosion');
        return [
          {
            type: 'message',
            id: CakeMessages.ORANGE_EXPLODE,
            data: {}
          },
          {
            type: 'emit',
            event: {
              id: `cake-explosion-death-${Date.now()}`,
              type: 'if.event.player.died',
              timestamp: Date.now(),
              entities: {},
              data: {
                messageId: CakeMessages.ORANGE_EXPLODE,
                cause: 'cake_explosion'
              }
            }
          }
        ];
      }

      case 'red-icing': {
        // Tastes terrible, no special effect
        return [{
          type: 'message',
          id: CakeMessages.RED_TERRIBLE,
          data: {}
        }];
      }

      default:
        return [];
    }
  });
}

/**
 * Register red cake throwing handler.
 * Listens for 'if.event.thrown' - when red cake is thrown in Pool Room,
 * dissolves the pool and reveals the spices.
 */
export function registerCakeThrowingHandler(world: WorldModel): void {
  world.registerEventHandler('if.event.thrown', (event: ISemanticEvent, w) => {
    const data = event.data as Record<string, any> | undefined;
    if (!data) return [];

    const itemId = data.item;
    if (!itemId) return [];

    // Check if it's a cake being thrown
    const item = w.getEntity(itemId);
    if (!item) return [];
    const cakeType = (item as any).cakeType as string | undefined;

    // Get player location
    const player = w.getPlayer();
    if (!player) return [];
    const playerLocation = w.getLocation(player.id);
    const poolRoomId = w.getStateValue('dungeo.pool_room.room_id') as string;

    // Red cake thrown in Pool Room → dissolve pool, reveal spices
    if (cakeType === 'red-icing' && playerLocation === poolRoomId) {
      const poolDissolved = w.getStateValue('dungeo.pool.dissolved') as boolean;
      if (!poolDissolved) {
        // Dissolve the pool
        w.setStateValue('dungeo.pool.dissolved', true);

        // Conceal the pool scenery (dissolved)
        const poolId = w.getStateValue('dungeo.pool_room.pool_id') as string;
        if (poolId) {
          const pool = w.getEntity(poolId);
          if (pool) {
            IdentityBehavior.conceal(pool);
          }
        }

        // Reveal the spices
        const spicesId = w.getStateValue('dungeo.pool_room.spices_id') as string;
        if (spicesId) {
          const spices = w.getEntity(spicesId);
          if (spices) {
            IdentityBehavior.reveal(spices);
          }
        }

        // Update Pool Room description
        const poolRoom = w.getEntity(poolRoomId);
        if (poolRoom) {
          const identity = poolRoom.get(TraitType.IDENTITY) as IdentityTrait | null;
          if (identity) {
            identity.description = 'This is a large room, one half of which is depressed. The floor of the depression is covered with hardened calciumite. The only exit is to the west.';
          }
        }

        return [{
          type: 'message',
          id: CakeMessages.RED_POOL_DISSOLVE,
          data: {}
        }];
      }
    }

    // Orange cake thrown anywhere → explosion death
    if (cakeType === 'orange-icing') {
      w.setStateValue('dungeo.player.dead', true);
      w.setStateValue('dungeo.player.death_cause', 'cake_explosion');
      return [
        {
          type: 'message',
          id: CakeMessages.ORANGE_EXPLODE,
          data: {}
        },
        {
          type: 'emit',
          event: {
            id: `cake-throw-explosion-${Date.now()}`,
            type: 'if.event.player.died',
            timestamp: Date.now(),
            entities: {},
            data: {
              messageId: CakeMessages.ORANGE_EXPLODE,
              cause: 'cake_explosion'
            }
          }
        }
      ];
    }

    return [];
  });
}
