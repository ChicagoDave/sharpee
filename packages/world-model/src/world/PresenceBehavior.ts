/**
 * PresenceBehavior — where a thing is present beyond the one room that
 * contains it (ADR-374 D1).
 *
 * A thing lives in one place. Two kinds are present at more rooms than
 * that: a door at both of its rooms (David's ruling 2026-07-18), and a
 * backdrop at every room of its list. This is the one rule for both; the
 * scope rule and the visibility gates read it instead of re-deriving the
 * door case.
 *
 * Public interface: PresenceBehavior.roomsBeyondHome, isPresentAt, presentAt.
 * Owner context: world-model — scope and visibility.
 */

import { IFEntity } from '../entities/if-entity.js';
import { TraitType } from '../traits/trait-types.js';
import { DoorTrait } from '../traits/door/doorTrait.js';
import { BackdropTrait } from '../traits/backdrop/backdropTrait.js';
import type { WorldModel } from './WorldModel.js';

export class PresenceBehavior {
  /**
   * The rooms an entity is present at by its own nature: a door's two
   * rooms, a backdrop's list. Empty for everything else.
   *
   * @param entity - The entity to ask about
   * @returns Room ids (may include the room that contains it)
   */
  static roomsBeyondHome(entity: IFEntity): readonly string[] {
    const door = entity.getTrait(DoorTrait);
    if (door) return [door.room1, door.room2].filter((id): id is string => !!id);
    const backdrop = entity.getTrait(BackdropTrait);
    if (backdrop) return backdrop.roomIds;
    return [];
  }

  /**
   * Whether an entity is present at a room: contained in it, or a door or
   * backdrop that lists it.
   *
   * @param entity - The entity to ask about
   * @param roomId - The room
   * @param world - The world model
   * @returns true when the entity is present at the room
   */
  static isPresentAt(entity: IFEntity, roomId: string, world: WorldModel): boolean {
    if (this.roomsBeyondHome(entity).includes(roomId)) return true;
    return world.getContainingRoom(entity.id)?.id === roomId;
  }

  /**
   * The doors and backdrops present at a room by their own nature —
   * including any whose home is that room.
   *
   * @param roomId - The room
   * @param world - The world model
   * @returns The entities, doors first
   */
  static presentAt(roomId: string, world: WorldModel): IFEntity[] {
    return [...world.findByTrait(TraitType.DOOR), ...world.findByTrait(TraitType.BACKDROP)].filter((entity) =>
      this.roomsBeyondHome(entity).includes(roomId),
    );
  }
}
