/**
 * Volcano Region Objects
 *
 * Dusty Room: Large emerald (5 pts)
 * Ruby Room: Ruby (15 pts take + 8 case = 23 pts)
 * Library: Purple book containing Flathead stamp (4 pts take + 10 case = 14 pts)
 */
import { WorldModel, IFEntity, IdentityTrait, ContainerTrait, ReadableTrait, EntityType } from '@sharpee/world-model';
import { VolcanoRoomIds } from '../index';

export function createVolcanoObjects(world: WorldModel, roomIds: VolcanoRoomIds): void {
  createLargeEmerald(world, roomIds.dustyRoom);
  createRuby(world, roomIds.rubyRoom);
  createPurpleBook(world, roomIds.library);
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

/**
 * Purple Book - Contains the Lord Dimwit Flathead stamp
 *
 * The book itself isn't a treasure, but contains the stamp which is.
 */
function createPurpleBook(world: WorldModel, roomId: string): IFEntity {
  const book = world.createEntity('purple book', EntityType.ITEM);
  book.add(new IdentityTrait({
    name: 'purple book',
    aliases: ['book', 'purple volume', 'volume'],
    description: 'This is an old book bound in purple leather. The title reads "The History of the Great Underground Empire".',
    properName: false,
    article: 'a'
  }));
  book.add(new ReadableTrait({
    text: `THE HISTORY OF THE GREAT UNDERGROUND EMPIRE

This volume chronicles the rise and fall of the Flathead dynasty. Lord Dimwit Flathead the Excessive was the most extravagant of the Flatheads, known for his grandiose projects including Flood Control Dam #3.

A stamp falls out of the book as you read it.`
  }));
  book.add(new ContainerTrait({
    capacity: { maxItems: 5, maxWeight: 10 }
  }));
  world.moveEntity(book.id, roomId);

  // Create the stamp inside the book
  const stamp = world.createEntity('stamp', EntityType.ITEM);
  stamp.add(new IdentityTrait({
    name: 'stamp',
    aliases: ['flathead stamp', 'postage stamp', 'lord dimwit flathead stamp'],
    description: 'This is a rare stamp depicting Lord Dimwit Flathead. It is quite valuable to collectors.',
    properName: false,
    article: 'a'
  }));
  // Treasure - 4 take + 10 case = 14 total
  (stamp as any).isTreasure = true;
  (stamp as any).treasureId = 'flathead-stamp';
  (stamp as any).treasureValue = 4;
  (stamp as any).trophyCaseValue = 10;
  world.moveEntity(stamp.id, book.id);

  return book;
}
