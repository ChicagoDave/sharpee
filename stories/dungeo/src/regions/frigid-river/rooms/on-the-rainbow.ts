/**
 * On the Rainbow - Standing on a solid rainbow
 *
 * Made solid by waving the sceptre.
 */
import { WorldModel, IFEntity, IdentityTrait, RoomTrait, EntityType } from '@sharpee/world-model';

export function createOnTheRainbow(world: WorldModel): IFEntity {
  const room = world.createEntity('On the Rainbow', EntityType.ROOM);
  room.add(new RoomTrait({ exits: {}, isDark: false, isOutdoors: true }));
  room.add(new IdentityTrait({
    name: 'On the Rainbow',
    aliases: ['on the rainbow', 'rainbow'],
    description: 'You are standing on a solid rainbow that arcs over Aragain Falls. The view is breathtaking - you can see for miles in every direction. The rainbow leads to a small ledge at the end.',
    properName: true,
    article: ''
  }));
  return room;
}
