/**
 * Family Zoo — Book-aligned tutorial, Chapter 2: Your First Room
 *
 * Cumulative snapshot matching the book's reading order (see
 * docs/book/parts/part-1/02-your-first-room.md). One room, a welcome sign, and a
 * ticket booth — the simplest playable Sharpee story.
 *
 * This set is a 1:1 companion to the book; the historical v01–v18 versions remain
 * the original tutorial. Not wired into index.ts.
 */

import { Story, StoryConfig } from '@sharpee/engine';
import { WorldModel, IFEntity, EntityType } from '@sharpee/world-model';
import {
  IdentityTrait,
  ActorTrait,
  ContainerTrait,
  RoomTrait,
  SceneryTrait,
} from '@sharpee/world-model';

const config: StoryConfig = {
  id: 'familyzoo',
  title: 'Family Zoo',
  author: 'Sharpee Tutorial',
  version: '0.1.0',
  description: 'A small family zoo — learn Sharpee one concept at a time.',
};

class FamilyZooStory implements Story {
  config = config;

  createPlayer(world: WorldModel): IFEntity {
    const player = world.createEntity('yourself', EntityType.ACTOR);

    player.add(new IdentityTrait({
      name: 'yourself',
      description: 'Just an ordinary visitor to the zoo.',
      aliases: ['self', 'myself', 'me'],
      properName: true,
      article: '',
    }));

    player.add(new ActorTrait({ isPlayer: true }));

    player.add(new ContainerTrait({
      capacity: { maxItems: 10 },
    }));

    return player;
  }

  initializeWorld(world: WorldModel): void {
    const entrance = world.createEntity('Zoo Entrance', EntityType.ROOM);

    entrance.add(new RoomTrait({ exits: {}, isDark: false }));
    entrance.add(new IdentityTrait({
      name: 'Zoo Entrance',
      description:
        'You stand before the gates of the Willowbrook Family Zoo. ' +
        'A cheerful welcome sign arches over the entrance, and a small ' +
        'ticket booth sits to one side.',
      aliases: ['entrance', 'gates', 'gate'],
      article: 'the',
    }));

    const sign = world.createEntity('welcome sign', EntityType.SCENERY);
    sign.add(new IdentityTrait({
      name: 'welcome sign',
      description: 'A brightly painted wooden sign welcomes you to the zoo.',
      aliases: ['sign', 'wooden sign'],
      article: 'a',
    }));
    sign.add(new SceneryTrait());

    const booth = world.createEntity('ticket booth', EntityType.SCENERY);
    booth.add(new IdentityTrait({
      name: 'ticket booth',
      description:
        'A small wooden booth with a sliding glass window. A sign in the ' +
        'window reads "Self-Guided Tours — No Ticket Needed Today!"',
      aliases: ['booth', 'ticket booth', 'window'],
      article: 'a',
    }));
    booth.add(new SceneryTrait());

    world.moveEntity(sign.id, entrance.id);
    world.moveEntity(booth.id, entrance.id);

    const player = world.getPlayer();
    if (player) world.moveEntity(player.id, entrance.id);
  }
}

export const story = new FamilyZooStory();
export default story;
