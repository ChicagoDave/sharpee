/**
 * Exit legality for conversational leaving (ADR-320 D8).
 *
 * "Leaving is movement, obeys the world": a scene's `leave` outcome is
 * checked against the same read points the going action uses — the
 * ADR-240 `exit.blocked.*` evaluator first, the stamped
 * `RoomTrait.blockedExits` map as fallback, and door lock state — never a
 * private conversation-only physics. A restrained, cornered, or blocked
 * NPC cannot take the exit; silence remains the inalienable move.
 *
 * Public interface: hasTraversableExit.
 * Owner context: stdlib / actions / helpers
 */

import {
  WorldModel,
  TraitType,
  RoomBehavior,
  LockableBehavior,
  type DirectionType,
} from '@sharpee/world-model';
import { exitBlockedKey } from '../standard/going/going.js';

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

  // Static exits plus per-direction computed-exit declarations (ADR-295
  // D3: the overlay form governs only statically-exposed directions, so
  // it adds no direction the static keys don't already carry).
  const directions = new Set<string>(RoomBehavior.getAllExits(room).keys());
  for (const trait of room.traits.values()) {
    const computed = (trait as { computedExits?: Record<string, unknown> }).computedExits;
    if (computed) {
      for (const direction of Object.keys(computed)) directions.add(direction);
    }
  }

  for (const direction of directions) {
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
