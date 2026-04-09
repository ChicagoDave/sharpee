/**
 * Underground Region — Crater, riverbed, bunker, geyser, chamber
 *
 * Rooms: Deep Crater, Riverbed, Underground River, Enemy Bunker,
 *        Geyser, Dark Chamber
 * Contains the rations (critical survival item) and dig/door puzzles.
 */

import {
  WorldModel,
  IFEntity,
  IdentityTrait,
  RoomTrait,
  SceneryTrait,
  OpenableTrait,
  EntityType,
  Direction,
} from '@sharpee/world-model';

// Room IDs
export const UndergroundRoomIds = {
  DEEP_CRATER: 'deep-crater',
  RIVERBED: 'riverbed',
  UNDERGROUND_RIVER: 'underground-river',
  ENEMY_BUNKER: 'enemy-bunker',
  GEYSER: 'geyser',
  DARK_CHAMBER: 'dark-chamber',
} as const;

/**
 * Create all underground rooms and their scenery objects.
 */
export function createUndergroundRegion(world: WorldModel): void {
  // --- Deep Crater ---
  const dc = world.createEntity(UndergroundRoomIds.DEEP_CRATER, EntityType.ROOM);
  dc.add(new IdentityTrait({
    name: 'Deep Crater',
    description:
      'You stand at the edge of an enormous crater. The devastation here is absolute. '
      + 'Toxic gases rise from fissures in the scorched earth. A dry riverbed leads '
      + 'to the northeast and the lost battlefield lies to the west.',
  }));

  // Deep Crater scenery — triggers memory flashback (children killed)
  const dcCrater = world.createEntity('dc-crater', EntityType.OBJECT);
  dcCrater.add(new IdentityTrait({
    name: 'crater',
    aliases: ['crevice', 'fissures'],
    description:
      'Through wisps of unnatural fog you glimpse a deep and wide crevice. Memory '
      + 'lapses prevent you from remembering how this crater was formed, but a quick '
      + 'reading of gases and radiation tell you that a small thermonuclear device was '
      + 'detonated recently.',
  }));
  dcCrater.add(new SceneryTrait());
  world.moveEntity(dcCrater.id, dc.id);

  // --- Riverbed ---
  const rb = world.createEntity(UndergroundRoomIds.RIVERBED, EntityType.ROOM);
  rb.add(new IdentityTrait({
    name: 'Riverbed',
    description:
      'A dry riverbed cuts through the devastated landscape. The water has boiled '
      + 'away, leaving behind muddy remains and scattered bones. The riverbed continues '
      + 'north into an underground passage and east toward a geyser.',
  }));

  const rbWater = world.createEntity('rb-water', EntityType.OBJECT);
  rbWater.add(new IdentityTrait({
    name: 'water',
    aliases: ['remains', 'mud', 'muddy'],
    description: 'Muddy remains of what was once a river.',
  }));
  rbWater.add(new SceneryTrait());
  world.moveEntity(rbWater.id, rb.id);

  // --- Underground River ---
  const ur = world.createEntity(UndergroundRoomIds.UNDERGROUND_RIVER, EntityType.ROOM);
  ur.add(new IdentityTrait({
    name: 'Underground River',
    description:
      'A muddy tunnel follows the path of an underground river. Fossils are embedded '
      + 'in the walls and the sound of dripping water echoes from deeper in. '
      + 'A section of the western wall looks different from the surrounding rock.',
  }));

  const mud = world.createEntity('ur-mud', EntityType.OBJECT);
  mud.add(new IdentityTrait({
    name: 'mud',
    aliases: ['tunnel', 'fossils', 'walls'],
    description: 'The tunnel walls are thick with compressed mud and ancient fossils.',
  }));
  mud.add(new SceneryTrait());
  world.moveEntity(mud.id, ur.id);

  // Western wall — door puzzle (push to reveal enemy bunker)
  const westernWall = world.createEntity('western-wall', EntityType.OBJECT);
  westernWall.add(new IdentityTrait({
    name: 'western wall',
    aliases: ['wall', 'section'],
    description:
      'A section of the western wall looks different from the surrounding rock. '
      + 'It appears to be some kind of concealed door.',
  }));
  westernWall.add(new SceneryTrait());
  westernWall.add(new OpenableTrait({ isOpen: false }));
  world.moveEntity(westernWall.id, ur.id);
  // TODO: Push/open handler to reveal enemy bunker connection

  // --- Enemy Bunker ---
  const eb = world.createEntity(UndergroundRoomIds.ENEMY_BUNKER, EntityType.ROOM);
  eb.add(new IdentityTrait({
    name: 'Enemy Bunker',
    description:
      'A hidden Tra \'Jan Gore bunker. The walls are reinforced with unfamiliar alloys. '
      + 'A rack that once held plasma rifles stands empty against the far wall.',
  }));

  const rack = world.createEntity('eb-rack', EntityType.OBJECT);
  rack.add(new IdentityTrait({
    name: 'rack',
    aliases: ['plasma', 'rifle', 'rifles'],
    description: 'A weapons rack designed for plasma rifles. It is empty.',
  }));
  rack.add(new SceneryTrait());
  world.moveEntity(rack.id, eb.id);

  // --- Geyser ---
  const gy = world.createEntity(UndergroundRoomIds.GEYSER, EntityType.ROOM);
  gy.add(new IdentityTrait({
    name: 'Geyser',
    description:
      'A plume of hot gas erupts from a manmade vent in the ground. The surrounding '
      + 'earth is cracked and unstable. Bones lie scattered among the rocks.',
  }));

  const gasPlume = world.createEntity('gy-plume', EntityType.OBJECT);
  gasPlume.add(new IdentityTrait({
    name: 'gas plume',
    aliases: ['plume', 'gas', 'vent', 'geyser'],
    description: 'A steady plume of hot gas rising from a vent in the ground.',
  }));
  gasPlume.add(new SceneryTrait());
  world.moveEntity(gasPlume.id, gy.id);

  const ground = world.createEntity('gy-ground', EntityType.OBJECT);
  ground.add(new IdentityTrait({
    name: 'ground',
    aliases: ['earth', 'dirt'],
    description: 'Cracked, unstable ground. It looks like something might be buried here.',
  }));
  ground.add(new SceneryTrait());
  world.moveEntity(ground.id, gy.id);
  // TODO: DIG action reveals rusty hatch

  // --- Dark Chamber ---
  const ch = world.createEntity(UndergroundRoomIds.DARK_CHAMBER, EntityType.ROOM);
  ch.add(new IdentityTrait({
    name: 'Dark Chamber',
    description:
      'A mechanically deployed bunker — an MDB forward cabin. The light is low '
      + 'and the air is stale but breathable. This place has been sealed for some time.',
  }));
  // Triggers memory flashback (Dal MKor, time displacement device)

  // Rations — critical item
  const rations = world.createEntity('rations', EntityType.OBJECT);
  rations.add(new IdentityTrait({
    name: 'rations',
    aliases: ['food', 'supplies'],
    description:
      'Military-grade rations in sealed packaging. Still viable despite the time '
      + 'that has passed.',
  }));
  world.moveEntity(rations.id, ch.id);
  // TODO: Eating rations stops degradation daemon, sets Health=1, AEField to SLOW_TIME
}

/**
 * Connect underground rooms.
 */
export function connectUndergroundRooms(world: WorldModel): void {
  const w = world as any;

  // Deep Crater → Riverbed
  w.connectRooms(UndergroundRoomIds.DEEP_CRATER, UndergroundRoomIds.RIVERBED, Direction.NORTHEAST);

  // Riverbed → Underground River
  w.connectRooms(UndergroundRoomIds.RIVERBED, UndergroundRoomIds.UNDERGROUND_RIVER, Direction.NORTH);

  // Riverbed → Geyser
  w.connectRooms(UndergroundRoomIds.RIVERBED, UndergroundRoomIds.GEYSER, Direction.EAST);

  // Underground River → Enemy Bunker (gated by western wall door)
  // TODO: Conditional connection via western wall push/open

  // Geyser → Dark Chamber (gated by dig puzzle revealing hatch)
  // TODO: Conditional connection via rusty hatch
}
