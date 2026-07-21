/**
 * Cake Interceptors - Tea Room / Well Area puzzle mechanics (ADR-227 Phase 2).
 *
 * Entity-keyed Action Interceptors (ADR-118) on `CakeTrait` for the four
 * Alice-themed cakes — the surface Chord's `on eating it` / `on throwing it`
 * clauses lower to (story-loader §5.4). Standard eating/throwing runs
 * untouched (implicit take, consumption, taste line, throw mechanics); the
 * interceptors apply the cake-specific consequence in `postExecute` and emit
 * its narration in `postReport` (append, matching the old chainEvent output).
 *
 * Eating (CakeEatingInterceptor):
 * - Eat-Me (ECAKE): In Tea Room → teleport to Posts Room (contents ride along)
 * - Blue-icing (BLICE): In Posts Room → teleport back; In Tea Room → crush death
 * - Red-icing (RDICE): Tastes terrible (standard eating message only)
 * - Orange-icing (ORICE): Explosion → terminal death (ADR-224 killPlayer)
 *
 * Throwing (CakeThrowingInterceptor):
 * - Orange-icing thrown anywhere → explosion death
 * - Red-icing thrown in Pool Room → dissolves pool, reveals spices
 *
 * From MDL Dungeon source (1981): EATME-FUNCTION / CAKE-FUNCTION.
 *
 * Public interface: `CakeMessages`, `registerCakeInterceptors`.
 * Owner context: stories/dungeo — Tea Room / Well Area puzzles.
 */

import {
  WorldModel,
  IWorldModel,
  IFEntity,
  IdentityBehavior,
  IdentityTrait,
  TraitType,
  ActionInterceptor,
  InterceptorSharedData,
  CapabilityEffect,
  createEffect
} from '@sharpee/world-model';
import { killPlayer, PLAYER_DIED_EVENT } from '@sharpee/stdlib';
import { CakeTrait } from '../traits/cake-trait';

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

/** Cross-phase interceptor data: effects computed in postExecute, emitted in postReport. */
interface CakeInterceptorData extends InterceptorSharedData {
  cakeEffects?: CapabilityEffect[];
}

/**
 * MDL EATME-FUNCTION / CAKE-FUNCTION move the shrunk/enlarged room's objects
 * along with the player (ALICE's contents ride into ALISM and back).
 * Relocate the room's loose (non-scenery) items.
 */
function moveRoomContents(w: IWorldModel, playerId: string, fromRoomId: string, toRoomId: string): void {
  for (const entity of w.getContents(fromRoomId)) {
    if (entity.id === playerId) continue;
    if (entity.hasTrait(TraitType.SCENERY)) continue;
    w.moveEntity(entity.id, toRoomId);
  }
}

/** Apply terminal death and return the effects carrying its narration + canonical event. */
function lethalEffects(
  world: WorldModel,
  cause: string,
  narrationMessageId: string,
  narrationData: Record<string, unknown>
): CapabilityEffect[] {
  const player = world.getPlayer();
  if (player) {
    killPlayer(world, player, { cause, terminal: true });
  }
  return [
    createEffect('dungeo.event.cake_effect', { messageId: narrationMessageId, ...narrationData, cause }),
    createEffect(PLAYER_DIED_EVENT, { cause, terminal: true })
  ];
}

/**
 * Eating a cake: standard eating consumes it; this interceptor applies the
 * icing-state consequence afterwards.
 */
export const CakeEatingInterceptor: ActionInterceptor = {
  postExecute(
    entity: IFEntity,
    world: WorldModel,
    actorId: string,
    sharedData: InterceptorSharedData
  ): void {
    const data = sharedData as CakeInterceptorData;
    const cakeType = (entity.get(CakeTrait) as CakeTrait | undefined)?.cakeType;
    if (!cakeType) return;

    const playerLocation = world.getLocation(actorId);
    const teaRoomId = world.getStateValue('dungeo.tea_room.id') as string;
    const postsRoomId = world.getStateValue('dungeo.posts_room.id') as string;

    switch (cakeType) {
      case 'eat-me': {
        // In Tea Room → shrink, teleport to Posts Room (cakes come along)
        if (playerLocation === teaRoomId) {
          world.moveEntity(actorId, postsRoomId);
          moveRoomContents(world, actorId, teaRoomId, postsRoomId);
          data.cakeEffects = [
            createEffect('dungeo.event.cake_effect', {
              messageId: CakeMessages.EAT_ME_SHRINK,
              destination: 'Posts Room',
              cakeType: 'eat-me'
            })
          ];
        }
        return;
      }

      case 'blue-icing': {
        if (playerLocation === postsRoomId) {
          // In Posts Room → enlarge, teleport back to Tea Room (items return)
          world.moveEntity(actorId, teaRoomId);
          moveRoomContents(world, actorId, postsRoomId, teaRoomId);
          data.cakeEffects = [
            createEffect('dungeo.event.cake_effect', {
              messageId: CakeMessages.BLUE_ENLARGE,
              destination: 'Tea Room',
              cakeType: 'blue-icing'
            })
          ];
        } else if (playerLocation === teaRoomId) {
          // In Tea Room → crush death (already full size, enlarging crushes you)
          data.cakeEffects = lethalEffects(world, 'cake_crush', CakeMessages.BLUE_CRUSH, {
            cakeType: 'blue-icing'
          });
        }
        return;
      }

      case 'orange-icing': {
        // Explosion → death anywhere
        data.cakeEffects = lethalEffects(world, 'cake_explosion', CakeMessages.ORANGE_EXPLODE, {
          cakeType: 'orange-icing'
        });
        return;
      }

      case 'red-icing':
        // Tastes terrible — the standard eating action's taste message covers it
        return;
    }
  },

  postReport(
    _entity: IFEntity,
    _world: WorldModel,
    _actorId: string,
    sharedData: InterceptorSharedData
  ) {
    const data = sharedData as CakeInterceptorData;
    return data.cakeEffects ? { emit: data.cakeEffects } : {};
  }
};

/**
 * Throwing a cake: standard throw mechanics run; this interceptor applies the
 * cake-specific consequence afterwards (orange explosion, red pool dissolve).
 */
export const CakeThrowingInterceptor: ActionInterceptor = {
  postExecute(
    entity: IFEntity,
    world: WorldModel,
    actorId: string,
    sharedData: InterceptorSharedData
  ): void {
    const data = sharedData as CakeInterceptorData;
    const cakeType = (entity.get(CakeTrait) as CakeTrait | undefined)?.cakeType;
    if (!cakeType) return;

    // Orange cake thrown anywhere → explosion death
    if (cakeType === 'orange-icing') {
      data.cakeEffects = lethalEffects(world, 'cake_explosion', CakeMessages.ORANGE_EXPLODE, {
        cakeType: 'orange-icing'
      });
      return;
    }

    // Red cake thrown in Pool Room → dissolve pool, reveal spices
    if (cakeType === 'red-icing') {
      const playerLocation = world.getLocation(actorId);
      const poolRoomId = world.getStateValue('dungeo.pool_room.room_id') as string;
      if (playerLocation !== poolRoomId) return;
      if (world.getStateValue('dungeo.pool.dissolved') as boolean) return;

      // Dissolve the pool
      world.setStateValue('dungeo.pool.dissolved', true);

      // Conceal the pool scenery (dissolved)
      const poolId = world.getStateValue('dungeo.pool_room.pool_id') as string;
      if (poolId) {
        const pool = world.getEntity(poolId);
        if (pool) {
          IdentityBehavior.conceal(pool);
        }
      }

      // Reveal the spices
      const spicesId = world.getStateValue('dungeo.pool_room.spices_id') as string;
      if (spicesId) {
        const spices = world.getEntity(spicesId);
        if (spices) {
          IdentityBehavior.reveal(spices);
        }
      }

      // Update Pool Room description
      const poolRoom = world.getEntity(poolRoomId);
      if (poolRoom) {
        const identity = poolRoom.get(TraitType.IDENTITY) as IdentityTrait | null;
        if (identity) {
          identity.description = 'This is a large room, one half of which is depressed. The floor of the depression is covered with hardened calciumite. The only exit is to the west.';
        }
      }

      data.cakeEffects = [
        createEffect('dungeo.event.cake_effect', {
          messageId: CakeMessages.RED_POOL_DISSOLVE,
          cakeType: 'red-icing'
        })
      ];
    }
  },

  postReport(
    _entity: IFEntity,
    _world: WorldModel,
    _actorId: string,
    sharedData: InterceptorSharedData
  ) {
    const data = sharedData as CakeInterceptorData;
    return data.cakeEffects ? { emit: data.cakeEffects } : {};
  }
};

/**
 * Register both cake interceptors on the world (ADR-118 per-world binding map).
 */
export function registerCakeInterceptors(world: WorldModel): void {
  world.registerActionInterceptor(CakeTrait.type, 'if.action.eating', CakeEatingInterceptor);
  world.registerActionInterceptor(CakeTrait.type, 'if.action.throwing', CakeThrowingInterceptor);
}
