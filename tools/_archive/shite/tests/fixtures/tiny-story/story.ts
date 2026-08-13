/**
 * @module fixtures/tiny-story
 * @purpose Minimal `Story` used by Zifmia turn-executor tests. NOT a real
 *   game — just enough world (one room, one decoration, a player) for
 *   `look` to produce text and for state to round-trip through
 *   save/restore.
 * @owner Zifmia test fixtures. NEVER imported by production code.
 *
 * Per the CLAUDE.md feedback rule "Never modify real stories for platform
 * tests" — this is a dedicated test story; nothing in `stories/` is
 * touched.
 */

import type { Story, StoryConfig } from '@sharpee/engine';
import type { IFEntity, WorldModel } from '@sharpee/world-model';
import {
  ActorTrait,
  ContainerTrait,
  EntityType,
  IdentityTrait,
  RoomTrait,
} from '@sharpee/world-model';

export const config: StoryConfig = {
  id: 'zifmia-tiny-fixture',
  title: 'Zifmia Tiny Test Fixture',
  author: 'Zifmia tests',
  version: '0.0.1',
  description: 'Minimal one-room story used by Zifmia turn-executor tests',
};

class TinyFixtureStory implements Story {
  config = config;

  initializeWorld(world: WorldModel): void {
    const room = world.createEntity('Testing Cell', EntityType.ROOM);
    room.add(new RoomTrait({}));
    room.add(
      new IdentityTrait({
        name: 'Testing Cell',
        description: 'A featureless cube of a room reserved for tests.',
        aliases: ['cell', 'room'],
      }),
    );
    room.add(new ContainerTrait({}));

    // Portable on purpose: tests need a takeable item to prove that
    // turn-N restore actually loaded the prior world (the marker's
    // location after `take` is the player, not the room).
    const marker = world.createEntity('marker stone', EntityType.OBJECT);
    marker.add(
      new IdentityTrait({
        name: 'marker stone',
        description: 'A small grey stone, useful only for proving an object exists.',
        aliases: ['stone', 'marker'],
      }),
    );
    world.moveEntity(marker.id, room.id);

    // `createPlayer` runs before `initializeWorld`, so the player exists
    // here but has no location yet. Place them in the test room.
    const player = world.getPlayer();
    if (player) {
      world.moveEntity(player.id, room.id);
    }
  }

  createPlayer(world: WorldModel): IFEntity {
    const existing = world.getPlayer();
    if (existing) return existing;

    const player = world.createEntity('yourself', EntityType.ACTOR);
    player.add(
      new IdentityTrait({
        name: 'yourself',
        description: 'As ordinary as the room.',
        aliases: ['self', 'me', 'myself'],
        properName: true,
        article: '',
      }),
    );
    player.add(new ActorTrait({ isPlayer: true }));
    player.add(new ContainerTrait({ capacity: { maxItems: 5 } }));
    return player;
  }
}

export const story: Story = new TinyFixtureStory();
