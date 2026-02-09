/**
 * Gas Room Entry Interceptor (ADR-126)
 *
 * Destination interceptor that blocks entry to the Gas Room when
 * the player is carrying a lit flame source. Uses the new
 * `if.action.entering_room` interceptor on the going action.
 *
 * Per MDL source (act3.199): gas room contains flammable gas that
 * explodes on contact with any open flame (torch, candles, match).
 * The brass lantern (electric) is safe.
 */

import {
  ActionInterceptor,
  InterceptorSharedData,
  InterceptorResult,
  CapabilityEffect,
  createEffect,
  IFEntity,
  WorldModel,
  TraitType,
  LightSourceBehavior
} from '@sharpee/world-model';

export const GasRoomEntryMessages = {
  EXPLOSION_DEATH: 'dungeo.gas.explosion_death'
} as const;

/**
 * Check if the actor is carrying any lit flame source.
 * Flame sources have `attributes.isFlame = true`.
 * The brass lantern is electric (isFlame is not set) and is safe.
 */
function hasLitFlame(world: WorldModel, actorId: string): boolean {
  const actor = world.getEntity(actorId);
  if (!actor) return false;

  const contents = world.getContents(actorId);
  for (const item of contents) {
    if (!item.has(TraitType.LIGHT_SOURCE)) continue;
    if (!LightSourceBehavior.isLit(item)) continue;
    if (item.attributes.isFlame) return true;
  }

  return false;
}

export const GasRoomEntryInterceptor: ActionInterceptor = {
  /**
   * preValidate: Check if the actor is carrying a lit flame.
   * If so, block entry with explosion error.
   */
  preValidate(
    entity: IFEntity,
    world: WorldModel,
    actorId: string,
    _sharedData: InterceptorSharedData
  ): InterceptorResult | null {
    if (hasLitFlame(world, actorId)) {
      return {
        valid: false,
        error: 'dungeo.gas_room.explosion'
      };
    }
    return null;
  },

  /**
   * onBlocked: Kill the player and emit explosion death event.
   */
  onBlocked(
    entity: IFEntity,
    world: WorldModel,
    actorId: string,
    error: string,
    _sharedData: InterceptorSharedData
  ): CapabilityEffect[] | null {
    if (error !== 'dungeo.gas_room.explosion') return null;

    // Kill the player
    world.setStateValue('dungeo.player.dead', true);
    world.setStateValue('dungeo.player.death_cause', 'gas_explosion');

    return [
      createEffect('if.event.player.died', {
        messageId: GasRoomEntryMessages.EXPLOSION_DEATH,
        cause: 'gas_explosion'
      })
    ];
  }
};
