/**
 * Well Room Region Objects
 *
 * Objects:
 * - Well (scenery) - Well Room
 * - Bucket - Well Room (for raising/lowering)
 * - Silver chalice (10 pts) - Pool Room
 * - Robot - Low Room
 * - Triangular button - Machine Room (well)
 * - White crystal sphere - Dingy Closet
 */
import {
  WorldModel,
  IFEntity,
  IdentityTrait,
  EntityType,
  SceneryTrait,
  ContainerTrait,
  OpenableTrait,
  ActorTrait,
  NpcTrait,
  VehicleTrait
} from '@sharpee/world-model';
import { WellRoomIds } from '../index';

export function createWellRoomObjects(world: WorldModel, roomIds: WellRoomIds): void {
  // Well/bucket objects - bucket starts at Well Bottom
  createWellScenery(world, roomIds.topOfWell);
  createWellScenery(world, roomIds.wellBottom);
  createBucket(world, roomIds.wellBottom, roomIds.topOfWell, roomIds.wellBottom);

  // Pool Room treasure
  createSilverChalice(world, roomIds.poolRoom);

  // Pearl Room treasure
  createPearl(world, roomIds.pearlRoom);

  // Riddle Room scenery
  createRiddleInscription(world, roomIds.riddleRoom);

  // Tea Room scenery and items
  createDustyTable(world, roomIds.teaRoom);
  createGreenPaper(world, roomIds.teaRoom);
  createCakes(world, roomIds.teaRoom);

  // Posts Room scenery
  createWoodenPosts(world, roomIds.postsRoom);

  // Low Room - Robot NPC
  createRobot(world, roomIds.lowRoom);

  // Machine Room (well) - Triangular button
  createTriangularButton(world, roomIds.machineRoomWell);

  // Dingy Closet - White crystal sphere and cage
  createMetalCage(world, roomIds.dingyCloset);
  createWhiteCrystalSphere(world, roomIds.dingyCloset);
}

function createWellScenery(world: WorldModel, roomId: string): IFEntity {
  const well = world.createEntity('well', EntityType.ITEM);
  well.add(new IdentityTrait({
    name: 'well',
    aliases: ['deep well', 'stone well'],
    description: 'The well is constructed of ancient fitted stones. It descends into darkness, and you cannot see the bottom. A rope is attached to a windlass above the well.',
    properName: false,
    article: 'a'
  }));
  well.add(new SceneryTrait());
  world.moveEntity(well.id, roomId);
  return well;
}

function createBucket(
  world: WorldModel,
  startRoomId: string,
  topOfWellId: string,
  wellBottomId: string
): IFEntity {
  const bucket = world.createEntity('bucket', EntityType.ITEM);
  bucket.add(new IdentityTrait({
    name: 'bucket',
    aliases: ['wooden bucket', 'pail'],
    description: 'A wooden bucket attached to a rope wound around a windlass.',
    properName: false,
    article: 'a'
  }));

  // Container: enterable so player can get in
  bucket.add(new ContainerTrait({
    capacity: { maxItems: 5, maxWeight: 20 },
    enterable: true
  }));
  bucket.add(new OpenableTrait({ isOpen: true })); // Always open container

  // Vehicle: counterweight mechanism (water weight moves it)
  bucket.add(new VehicleTrait({
    vehicleType: 'counterweight',
    blocksWalkingMovement: true,
    requiresExitBeforeLeaving: true,
    currentPosition: 'bottom',
    positionRooms: {
      'top': topOfWellId,
      'bottom': wellBottomId
    },
    isOperational: true
  }));

  // Additional bucket state for counterweight puzzle
  // Whether bucket contains water (for counterweight mechanism)
  (bucket as any).hasWater = false;

  world.moveEntity(bucket.id, startRoomId);
  return bucket;
}

function createSilverChalice(world: WorldModel, roomId: string): IFEntity {
  const chalice = world.createEntity('silver chalice', EntityType.ITEM);
  chalice.add(new IdentityTrait({
    name: 'silver chalice',
    aliases: ['chalice', 'silver cup', 'cup', 'goblet'],
    description: 'A beautiful silver chalice, tarnished with age but still valuable. It bears an inscription in an ancient language.',
    properName: false,
    article: 'a'
  }));
  (chalice as any).isTreasure = true;
  (chalice as any).treasureId = 'silver-chalice';
  (chalice as any).treasureValue = 10;
  world.moveEntity(chalice.id, roomId);
  return chalice;
}

function createDustyTable(world: WorldModel, roomId: string): IFEntity {
  const table = world.createEntity('dusty table', EntityType.ITEM);
  table.add(new IdentityTrait({
    name: 'dusty table',
    aliases: ['table', 'tea table'],
    description: 'A small wooden table, covered in a thick layer of dust. It appears to have been used for serving tea long ago.',
    properName: false,
    article: 'a'
  }));
  table.add(new SceneryTrait());
  world.moveEntity(table.id, roomId);
  return table;
}

function createWoodenPosts(world: WorldModel, roomId: string): IFEntity {
  const posts = world.createEntity('wooden posts', EntityType.ITEM);
  posts.add(new IdentityTrait({
    name: 'wooden posts',
    aliases: ['posts', 'support posts', 'pillars'],
    description: 'Numerous wooden posts support the ceiling of this chamber. They are ancient but sturdy.',
    properName: false,
    article: 'some'
  }));
  posts.add(new SceneryTrait());
  world.moveEntity(posts.id, roomId);
  return posts;
}

function createPearl(world: WorldModel, roomId: string): IFEntity {
  const pearl = world.createEntity('pearl', EntityType.ITEM);
  pearl.add(new IdentityTrait({
    name: 'pearl',
    aliases: ['large pearl', 'giant pearl', 'white pearl'],
    description: 'A magnificent pearl of extraordinary size. It gleams with a soft, lustrous light.',
    properName: false,
    article: 'a'
  }));
  (pearl as any).isTreasure = true;
  (pearl as any).treasureId = 'pearl';
  (pearl as any).treasureValue = 15;
  world.moveEntity(pearl.id, roomId);
  return pearl;
}

function createRiddleInscription(world: WorldModel, roomId: string): IFEntity {
  const inscription = world.createEntity('riddle inscription', EntityType.ITEM);
  inscription.add(new IdentityTrait({
    name: 'riddle inscription',
    aliases: ['inscription', 'riddle', 'writing', 'carved writing', 'symbols'],
    description: 'The inscription reads: "What has roots as nobody sees, is taller than trees, up, up it goes, and yet never grows?"',
    properName: false,
    article: 'a'
  }));
  inscription.add(new SceneryTrait());
  world.moveEntity(inscription.id, roomId);
  return inscription;
}

/**
 * Robot NPC - Commandable helper that can push the triangular button
 */
function createRobot(world: WorldModel, roomId: string): IFEntity {
  const robot = world.createEntity('robot', EntityType.ACTOR);

  robot.add(new IdentityTrait({
    name: 'robot',
    aliases: ['robot', 'mechanical man', 'machine', 'mechanical device'],
    description: 'A metallic robot with a hinged panel on its chest. It appears to be waiting for instructions.',
    properName: false,
    article: 'a'
  }));

  robot.add(new ActorTrait({
    isPlayer: false
  }));

  robot.add(new NpcTrait({
    behaviorId: 'robot',
    isHostile: false,
    canMove: true,
    customProperties: {
      following: false,
      buttonPushed: false,
      homeRoomId: roomId
    }
  }));

  world.moveEntity(robot.id, roomId);
  return robot;
}

/**
 * Triangular Button - Too small for human fingers, robot can push it
 */
function createTriangularButton(world: WorldModel, roomId: string): IFEntity {
  const button = world.createEntity('triangular button', EntityType.ITEM);

  button.add(new IdentityTrait({
    name: 'triangular button',
    aliases: ['button', 'small button', 'triangle button'],
    description: 'A small triangular button set into the wall. It is too small for your finger to push.',
    properName: false,
    article: 'a'
  }));

  button.add(new SceneryTrait());

  // Button state
  (button as any).isPushed = false;

  world.moveEntity(button.id, roomId);
  return button;
}

/**
 * Metal Cage - Contains the white crystal sphere
 */
function createMetalCage(world: WorldModel, roomId: string): IFEntity {
  const cage = world.createEntity('metal cage', EntityType.ITEM);

  cage.add(new IdentityTrait({
    name: 'metal cage',
    aliases: ['cage', 'iron cage', 'wire cage'],
    description: 'A strange wire cage with bars too close together to reach through. Something glows beneath it.',
    properName: false,
    article: 'a'
  }));

  cage.add(new SceneryTrait());

  // The cage can be lifted to reveal the sphere
  (cage as any).isLifted = false;

  world.moveEntity(cage.id, roomId);
  return cage;
}

/**
 * White Crystal Sphere - Treasure hidden under the cage
 */
function createWhiteCrystalSphere(world: WorldModel, roomId: string): IFEntity {
  const sphere = world.createEntity('white crystal sphere', EntityType.ITEM);

  sphere.add(new IdentityTrait({
    name: 'white crystal sphere',
    aliases: ['sphere', 'crystal sphere', 'white sphere', 'crystal ball', 'crystal'],
    description: 'A perfectly smooth sphere of white crystal. It glows with an inner light.',
    properName: false,
    article: 'a'
  }));

  // Treasure scoring
  (sphere as any).isTreasure = true;
  (sphere as any).treasureId = 'white-crystal-sphere';
  (sphere as any).treasureValue = 6;  // Take value
  (sphere as any).trophyCaseValue = 6;  // Additional case value

  world.moveEntity(sphere.id, roomId);
  return sphere;
}

/**
 * Green Paper - Found in Tea Room, reading reveals a clue
 */
function createGreenPaper(world: WorldModel, roomId: string): IFEntity {
  const paper = world.createEntity('green paper', EntityType.ITEM);

  paper.add(new IdentityTrait({
    name: 'piece of paper',
    aliases: ['paper', 'green paper', 'note', 'piece of green paper'],
    description: 'A small piece of green paper with some writing on it.',
    properName: false,
    article: 'a'
  }));

  // Readable text - FROBOZZ MAGIC BOAT COMPANY
  (paper as any).readText = `
     ============================================
              FROBOZZ MAGIC BOAT COMPANY
     ============================================

     Hello, Sailor!

     Instructions for use:

     To Inflate: Apply pump to valve.
     To Deflate: Open valve.
     To Patch: Apply patch to boat.

     WARNING: Boat should be properly deflated before
     leaving water as sharp objects may puncture it.

     ============================================`;

  world.moveEntity(paper.id, roomId);
  return paper;
}

/**
 * Create cakes in Tea Room - Alice in Wonderland reference
 *
 * eat-me cake: Changes player size (makes you large)
 * drink-me cake: Changes player size (makes you small) - it's a cake, not liquid!
 * orange cake: Edible but no special effect
 */
function createCakes(world: WorldModel, roomId: string): void {
  // "Eat Me" cake
  const eatMeCake = world.createEntity('eat-me cake', EntityType.ITEM);
  eatMeCake.add(new IdentityTrait({
    name: '"Eat Me" cake',
    aliases: ['eat me', 'eat-me', 'eat me cake', 'white cake'],
    description: 'A small cake with "Eat Me" written on it in frosting.',
    properName: false,
    article: 'an'
  }));
  // Eating this makes you grow large
  (eatMeCake as any).isEdible = true;
  (eatMeCake as any).onEatEffect = 'grow';
  world.moveEntity(eatMeCake.id, roomId);

  // "Drink Me" cake (yes, it's a cake in Dungeon)
  const drinkMeCake = world.createEntity('drink-me cake', EntityType.ITEM);
  drinkMeCake.add(new IdentityTrait({
    name: '"Drink Me" cake',
    aliases: ['drink me', 'drink-me', 'drink me cake', 'blue cake'],
    description: 'A small blue cake with "Drink Me" written on it.',
    properName: false,
    article: 'a'
  }));
  // Eating this makes you shrink
  (drinkMeCake as any).isEdible = true;
  (drinkMeCake as any).onEatEffect = 'shrink';
  world.moveEntity(drinkMeCake.id, roomId);

  // Orange cake - just food
  const orangeCake = world.createEntity('orange cake', EntityType.ITEM);
  orangeCake.add(new IdentityTrait({
    name: 'orange cake',
    aliases: ['orange', 'orange colored cake', 'cake'],
    description: 'A small orange-colored cake. It looks delicious.',
    properName: false,
    article: 'an'
  }));
  (orangeCake as any).isEdible = true;
  world.moveEntity(orangeCake.id, roomId);
}
