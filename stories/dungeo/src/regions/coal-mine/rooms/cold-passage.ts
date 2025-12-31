/**
 * Cold Passage - Connects Mirror Room (Coal Mine state) to Slide Room
 *
 * Part of the entrance to the Coal Mine from the Mirror Room.
 * E: Mirror Room (Coal Mine state)
 * W: Slide Room
 * N: Steep Crawlway
 */
import { WorldModel, IFEntity, IdentityTrait, RoomTrait, EntityType } from '@sharpee/world-model';

export function createColdPassage(world: WorldModel): IFEntity {
  const room = world.createEntity('Cold Passage', EntityType.ROOM);
  room.add(new RoomTrait({ exits: {}, isDark: true, isOutdoors: false }));
  room.add(new IdentityTrait({
    name: 'Cold Passage',
    aliases: ['cold passage', 'passage'],
    description: 'You are in a cold, damp passage. The air here is noticeably colder than elsewhere in the underground. Passages lead in several directions.',
    properName: true,
    article: 'the'
  }));
  return room;
}
