/**
 * Well Room Region Objects
 *
 * Objects:
 * - Well (scenery) - Well Room
 * - Bucket - Well Room (for raising/lowering)
 * - Silver chalice (10 pts) - Pool Room
 */
import {
  WorldModel,
  IFEntity,
  IdentityTrait,
  EntityType,
  SceneryTrait,
  ContainerTrait,
  OpenableTrait
} from '@sharpee/world-model';
import { WellRoomIds } from '../index';

export function createWellRoomObjects(world: WorldModel, roomIds: WellRoomIds): void {
  // Well Room objects
  createWell(world, roomIds.wellRoom);
  createBucket(world, roomIds.wellRoom);

  // Pool Room treasure
  createSilverChalice(world, roomIds.poolRoom);

  // Pearl Room treasure
  createPearl(world, roomIds.pearlRoom);

  // Riddle Room scenery
  createRiddleInscription(world, roomIds.riddleRoom);

  // Tea Room scenery
  createDustyTable(world, roomIds.teaRoom);

  // Posts Room scenery
  createWoodenPosts(world, roomIds.postsRoom);
}

function createWell(world: WorldModel, roomId: string): IFEntity {
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

function createBucket(world: WorldModel, roomId: string): IFEntity {
  const bucket = world.createEntity('bucket', EntityType.ITEM);
  bucket.add(new IdentityTrait({
    name: 'bucket',
    aliases: ['wooden bucket', 'pail'],
    description: 'A wooden bucket attached to a rope. It can be lowered into the well.',
    properName: false,
    article: 'a'
  }));
  bucket.add(new ContainerTrait({
    capacity: { maxItems: 5, maxWeight: 20 }
  }));
  // Bucket state - at top or lowered
  (bucket as any).isLowered = false;
  world.moveEntity(bucket.id, roomId);
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
