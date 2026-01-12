/**
 * Bank of Zork Region - The famous underground bank
 *
 * 11 rooms: East of Chasm, West of Chasm, Bank Entrance, Bank Lobby,
 * West Teller's Room, East Teller, Chairman's Office, Safety Depository,
 * Vault, Viewing Room, Small Room
 *
 * Accessed from the Underground via a narrow ledge crossing
 * a great chasm. Contains valuable treasures including
 * a portrait, zorkmid bills, and a zorkmid coin.
 */

import {
  WorldModel,
  IFEntity,
  IdentityTrait,
  RoomTrait,
  EntityType,
  Direction,
  DirectionType,
  SceneryTrait,
  OpenableTrait,
  ReadableTrait
} from '@sharpee/world-model';

export interface BankRoomIds {
  eastOfChasm: string;
  westOfChasm: string;
  bankEntrance: string;
  bankLobby: string;
  westTeller: string;
  eastTeller: string;
  chairmansOffice: string;
  safetyDeposit: string;
  vault: string;
  viewingRoom: string;
  smallRoom: string;
}

function createRoom(world: WorldModel, name: string, description: string, isDark = true): IFEntity {
  const room = world.createEntity(name, EntityType.ROOM);
  room.add(new RoomTrait({ exits: {}, isDark, isOutdoors: false }));
  room.add(new IdentityTrait({ name, description, properName: true, article: 'the' }));
  return room;
}

function setExits(room: IFEntity, exits: Partial<Record<DirectionType, string>>): void {
  const trait = room.get(RoomTrait);
  if (trait) {
    for (const [dir, dest] of Object.entries(exits)) {
      trait.exits[dir as DirectionType] = { destination: dest! };
    }
  }
}

export function createBankRegion(world: WorldModel): BankRoomIds {
  // === Create all rooms ===

  const eastOfChasm = createRoom(world, 'East of Chasm',
    'You are on the east edge of a great chasm. A wooden bridge once spanned the gap, but it has long since collapsed. Far below, you can hear the faint sound of rushing water. A narrow ledge runs along the north wall of the chasm.');

  const westOfChasm = createRoom(world, 'West of Chasm',
    'You are on the west edge of a great chasm. The remains of a collapsed bridge dangle into the darkness below. A narrow ledge runs along the north wall of the chasm, providing precarious passage to the east. To the south, an ornate doorway leads into what appears to be a building.');

  const bankEntrance = createRoom(world, 'Bank Entrance',
    'You are in the grand entrance hall of the Bank of Zork. Marble columns rise to a vaulted ceiling decorated with gold leaf. A brass plaque on the wall reads "BANK OF ZORK - Securing Your Treasures Since 668 GUE". The main lobby lies to the south.',
    false);

  const bankLobby = createRoom(world, 'Bank Lobby',
    'You are in the main lobby of the Bank of Zork. Teller windows line the east and west walls, though they have long been abandoned. Dust covers the once-polished marble floor. A velvet rope blocks access to the south, where a sign reads "Employees Only". The entrance is to the north.',
    false);

  const westTeller = createRoom(world, "West Teller's Room",
    'This is a small square room, which was used by a bank officer whose job it was to retrieve safety deposit boxes for the customer. On the north side of the room is a sign which reads "Viewing Room". On the west side of the room, above an open door, is a sign reading\n\n            BANK PERSONNEL ONLY',
    false);

  const eastTeller = createRoom(world, 'East Teller',
    'You are behind the eastern teller window. This area is much like the western side, with a dusty counter and abandoned paperwork. A passage leads west, and a door to the south leads to the back offices.',
    false);

  const chairmansOffice = createRoom(world, "Chairman's Office",
    "You are in the opulent office of the Bank's former chairman. A massive mahogany desk dominates the room, and the walls are lined with bookshelves containing leather-bound volumes. A painting hangs on the north wall. Doors lead north and east.",
    false);

  const safetyDeposit = createRoom(world, 'Safety Depository',
    'This is a large rectangular room. The east and west walls here were used for storing safety deposit boxes. As might be expected, all have been carefully removed by evil persons. To the east, west, and south of the room are large doorways. The northern "wall" of the room is a shimmering curtain of light. In the center of the room is a large stone cube, about 10 feet on a side. Engraved on the side of the cube is some lettering.',
    false);

  const vault = createRoom(world, 'Vault',
    'This is the Vault of the Bank of Zork, in which there are no doors.',
    false);

  const viewingRoom = createRoom(world, 'Viewing Room',
    'This is a room used by holders of safety deposit boxes to view their contents. On the north side of the room is a sign which says\n\nREMAIN HERE WHILE THE BANK OFFICER RETRIEVES YOUR DEPOSIT BOX\nWHEN YOU ARE FINISHED, LEAVE THE BOX, AND EXIT TO THE SOUTH\nAN ADVANCED PROTECTIVE DEVICE PREVENTS ALL CUSTOMERS FROM\nREMOVING ANY SAFETY DEPOSIT BOX FROM THIS VIEWING AREA!\nThank you for banking at the Zork!',
    false);

  const smallRoom = createRoom(world, 'Small Room',
    'This is a small bare room with no distinguishing features. There are no exits from this room.',
    false);

  // === Set up connections ===

  setExits(eastOfChasm, { [Direction.WEST]: westOfChasm.id });
  // S → Underground connected externally

  setExits(westOfChasm, { [Direction.EAST]: eastOfChasm.id });
  // W → Cellar, N → N/S Crawlway, S → Gallery connected externally

  setExits(bankEntrance, {
    [Direction.NORTHWEST]: westTeller.id,
    [Direction.NORTHEAST]: eastTeller.id,
    // E → Gallery connected externally
  });

  setExits(bankLobby, {
    [Direction.NORTH]: bankEntrance.id,
    [Direction.WEST]: westTeller.id,
    [Direction.EAST]: eastTeller.id,
  });

  setExits(westTeller, {
    [Direction.WEST]: safetyDeposit.id,
    [Direction.SOUTHEAST]: bankEntrance.id,
  });

  setExits(eastTeller, {
    [Direction.WEST]: westTeller.id,
    [Direction.SOUTH]: chairmansOffice.id,
  });

  setExits(chairmansOffice, {
    [Direction.NORTH]: eastTeller.id,
    [Direction.WEST]: viewingRoom.id,
    [Direction.EAST]: safetyDeposit.id,
  });

  setExits(safetyDeposit, {
    [Direction.EAST]: westTeller.id,
    [Direction.WEST]: westTeller.id,
    [Direction.SOUTH]: chairmansOffice.id,
  });

  // Vault - NO normal exits, only via walk-through-walls
  // viewingRoom - S → Bank Entrance
  setExits(viewingRoom, { [Direction.SOUTH]: bankEntrance.id });
  // smallRoom - NO normal exits, only via walk-through-walls

  return {
    eastOfChasm: eastOfChasm.id,
    westOfChasm: westOfChasm.id,
    bankEntrance: bankEntrance.id,
    bankLobby: bankLobby.id,
    westTeller: westTeller.id,
    eastTeller: eastTeller.id,
    chairmansOffice: chairmansOffice.id,
    safetyDeposit: safetyDeposit.id,
    vault: vault.id,
    viewingRoom: viewingRoom.id,
    smallRoom: smallRoom.id,
  };
}

// === External connectors ===

/**
 * Connect Bank of Zork to Underground (via Cellar, Gallery, and N/S Crawlway)
 */
export function connectBankToUnderground(
  world: WorldModel,
  bankIds: BankRoomIds,
  cellarId: string,
  galleryId: string,
  nsCrawlwayId?: string
): void {
  const cellar = world.getEntity(cellarId);
  if (cellar) {
    cellar.get(RoomTrait)!.exits[Direction.SOUTH] = { destination: bankIds.westOfChasm };
  }

  const westOfChasm = world.getEntity(bankIds.westOfChasm);
  if (westOfChasm) {
    const roomTrait = westOfChasm.get(RoomTrait)!;
    roomTrait.exits[Direction.WEST] = { destination: cellarId };
    roomTrait.exits[Direction.SOUTH] = { destination: galleryId };
    if (nsCrawlwayId) {
      roomTrait.exits[Direction.NORTH] = { destination: nsCrawlwayId };
    }
  }

  if (nsCrawlwayId) {
    const nsCrawlway = world.getEntity(nsCrawlwayId);
    if (nsCrawlway) {
      nsCrawlway.get(RoomTrait)!.exits[Direction.NORTH] = { destination: bankIds.westOfChasm };
    }
  }

  const gallery = world.getEntity(galleryId);
  if (gallery) {
    const roomTrait = gallery.get(RoomTrait)!;
    roomTrait.exits[Direction.NORTH] = { destination: bankIds.westOfChasm };
    roomTrait.exits[Direction.WEST] = { destination: bankIds.bankEntrance };
  }

  const bankEntrance = world.getEntity(bankIds.bankEntrance);
  if (bankEntrance) {
    bankEntrance.get(RoomTrait)!.exits[Direction.EAST] = { destination: galleryId };
  }
}

// ============================================================================
// OBJECTS - Created near their default room locations
// ============================================================================

/**
 * Create all objects in the Bank of Zork region
 */
export function createBankObjects(world: WorldModel, roomIds: BankRoomIds): void {
  // Treasures
  createPortrait(world, roomIds.chairmansOffice);
  createZorkmidBills(world, roomIds.vault);
  createZorkmidCoin(world, roomIds.smallRoom);

  // Scenery
  createStoneCube(world, roomIds.safetyDeposit);
  createShimmeringCurtain(world, roomIds.safetyDeposit);
  createVelvetCurtain(world, roomIds.viewingRoom);
  createMahoganyDesk(world, roomIds.chairmansOffice);
  createBrassPlaque(world, roomIds.bankEntrance);
  createVaultDoor(world, roomIds.safetyDeposit);

  // Walls for walk-through puzzle
  createNorthWall(world, roomIds.safetyDeposit, 'safety-north-wall');
  createNorthWall(world, roomIds.vault, 'vault-north-wall');
  createSouthWall(world, roomIds.smallRoom);
}

// ============= Treasures =============

function createPortrait(world: WorldModel, roomId: string): IFEntity {
  const portrait = world.createEntity('portrait', EntityType.ITEM);
  portrait.add(new IdentityTrait({
    name: 'portrait',
    aliases: ['portrait', 'flathead portrait'],
    description: 'A magnificent oil portrait of J. Pierpont Flathead, founder of the Bank of Zork. The ornate gilded frame alone must be worth a fortune.',
    properName: false,
    article: 'a',
    weight: 20
  }));
  (portrait as any).isTreasure = true;
  (portrait as any).treasureId = 'portrait';
  (portrait as any).treasureValue = 10;
  (portrait as any).trophyCaseValue = 5;
  world.moveEntity(portrait.id, roomId);
  return portrait;
}

function createZorkmidBills(world: WorldModel, roomId: string): IFEntity {
  const bills = world.createEntity('stack of zorkmid bills', EntityType.ITEM);
  bills.add(new IdentityTrait({
    name: 'stack of zorkmid bills',
    aliases: ['zorkmid bills', 'bills', 'zorkmids', 'stack of bills', 'money', 'currency'],
    description: 'A thick stack of crisp zorkmid bills in various denominations. The bills bear the stern likeness of Lord Dimwit Flathead.',
    properName: false,
    article: 'a',
    weight: 20
  }));
  (bills as any).isTreasure = true;
  (bills as any).treasureId = 'zorkmid-bills';
  (bills as any).treasureValue = 10;
  (bills as any).trophyCaseValue = 15;
  world.moveEntity(bills.id, roomId);
  return bills;
}

function createZorkmidCoin(world: WorldModel, roomId: string): IFEntity {
  const coin = world.createEntity('zorkmid coin', EntityType.ITEM);
  coin.add(new IdentityTrait({
    name: 'zorkmid coin',
    aliases: ['coin', 'zorkmid', 'gold coin'],
    description: 'A large gold zorkmid coin. One side shows a portrait of Lord Dimwit Flathead; the other depicts the great underground dam.',
    properName: false,
    article: 'a',
    weight: 5
  }));
  (coin as any).isTreasure = true;
  (coin as any).treasureId = 'zorkmid-coin';
  (coin as any).treasureValue = 10;
  (coin as any).trophyCaseValue = 12;
  world.moveEntity(coin.id, roomId);
  return coin;
}

// ============= Scenery =============

function createStoneCube(world: WorldModel, roomId: string): IFEntity {
  const cube = world.createEntity('stone cube', EntityType.ITEM);
  cube.add(new IdentityTrait({
    name: 'stone cube',
    aliases: ['cube', 'large cube', 'large stone cube', 'lettering', 'engraving'],
    description: 'A large stone cube, about 10 feet on a side. Engraved on the side of the cube is some lettering.',
    properName: false,
    article: 'a'
  }));
  cube.add(new SceneryTrait());
  cube.add(new ReadableTrait({
    text: `             Bank of Zork
              VAULT
            *722 GUE*
     Frobozz Magic Vault Company`
  }));
  world.moveEntity(cube.id, roomId);
  return cube;
}

function createShimmeringCurtain(world: WorldModel, roomId: string): IFEntity {
  const curtain = world.createEntity('shimmering curtain', EntityType.ITEM);
  curtain.add(new IdentityTrait({
    name: 'shimmering curtain',
    aliases: ['curtain', 'curtain of light', 'shimmering curtain of light', 'light'],
    description: 'The northern "wall" of the room is a shimmering curtain of light. It seems almost tangible, yet ethereal at the same time.',
    properName: false,
    article: 'a'
  }));
  curtain.add(new SceneryTrait());
  (curtain as any).isPassable = true;
  world.moveEntity(curtain.id, roomId);
  return curtain;
}

function createVelvetCurtain(world: WorldModel, roomId: string): IFEntity {
  const curtain = world.createEntity('velvet curtain', EntityType.ITEM);
  curtain.add(new IdentityTrait({
    name: 'velvet curtain',
    aliases: ['curtain', 'heavy curtain', 'drape'],
    description: 'A heavy velvet curtain in deep burgundy. It hangs from ceiling to floor on the south wall.',
    properName: false,
    article: 'a'
  }));
  curtain.add(new SceneryTrait());
  curtain.add(new OpenableTrait({ isOpen: false }));
  world.moveEntity(curtain.id, roomId);
  return curtain;
}

function createMahoganyDesk(world: WorldModel, roomId: string): IFEntity {
  const desk = world.createEntity('mahogany desk', EntityType.ITEM);
  desk.add(new IdentityTrait({
    name: 'mahogany desk',
    aliases: ['desk', 'massive desk', 'chairman desk'],
    description: 'A massive mahogany desk that must weigh several hundred pounds. Its surface is covered with a layer of dust.',
    properName: false,
    article: 'a'
  }));
  desk.add(new SceneryTrait());
  world.moveEntity(desk.id, roomId);
  return desk;
}

function createBrassPlaque(world: WorldModel, roomId: string): IFEntity {
  const plaque = world.createEntity('brass plaque', EntityType.ITEM);
  plaque.add(new IdentityTrait({
    name: 'brass plaque',
    aliases: ['plaque', 'sign'],
    description: 'The brass plaque reads: "BANK OF ZORK - Securing Your Treasures Since 668 GUE".',
    properName: false,
    article: 'a'
  }));
  plaque.add(new SceneryTrait());
  world.moveEntity(plaque.id, roomId);
  return plaque;
}

function createVaultDoor(world: WorldModel, roomId: string): IFEntity {
  const door = world.createEntity('vault door', EntityType.ITEM);
  door.add(new IdentityTrait({
    name: 'vault door',
    aliases: ['massive door', 'steel door', 'vault'],
    description: 'A massive circular vault door made of reinforced steel. It stands slightly ajar, its intricate locking mechanism long since broken.',
    properName: false,
    article: 'a'
  }));
  door.add(new SceneryTrait());
  door.add(new OpenableTrait({ isOpen: true }));
  world.moveEntity(door.id, roomId);
  return door;
}

function createNorthWall(world: WorldModel, roomId: string, uniqueId: string): IFEntity {
  const wall = world.createEntity(uniqueId, EntityType.SCENERY);
  wall.add(new IdentityTrait({
    name: 'north wall',
    aliases: ['north wall', 'n wall', 'northern wall'],
    description: 'The north wall looks solid but somehow insubstantial.',
    properName: false,
    article: 'the'
  }));
  wall.add(new SceneryTrait());
  world.moveEntity(wall.id, roomId);
  return wall;
}

function createSouthWall(world: WorldModel, roomId: string): IFEntity {
  const wall = world.createEntity('south wall', EntityType.SCENERY);
  wall.add(new IdentityTrait({
    name: 'south wall',
    aliases: ['south wall', 's wall', 'southern wall'],
    description: 'The south wall looks solid but somehow insubstantial.',
    properName: false,
    article: 'the'
  }));
  wall.add(new SceneryTrait());
  world.moveEntity(wall.id, roomId);
  return wall;
}
