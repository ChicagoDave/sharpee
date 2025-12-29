/**
 * Safety Deposit Area - Where customers accessed their boxes
 *
 * Rows of safety deposit boxes line the walls.
 */
import { WorldModel, IFEntity, IdentityTrait, RoomTrait, EntityType } from '@sharpee/world-model';

export function createSafetyDeposit(world: WorldModel): IFEntity {
  const room = world.createEntity('Safety Deposit Area', EntityType.ROOM);
  room.add(new RoomTrait({ exits: {}, isDark: false, isOutdoors: false }));
  room.add(new IdentityTrait({
    name: 'Safety Deposit Area',
    aliases: ['safety deposit', 'deposit area', 'safety deposit area'],
    description: 'You are in a long narrow room lined with hundreds of small brass safety deposit boxes. Most are locked, their contents long forgotten. A massive vault door dominates the south wall. The exit is to the west.',
    properName: true,
    article: 'the'
  }));
  return room;
}
