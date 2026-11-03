/**
 * admittance.ts — what a way admits: vehicles and pushed things.
 *
 * A room's `admits:` list and an exit line's own `admits` lower here onto
 * `RoomTrait.admits` and each exit's `admits`, and a thing's `pushing`
 * block grants it the ways it names. The two stamps run as their own
 * build steps after every exit is wired, because a far room's own line
 * back is a later `connectRooms` that rewrites both entries and would drop
 * a stamp made as the first side was wired.
 *
 * Invariants:
 * - A room admits no vehicle unless it names it, so the lists only grow.
 * - A way that already admits every pushable gets no per-thing grant;
 *   writing one would narrow the way to that thing alone.
 *
 * Public interface: admittanceOf, copyAdmittance, wireAdmits,
 * stampExitAdmits, stampPushingWays.
 * Owner context: @sharpee/story-loader (language-neutral IR consumer).
 *
 * References:
 * - ADR-366 D6 — `admits:` on a room or a region.
 * - ADR-378 D6, D6b — an exit line's own `admits`; the `pushing` block.
 */
import { ADMITS_PUSHING, type IREntity } from '@sharpee/chord';
import {
  type Admittance,
  type DirectionType,
  getOppositeDirection,
  IFEntity,
  isPassageKey,
  RoomBehavior,
  RoomTrait,
  TraitType,
  WorldModel,
} from '@sharpee/world-model';
import { requireEntity } from '../identity.js';
import type { BuildContext } from './context.js';
import { toDirection } from './wiring.js';

/**
 * An IR `admits` list as an admittance (ADR-378 D6): entity ids are the
 * steered vehicles, and the class word `pushing` admits every pushable.
 */
export function admittanceOf(world: WorldModel, list: readonly string[], irEntity: IREntity): Admittance {
  return {
    vehicles: list.filter((id) => id !== ADMITS_PUSHING).map((id) => requireEntity(world, id, irEntity).id),
    pushed: list.includes(ADMITS_PUSHING) ? 'any' : [],
  };
}

/** A copy of an admittance, so each way's lists are its own to grow. */
export function copyAdmittance(admits: Admittance): Admittance {
  return { vehicles: [...admits.vehicles], pushed: admits.pushed === 'any' ? 'any' : [...admits.pushed] };
}

/**
 * ADR-366 D6: `admits:` lands on RoomTrait.admits — the room's own, or
 * every member room's when written on a region. A room admits no vehicle
 * unless it names it, so the list only ever grows.
 */
export function wireAdmits(world: WorldModel, irEntity: IREntity, entity: IFEntity): void {
  // ADR-378 D6: the class word `pushing` admits every pushable.
  const admits = admittanceOf(world, irEntity.admits ?? [], irEntity);
  const rooms = entity.has(TraitType.ROOM)
    ? [entity]
    : (irEntity.containing ?? []).map((member) => requireEntity(world, member.id, irEntity));
  for (const room of rooms) {
    const trait = room.get(RoomTrait);
    if (!trait) continue;
    for (const id of admits.vehicles) {
      if (!trait.admits.vehicles.includes(id)) trait.admits.vehicles.push(id);
    }
    if (admits.pushed === 'any') trait.admits.pushed = 'any';
  }
}

/**
 * ADR-378 D6: an exit line's own `admits` rides the exit, on both sides of
 * a two-way connection as the connection itself does. Stamped in a pass
 * after every exit is wired, because a far room's own line back is a
 * later `connectRooms` that rewrites both entries and would drop a stamp
 * made as the first side was wired. A far room that writes its own line
 * back keeps that line's list (or none): only an inferred reverse carries
 * this one.
 */
export function stampExitAdmits(story: BuildContext, world: WorldModel): void {
  for (const irEntity of story.ir.entities) {
    for (const exit of irEntity.exits) {
      if (!exit.admits || exit.to.kind !== 'room') continue;
      const farId = exit.to.id;
      const entity = requireEntity(world, irEntity.id, irEntity);
      const direction = toDirection(exit.direction, irEntity);
      // The line decides both fields for this way: its vehicles, and
      // every pushable when it names `pushing`, else none.
      const admits = admittanceOf(world, exit.admits, irEntity);
      const forward = RoomBehavior.getExit(entity, direction);
      if (forward) forward.admits = copyAdmittance(admits);
      if (exit.oneWay || isPassageKey(direction)) continue;
      const reverseDirection = getOppositeDirection(direction as DirectionType);
      const far = story.ir.entities.find((e) => e.id === farId);
      if (far?.exits.some((e) => toDirection(e.direction, far) === reverseDirection)) continue;
      const reverse = RoomBehavior.getExit(requireEntity(world, farId, irEntity), reverseDirection);
      if (reverse && reverse.destination === entity.id) reverse.admits = copyAdmittance(admits);
    }
  }
}

/**
 * ADR-378 D6b: a thing's `pushing` block adds the thing's id to each named
 * way's admitted pushed things — the compass exit from the first room to
 * the second, which the compiler has checked exists. Runs after every exit
 * is wired and every exit line stamped. A way that already admits every
 * pushable, by its own line or by its room's `admits pushing` (static: a
 * story never changes it), needs no grant, and writing one would narrow
 * the way to this thing alone.
 */
export function stampPushingWays(story: BuildContext, world: WorldModel): void {
  for (const irEntity of story.ir.entities) {
    if (!irEntity.pushing?.length) continue;
    const thingId = requireEntity(world, irEntity.id, irEntity).id;
    for (const way of irEntity.pushing) {
      const from = requireEntity(world, way.from, irEntity);
      const toId = requireEntity(world, way.to, irEntity).id;
      for (const [key, exit] of RoomBehavior.getAllExits(from)) {
        if (isPassageKey(key) || exit.destination !== toId) continue;
        const pushed = exit.admits?.pushed ?? world.getEntity(toId)?.get(RoomTrait)?.admits.pushed ?? [];
        if (pushed === 'any') continue;
        const own = exit.admits?.pushed;
        if (Array.isArray(own)) {
          if (!own.includes(thingId)) own.push(thingId);
        } else {
          exit.admits = { ...exit.admits, pushed: [thingId] };
        }
      }
    }
  }
}
