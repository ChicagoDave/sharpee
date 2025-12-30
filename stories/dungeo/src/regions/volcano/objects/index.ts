/**
 * Volcano Region Objects
 *
 * Dusty Room: Large emerald (5 pts)
 * Volcano View: Moby ruby (15 pts)
 */
import { WorldModel, IFEntity, IdentityTrait, EntityType } from '@sharpee/world-model';
import { VolcanoRoomIds } from '../index';

export function createVolcanoObjects(world: WorldModel, roomIds: VolcanoRoomIds): void {
  createLargeEmerald(world, roomIds.dustyRoom);
  createRuby(world, roomIds.smallChamber);
}

function createLargeEmerald(world: WorldModel, roomId: string): IFEntity {
  const emerald = world.createEntity('large emerald', EntityType.ITEM);
  emerald.add(new IdentityTrait({
    name: 'large emerald',
    aliases: ['emerald', 'green gem', 'gem'],
    description: 'A large emerald of exceptional clarity. It glows with an inner green fire.',
    properName: false,
    article: 'a'
  }));
  (emerald as any).isTreasure = true;
  (emerald as any).treasureId = 'large-emerald';
  (emerald as any).treasureValue = 5;
  world.moveEntity(emerald.id, roomId);
  return emerald;
}

function createRuby(world: WorldModel, roomId: string): IFEntity {
  const ruby = world.createEntity('ruby', EntityType.ITEM);
  ruby.add(new IdentityTrait({
    name: 'ruby',
    aliases: ['large ruby', 'red gem', 'gem', 'jewel'],
    description: 'This is an enormous ruby, the size of a robin\'s egg. It sparkles brilliantly in the light.',
    properName: false,
    article: 'a'
  }));
  // Treasure - 15 take + 8 case = 23 total
  (ruby as any).isTreasure = true;
  (ruby as any).treasureId = 'ruby';
  (ruby as any).treasureValue = 15;
  (ruby as any).trophyCaseValue = 8;
  world.moveEntity(ruby.id, roomId);
  return ruby;
}
