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
  createMobyRuby(world, roomIds.volcanoView);
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

function createMobyRuby(world: WorldModel, roomId: string): IFEntity {
  const ruby = world.createEntity('moby ruby', EntityType.ITEM);
  ruby.add(new IdentityTrait({
    name: 'moby ruby',
    aliases: ['ruby', 'huge ruby', 'red gem', 'moby'],
    description: 'An enormous ruby, the size of your fist. It pulses with a deep red glow, as if containing volcanic fire.',
    properName: false,
    article: 'a'
  }));
  (ruby as any).isTreasure = true;
  (ruby as any).treasureId = 'moby-ruby';
  (ruby as any).treasureValue = 15;
  world.moveEntity(ruby.id, roomId);
  return ruby;
}
