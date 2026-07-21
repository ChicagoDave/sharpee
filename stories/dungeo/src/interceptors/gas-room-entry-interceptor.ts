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
  InterceptorBlockedResult,
  createEffect,
  IFEntity,
  WorldModel,
  TraitType,
  LightSourceBehavior
} from '@sharpee/world-model';
import { killPlayer, PLAYER_DIED_EVENT } from '@sharpee/stdlib';

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
   * ADR-228 D2: the standard blocked event survives and carries the death
   * narration via `override`; the canonical death event rides `emit` with
   * no messageId (avoids a duplicate render — sphere-cage pattern).
   */
  onBlocked(
    entity: IFEntity,
    world: WorldModel,
    actorId: string,
    error: string,
    _sharedData: InterceptorSharedData
  ): InterceptorBlockedResult | null {
    if (error !== 'dungeo.gas_room.explosion') return null;

    // Canonical terminal death (ADR-224): apply the lethal transition via the
    // platform primitive, then emit the canonical event through the interceptor's
    // effect channel so the engine routes game-over.
    const player = world.getPlayer();
    if (player) {
      killPlayer(world, player, {
        cause: 'gas_explosion',
        messageId: GasRoomEntryMessages.EXPLOSION_DEATH,
        terminal: true,
      });
    }

    return {
      override: { messageId: GasRoomEntryMessages.EXPLOSION_DEATH },
      emit: [
        createEffect(PLAYER_DIED_EVENT, {
          cause: 'gas_explosion',
          terminal: true
        })
      ]
    };
  }
};
