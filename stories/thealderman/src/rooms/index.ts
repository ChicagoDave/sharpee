/**
 * Hotel room definitions and connections for The Alderman.
 *
 * Layout: Ground floor (6 rooms), 2nd floor (ballroom), 3rd floor (7 rooms),
 * basement (3 rooms). Connected by grand staircase and hydraulic elevator.
 *
 * Public interface: createRooms(), RoomIds
 * Owner: thealderman story
 */

import {
  WorldModel,
  EntityType,
  Direction,
  IFEntity,
  IdentityTrait,
  RoomTrait,
} from '@sharpee/world-model';

/** All room entity IDs, set during creation. */
export const RoomIds = {
  // Ground floor
  foyer: '',
  restaurant: '',
  kitchen: '',
  bar: '',
  checkIn: '',
  elevatorHall: '',
  staircase: '',
  // Second floor
  ballroom: '',
  // Third floor
  hallway3: '',
  room302: '',
  room304: '',
  room306: '',
  room308: '',
  room310: '',
  serviceCloset: '',
  // Basement
  laundry: '',
  boilerRoom: '',
  storage: '',
};

/**
 * Creates all hotel rooms and connects them.
 *
 * @param world - The world model to populate
 */
export function createRooms(world: WorldModel): void {
  // === GROUND FLOOR ===

  const foyer = createRoom(world, 'Great Room', [
    'This is the grand foyer of The Alderman, locally known as the Colosseum',
    'since many political, professional, and personal battles start (and end)',
    'here. Italian marble gleams under gas chandeliers with oriental carpeting',
    'beneath the dining area to the west. A massive stone fireplace dominates',
    'the north wall. Guest check-in is in a northeast notch with casual chairs',
    'and tables dotting the area in front of the desk. The grand staircase',
    'curves upward to the south. The elevator hall is to the east and the bar',
    'occupies the southeast corner.',
  ].join(' '));
  RoomIds.foyer = foyer.id;

  const restaurant = createRoom(world, 'Restaurant', [
    'An elegant open-floor dining room with white linen tablecloths and silver',
    'candelabras. The kitchen lies through swinging doors to the south.',
    'The foyer is back to the east.',
  ].join(' '));
  RoomIds.restaurant = restaurant.id;

  const kitchen = createRoom(world, 'Kitchen', [
    'A busy hotel kitchen — copper pots hang from iron racks, and a long',
    'preparation table runs down the center. A knife block sits on the counter.',
    'Swinging doors lead north to the restaurant.',
  ].join(' '));
  RoomIds.kitchen = kitchen.id;

  const bar = createRoom(world, 'Bar', [
    'A long mahogany bar stretches the length of the room. Bottles line the',
    'mirrored shelves behind it. Leather stools and a haze of cigar smoke.',
    'The foyer is to the northwest.',
  ].join(' '));
  RoomIds.bar = bar.id;

  const checkIn = createRoom(world, 'Guest Check-In', [
    'A polished oak counter with a brass bell and a leather-bound register.',
    'Room keys hang on a pegboard behind the desk. Casual chairs and small',
    'tables dot the waiting area. The foyer is to the southwest.',
  ].join(' '));
  RoomIds.checkIn = checkIn.id;

  const elevatorHall = createRoom(world, 'Elevator Hall', [
    'A short corridor ending at a hydraulic Otis elevator — a brass cage',
    'with an iron gate and a lever-operated mechanism. The foyer is to the west.',
  ].join(' '));
  RoomIds.elevatorHall = elevatorHall.id;

  const staircase = createRoom(world, 'Grand Staircase', [
    'A sweeping marble staircase with an ornate iron banister. It curves upward',
    'past the second-floor ballroom landing and continues to the guest floors.',
    'The foyer is to the north.',
  ].join(' '));
  RoomIds.staircase = staircase.id;

  // === SECOND FLOOR ===

  const ballroom = createRoom(world, 'Ballroom', [
    'A cavernous ballroom with a sprung wooden floor and crystal chandeliers.',
    'A small stage occupies the far end, framed by heavy velvet curtains.',
    'The staircase landing is to the north.',
  ].join(' '));
  RoomIds.ballroom = ballroom.id;

  // === THIRD FLOOR ===

  const hallway3 = createRoom(world, 'Third Floor Hallway', [
    'A carpeted corridor lit by wall-mounted gas lamps. Numbered doors line',
    'both sides. Room 302 is to the west, 304 and 306 to the north, 308 and',
    '310 to the south. A service closet is at the far east end.',
    'The staircase is down to the west.',
  ].join(' '));
  RoomIds.hallway3 = hallway3.id;

  const room302 = createRoom(world, 'Room 302', [
    "Stephanie Bordeau's suite. Lavish furnishings, a vanity table covered",
    'in perfume bottles, and a writing desk by the window. Fresh flowers —',
    'now wilting. The hallway is to the east.',
  ].join(' '));
  RoomIds.room302 = room302.id;

  const room304 = createRoom(world, 'Room 304', [
    "Ross Bielack's room. Baseball memorabilia scattered about — a worn",
    'glove, newspaper clippings. Empty whiskey bottles on the nightstand.',
    'The hallway is to the south.',
  ].join(' '));
  RoomIds.room304 = room304.id;

  const room306 = createRoom(world, 'Room 306', [
    "Viola Wainright's room. Theatre scripts stacked on the desk, costumes",
    'draped over a chair. A mirror surrounded by dried roses.',
    'The hallway is to the south.',
  ].join(' '));
  RoomIds.room306 = room306.id;

  const room308 = createRoom(world, 'Room 308', [
    "Jack Margolin's room. Leather briefcase, property maps pinned to the",
    'wall, a half-empty decanter of brandy. A nightstand with a drawer.',
    'The hallway is to the north.',
  ].join(' '));
  RoomIds.room308 = room308.id;

  const room310 = createRoom(world, 'Room 310', [
    'Your room. Modest but comfortable — drafting tools on the desk, your',
    'traveling case by the wardrobe. A window overlooks the street below.',
    'The hallway is to the north.',
  ].join(' '));
  RoomIds.room310 = room310.id;

  const serviceCloset = createRoom(world, 'Service Closet', [
    'A narrow closet smelling of soap and starch. Shelves of cleaning supplies.',
    'A laundry chute drops into darkness. A ladder descends to the basement.',
    'The hallway is to the west.',
  ].join(' '));
  RoomIds.serviceCloset = serviceCloset.id;

  // === BASEMENT ===

  const laundryRoom = createRoom(world, 'Laundry', [
    'The hotel laundry — large copper washtubs, pressing stations with sad',
    'irons, and racks of hanging linens. Steam drifts from the pipes.',
    'The boiler room is to the east, storage to the south.',
    'A ladder leads up to the service closet.',
  ].join(' '));
  RoomIds.laundry = laundryRoom.id;

  const boilerRoom = createRoom(world, 'Boiler Room', [
    'A hot, loud room dominated by a massive coal-fired boiler. Pipes snake',
    'along the ceiling in every direction. The laundry is to the west.',
  ].join(' '));
  RoomIds.boilerRoom = boilerRoom.id;

  const storageRoom = createRoom(world, 'Storage', [
    'A dim basement room packed with old furniture, crates of supplies, and',
    'stacks of newspapers. The laundry is to the north.',
  ].join(' '));
  RoomIds.storage = storageRoom.id;

  // === CONNECTIONS ===

  // Ground floor
  world.connectRooms(foyer.id, restaurant.id, Direction.WEST);
  world.connectRooms(foyer.id, checkIn.id, Direction.NORTHEAST);
  world.connectRooms(foyer.id, elevatorHall.id, Direction.EAST);
  world.connectRooms(foyer.id, staircase.id, Direction.SOUTH);
  world.connectRooms(foyer.id, bar.id, Direction.SOUTHEAST);
  world.connectRooms(restaurant.id, kitchen.id, Direction.SOUTH);

  // Staircase to upper floors
  world.connectRooms(staircase.id, ballroom.id, Direction.UP);
  world.connectRooms(ballroom.id, hallway3.id, Direction.UP);

  // Third floor
  world.connectRooms(hallway3.id, room302.id, Direction.WEST);
  world.connectRooms(hallway3.id, room304.id, Direction.NORTHWEST);
  world.connectRooms(hallway3.id, room306.id, Direction.NORTH);
  world.connectRooms(hallway3.id, room308.id, Direction.SOUTH);
  world.connectRooms(hallway3.id, room310.id, Direction.SOUTHEAST);
  world.connectRooms(hallway3.id, serviceCloset.id, Direction.EAST);

  // Service closet to basement
  world.connectRooms(serviceCloset.id, laundryRoom.id, Direction.DOWN);

  // Basement
  world.connectRooms(laundryRoom.id, boilerRoom.id, Direction.EAST);
  world.connectRooms(laundryRoom.id, storageRoom.id, Direction.SOUTH);
}

function createRoom(world: WorldModel, name: string, description: string): IFEntity {
  const room = world.createEntity(name, EntityType.ROOM);
  room.add(new RoomTrait({ exits: {}, isDark: false }));
  room.add(new IdentityTrait({
    name,
    description,
    aliases: [name.toLowerCase()],
    properName: false,
    article: 'the',
  }));
  return room;
}
