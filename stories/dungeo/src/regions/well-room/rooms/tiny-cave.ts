/**
 * Tiny Cave - A cramped cave passage
 *
 * Barely large enough to squeeze through.
 */
import { WorldModel, IFEntity, IdentityTrait, RoomTrait, EntityType } from '@sharpee/world-model';

export function createTinyCave(world: WorldModel): IFEntity {
  const room = world.createEntity('Tiny Cave', EntityType.ROOM);
  room.add(new RoomTrait({ exits: {}, isDark: true, isOutdoors: false }));
  room.add(new IdentityTrait({
    name: 'Tiny Cave',
    aliases: ['tiny cave', 'small cave', 'cramped cave'],
    description: 'You are in a tiny cave, barely large enough to stand in. The walls press in on all sides, and you have to duck to avoid hitting your head on the low ceiling.',
    properName: true,
    article: 'the'
  }));
  return room;
}
