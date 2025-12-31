/**
 * Dusty Room - Contains the large emerald
 */
import { WorldModel, IFEntity, IdentityTrait, RoomTrait, EntityType } from '@sharpee/world-model';

export function createDustyRoom(world: WorldModel): IFEntity {
  const room = world.createEntity('Dusty Room', EntityType.ROOM);
  room.add(new RoomTrait({ exits: {}, isDark: true, isOutdoors: false }));
  room.add(new IdentityTrait({
    name: 'Dusty Room',
    aliases: ['dusty room'],
    description: 'This small alcove is covered in volcanic ash and dust. It appears to have been undisturbed for centuries. A passage leads west.',
    properName: true,
    article: 'the'
  }));
  return room;
}
