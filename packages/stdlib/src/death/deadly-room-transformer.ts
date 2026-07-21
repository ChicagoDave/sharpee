/**
 * Deadly-room command transformer (ADR-224 Decision 3).
 *
 * Runs after parse / before validate: while the player stands in a room carrying
 * `DeadlyRoomTrait`, a verb outside the room's safe allowlist is redirected to the
 * generic {@link DEADLY_ROOM_DEATH_ACTION_ID} action (whose `report()` calls
 * `killPlayer`). This is the seam MDL's Aragain Falls needs — "every verb but LOOK
 * is fatal here" catches objectless verbs (WAIT, INVENTORY) an ADR-208 action
 * interceptor could never see, because interceptors resolve on a direct object.
 *
 * The engine auto-registers this transformer (like a standard plugin), injecting
 * its seeded RNG for the probabilistic (`chance`) variant. The transformer is a
 * plain `(parsed, world) => parsed` function so stdlib need not import the engine's
 * `ParsedCommandTransformer` type — that would invert the dependency direction.
 *
 * Public interface: `createDeadlyRoomTransformer`, `DEADLY_ROOM_DEATH_ACTION_ID`,
 * `DEADLY_ROOM_CAUSE_KEY`, `DEADLY_ROOM_MESSAGE_KEY`.
 * Owner context: `@sharpee/stdlib` — the player-death primitive (ADR-224).
 */

import type { SeededRandom } from '@sharpee/core';
import type { IParsedCommand, WorldModel, IFEntity } from '@sharpee/world-model';
import { TraitType, DeadlyRoomTrait, DeadlyRoomBehavior } from '@sharpee/world-model';

/** The generic platform action a lethal deadly-room verb is redirected to. */
export const DEADLY_ROOM_DEATH_ACTION_ID = 'if.action.deadly_room_death';

/** `extras` key carrying the death cause from the transformer to the death action. */
export const DEADLY_ROOM_CAUSE_KEY = 'deadlyRoomCause';

/** `extras` key carrying the optional death message id. */
export const DEADLY_ROOM_MESSAGE_KEY = 'deadlyRoomMessageId';

/**
 * Resolve the room the player is effectively in, following a containing vehicle
 * (a boat at the falls) to its own location — the deadly-room marker sits on the
 * room, not the vehicle.
 */
function resolvePlayerRoom(world: WorldModel, player: IFEntity): IFEntity | undefined {
  const locationId = world.getLocation(player.id);
  if (!locationId) return undefined;
  const location = world.getEntity(locationId);
  if (location?.has(TraitType.VEHICLE)) {
    const vehicleRoomId = world.getLocation(location.id);
    return vehicleRoomId ? world.getEntity(vehicleRoomId) : undefined;
  }
  return location;
}

/**
 * Build the deadly-room transformer. Returns the parsed command unchanged unless
 * the player's room has a `DeadlyRoomTrait` and the command's verb is lethal there,
 * in which case it redirects to the generic death action, threading the cause and
 * message id through `extras`.
 *
 * @param rng the engine's seeded RNG, used only for the probabilistic (`chance`) variant
 */
export function createDeadlyRoomTransformer(
  rng?: SeededRandom,
): (parsed: IParsedCommand, world: WorldModel) => IParsedCommand {
  return (parsed: IParsedCommand, world: WorldModel): IParsedCommand => {
    const player = world.getPlayer();
    if (!player) return parsed;

    const room = resolvePlayerRoom(world, player);
    const trait = room?.get(TraitType.DEADLY_ROOM) as DeadlyRoomTrait | undefined;
    if (!trait) return parsed;

    const verdict = DeadlyRoomBehavior.checkVerb(trait, parsed.action ?? '', rng);
    if (!verdict.lethal) return parsed;

    return {
      ...parsed,
      action: DEADLY_ROOM_DEATH_ACTION_ID,
      extras: {
        ...parsed.extras,
        [DEADLY_ROOM_CAUSE_KEY]: verdict.cause,
        [DEADLY_ROOM_MESSAGE_KEY]: verdict.messageId,
        deadlyRoomOriginalAction: parsed.action,
      },
    };
  };
}
