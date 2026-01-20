import { WorldModel, EntityType, IFEntity } from '@sharpee/world-model';
import { IdentityTrait, RoomTrait, Direction } from '@sharpee/world-model';

/**
 * Room IDs for the Guild Hall region.
 */
export interface GuildHallRoomIds {
  entranceHall: string;
  armory: string;
  trainingYard: string;
}

/**
 * Create the Entrance Hall - the starting location.
 */
function createEntranceHall(world: WorldModel): IFEntity {
  const room = world.createEntity('entrance-hall', EntityType.ROOM);

  room.add(
    new IdentityTrait({
      name: 'Entrance Hall',
      aliases: ['entrance', 'hall', 'foyer'],
      description:
        'You stand in the entrance hall of the Adventurers Guild. ' +
        'Stone walls rise to a vaulted ceiling, and torches flicker in iron sconces. ' +
        'A heavy oak door leads outside to the south, though it appears to be locked. ' +
        'An archway to the east leads to the armory, and a bright doorway to the north ' +
        'opens onto a training yard.',
    })
  );

  room.add(
    new RoomTrait({
      exits: {},
      isDark: false,
      isOutdoors: false,
    })
  );

  return room;
}

/**
 * Create the Armory - where equipment is displayed.
 */
function createArmory(world: WorldModel): IFEntity {
  const room = world.createEntity('armory', EntityType.ROOM);

  room.add(
    new IdentityTrait({
      name: 'Armory',
      aliases: ['armoury', 'weapon room', 'equipment room'],
      description:
        'Racks of weapons line the walls, their blades gleaming in the lamplight. ' +
        'Armor stands display various types of protection, from simple leather to ' +
        'imposing plate mail. A workbench in the corner holds tools for maintenance. ' +
        'The entrance hall lies to the west.',
    })
  );

  room.add(
    new RoomTrait({
      exits: {},
      isDark: false,
      isOutdoors: false,
    })
  );

  return room;
}

/**
 * Create the Training Yard - where combat practice happens.
 */
function createTrainingYard(world: WorldModel): IFEntity {
  const room = world.createEntity('training-yard', EntityType.ROOM);

  room.add(
    new IdentityTrait({
      name: 'Training Yard',
      aliases: ['yard', 'training ground', 'practice yard'],
      description:
        'An open courtyard surrounded by high stone walls. The packed earth floor ' +
        'is marked with circles and lines for sparring practice. Wooden dummies stand ' +
        'at one end, their surfaces scarred from countless practice strikes. ' +
        'The entrance hall lies to the south.',
    })
  );

  room.add(
    new RoomTrait({
      exits: {},
      isDark: false,
      isOutdoors: true,
    })
  );

  return room;
}

/**
 * Create all rooms in the Guild Hall region and connect them.
 */
export function createGuildHallRegion(world: WorldModel): GuildHallRoomIds {
  // Create rooms
  const entranceHall = createEntranceHall(world);
  const armory = createArmory(world);
  const trainingYard = createTrainingYard(world);

  // Connect rooms
  const entranceRoomTrait = entranceHall.get(RoomTrait);
  const armoryRoomTrait = armory.get(RoomTrait);
  const trainingRoomTrait = trainingYard.get(RoomTrait);

  if (entranceRoomTrait && armoryRoomTrait && trainingRoomTrait) {
    // Entrance Hall connections
    entranceRoomTrait.exits[Direction.EAST] = { destination: armory.id };
    entranceRoomTrait.exits[Direction.NORTH] = { destination: trainingYard.id };

    // Armory connections
    armoryRoomTrait.exits[Direction.WEST] = { destination: entranceHall.id };

    // Training Yard connections
    trainingRoomTrait.exits[Direction.SOUTH] = { destination: entranceHall.id };
  }

  return {
    entranceHall: entranceHall.id,
    armory: armory.id,
    trainingYard: trainingYard.id,
  };
}
