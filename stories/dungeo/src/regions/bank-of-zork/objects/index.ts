/**
 * Bank of Zork Objects
 *
 * Treasures:
 * - Portrait (10 pts) - Chairman's Office
 * - Stack of zorkmid bills (15 pts) - Vault
 * - Zorkmid coin (5 pts) - Small Room
 */
import {
  WorldModel,
  IFEntity,
  IdentityTrait,
  EntityType,
  SceneryTrait,
  OpenableTrait,
  ReadableTrait
} from '@sharpee/world-model';
import { BankRoomIds } from '../index';

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
  createNorthWall(world, roomIds.safetyDeposit);
  createNorthWall(world, roomIds.vault);
  createSouthWall(world, roomIds.smallRoom);
}

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
  (bills as any).treasureValue = 15;
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
  (coin as any).treasureValue = 5;
  world.moveEntity(coin.id, roomId);
  return coin;
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
  // Make the cube readable with the vault information
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
  // The curtain can be walked through - this will be handled by custom action
  (curtain as any).isPassable = true;
  world.moveEntity(curtain.id, roomId);
  return curtain;
}

function createNorthWall(world: WorldModel, roomId: string): IFEntity {
  const wall = world.createEntity('north wall', EntityType.SCENERY);
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
