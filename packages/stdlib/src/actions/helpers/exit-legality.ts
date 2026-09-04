/**
 * Exit legality for conversational leaving (ADR-320 D8; ADR-328 D5).
 *
 * "Leaving is movement, obeys the world": a scene's `leave` outcome is
 * checked against the going action itself. `canActorLeave` runs the real
 * `going` action's `validate()` for the would-be leaver in every direction
 * the room offers — one truth, never a private conversation-only physics.
 * A restrained, cornered, or blocked NPC cannot take the exit; silence
 * remains the inalienable move.
 *
 * `hasTraversableExit` is the older read-side guess (going's read points,
 * re-implemented by hand); the Chord runtime still calls it from two
 * pre-checks the acting surface (ADR-328 D7) will replace.
 *
 * Public interface: canActorLeave, hasTraversableExit.
 * Owner context: stdlib / actions / helpers
 */

import { type RandomService } from '@sharpee/core';
import {
  IFEntity,
  WorldModel,
  TraitType,
  RoomBehavior,
  LockableBehavior,
  type DirectionType,
} from '@sharpee/world-model';
import { exitBlockedKey, goingAction } from '../standard/going/going.js';
import { createActionContext } from '../enhanced-context.js';
import { IFActions } from '../constants.js';
import type { ValidatedCommand } from '../../validation/types.js';

/**
 * Every direction the room exposes: static exits plus per-direction
 * computed-exit declarations (ADR-295 D3: the overlay form governs only
 * statically-exposed directions, so it adds no direction the static keys
 * don't already carry).
 */
function exitDirections(room: IFEntity): Set<string> {
  const directions = new Set<string>(RoomBehavior.getAllExits(room).keys());
  for (const trait of room.traits.values()) {
    const computed = (trait as { computedExits?: Record<string, unknown> }).computedExits;
    if (computed) {
      for (const direction of Object.keys(computed)) directions.add(direction);
    }
  }
  return directions;
}

/**
 * Whether the actor could leave the room they stand in right now, by the
 * going action's own judgement: true when `going.validate()` accepts at
 * least one direction for them. Validate only — nothing moves.
 *
 * @param world - The live world
 * @param actor - The would-be leaver
 * @param player - The player entity (the action context's protagonist)
 * @param random - The session random service the context requires
 * @returns True when some direction validates for the actor
 */
export function canActorLeave(
  world: WorldModel,
  actor: IFEntity,
  player: IFEntity,
  random: RandomService
): boolean {
  const roomId = world.getContainingRoom(actor.id)?.id ?? world.getLocation(actor.id);
  const room = roomId ? world.getEntity(roomId) : undefined;
  if (!room || !room.has(TraitType.ROOM)) return false;

  for (const direction of exitDirections(room)) {
    const command: ValidatedCommand = {
      parsed: {
        rawInput: `go ${direction.toLowerCase()}`,
        action: IFActions.GOING,
        tokens: [],
        structure: { verb: { tokens: [0], text: 'go', head: 'go' } },
        pattern: 'PROGRAMMATIC',
        confidence: 1.0,
        extras: { direction },
      },
      actionId: IFActions.GOING,
    };
    const context = createActionContext(world, player, goingAction, command, random, undefined, actor);
    if (goingAction.validate(context).valid) return true;
  }
  return false;
}

/**
 * Whether the room offers at least one exit an actor could take right
 * now: an exit (static or computed) whose direction is not blocked (live
 * evaluator first, trait map fallback — going's read order) and whose
 * door, if any, is not locked (a closed unlocked door can be opened).
 *
 * @param world - The live world
 * @param roomId - The room the would-be leaver is in
 * @returns True when some exit is traversable
 */
export function hasTraversableExit(world: WorldModel, roomId: string): boolean {
  const room = world.getEntity(roomId);
  if (!room || !room.has(TraitType.ROOM)) return false;

  for (const direction of exitDirections(room)) {
    const derived = world.evaluate(exitBlockedKey(room.id, direction));
    const blocked =
      typeof derived === 'boolean'
        ? derived
        : RoomBehavior.isExitBlocked(room, direction as DirectionType);
    if (blocked) continue;

    const exitConfig = RoomBehavior.getExit(room, direction as DirectionType);
    if (exitConfig?.via) {
      const door = world.getEntity(exitConfig.via);
      if (door && door.has(TraitType.LOCKABLE) && LockableBehavior.isLocked(door)) continue;
    }
    return true;
  }
  return false;
}
