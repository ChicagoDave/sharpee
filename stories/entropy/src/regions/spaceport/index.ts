/**
 * Spaceport Region — Crashed ships, Caledonia wreck
 *
 * Rooms: Spaceport, Main Cabin (Caledonia)
 * The Caledonia is a wreck — good for scavenging (safety cable) but will never fly.
 */

import {
  WorldModel,
  IFEntity,
  IdentityTrait,
  RoomTrait,
  SceneryTrait,
  EntityType,
  Direction,
} from '@sharpee/world-model';

// Room IDs
export const SpaceportRoomIds = {
  SPACEPORT: 'spaceport',
  MAIN_CABIN: 'main-cabin',
} as const;

/**
 * Create spaceport rooms and objects.
 */
export function createSpaceportRegion(world: WorldModel): void {
  // --- Spaceport ---
  const sp = world.createEntity(SpaceportRoomIds.SPACEPORT, EntityType.ROOM);
  sp.add(new IdentityTrait({
    name: 'Space Port',
    description:
      'A cemetery of twisted ships. The control tower is a heap of rubble. '
      + 'Light spacecraft and warp ships lie in various states of destruction. '
      + 'One vessel — the Caledonia — is relatively intact, its hull breached '
      + 'but its cabin accessible.',
  }));
  // Triggers memory flashback (arriving as teacher)

  const ships = world.createEntity('sp-ships', EntityType.OBJECT);
  ships.add(new IdentityTrait({
    name: 'ships',
    aliases: ['twisted', 'spacecraft', 'warp'],
    description: 'Ruined vessels of various sizes, none spaceworthy.',
  }));
  ships.add(new SceneryTrait());
  world.moveEntity(ships.id, sp.id);

  // --- Main Cabin (Caledonia) ---
  const mc = world.createEntity(SpaceportRoomIds.MAIN_CABIN, EntityType.ROOM);
  mc.add(new IdentityTrait({
    name: 'Main Cabin',
    description:
      'The interior of the Caledonia. The crew is gone — melted remains fused to their '
      + 'stations. The bridge is destroyed. The airlock is breached. But the control '
      + 'panel still has power.',
  }));

  const hull = world.createEntity('mc-hull', EntityType.OBJECT);
  hull.add(new IdentityTrait({
    name: 'hull',
    aliases: ['breach', 'airlock'],
    description: 'The hull is breached in several places. This ship will never fly again.',
  }));
  hull.add(new SceneryTrait());
  world.moveEntity(hull.id, mc.id);

  // Control panel — safety cable is attached here initially
  const controlPanel = world.createEntity('caledonia-cp', EntityType.OBJECT);
  controlPanel.add(new IdentityTrait({
    name: 'control panel',
    aliases: ['panel', 'console'],
    description: 'A battered control panel. A safety cable is attached to it.',
  }));
  controlPanel.add(new SceneryTrait());
  world.moveEntity(controlPanel.id, mc.id);
  // TODO: Attachable trait for safety cable

  // Safety cable — dual-endpoint attachment puzzle
  const safetyCable = world.createEntity('safety-cable', EntityType.OBJECT);
  safetyCable.add(new IdentityTrait({
    name: 'safety cable',
    aliases: ['cable', 'tether'],
    description: 'A one-meter safety cable with clips on both ends.',
  }));
  world.moveEntity(safetyCable.id, mc.id);
  // TODO: Dual-endpoint attachment mechanics (attached_a, attached_b, attached_to_a, attached_to_b)
}

/**
 * Connect spaceport rooms.
 */
export function connectSpaceportRooms(world: WorldModel): void {
  // Spaceport → Main Cabin (enter Caledonia)
  world.connectRooms(SpaceportRoomIds.SPACEPORT, SpaceportRoomIds.MAIN_CABIN, Direction.IN);
}
