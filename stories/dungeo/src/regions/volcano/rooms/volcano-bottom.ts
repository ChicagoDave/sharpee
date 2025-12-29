/**
 * Volcano Bottom - Base of the volcanic cavern
 */
import { WorldModel, IFEntity, IdentityTrait, RoomTrait, EntityType } from '@sharpee/world-model';

export function createVolcanoBottom(world: WorldModel): IFEntity {
  const room = world.createEntity('Volcano Bottom', EntityType.ROOM);
  room.add(new RoomTrait({ exits: {}, isDark: true, isOutdoors: false }));
  room.add(new IdentityTrait({
    name: 'Volcano Bottom',
    aliases: ['volcano bottom', 'lava room'],
    description: 'You are at the bottom of a volcanic shaft. The walls glow with residual heat, and you can see a river of molten lava far below. A narrow ledge leads up.',
    properName: true,
    article: 'the'
  }));
  return room;
}
