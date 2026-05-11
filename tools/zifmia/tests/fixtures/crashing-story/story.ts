/**
 * @module fixtures/crashing-story
 * @purpose A test-only `Story` whose `onEngineReady` hook unconditionally
 *   throws. Used by Zifmia command-route tests to exercise AC-13
 *   (engine-throw → 500 `turn_failed` + no save_blob written) through
 *   the real engine path, not a stub.
 * @owner Zifmia test fixtures. Never imported by production code.
 *
 * Per Coding Discipline rule 13a (Integration Reality): the engine-throw
 * acceptance test must run against a real `GameEngine`, not a mock. This
 * fixture is the smallest valid Story that reliably explodes inside
 * `engine.start()` — exactly the kind of corrupt-story behavior the
 * route's catch block must survive.
 */

import type { Story, StoryConfig, GameEngine } from '@sharpee/engine';
import type { IFEntity, WorldModel } from '@sharpee/world-model';
import {
  ActorTrait,
  ContainerTrait,
  EntityType,
  IdentityTrait,
  RoomTrait,
} from '@sharpee/world-model';

export const config: StoryConfig = {
  id: 'zifmia-crashing-fixture',
  title: 'Zifmia Crashing Test Fixture',
  author: 'Zifmia tests',
  version: '0.0.1',
  description: 'Fixture whose engine setup always throws — for AC-13 testing only.',
};

class CrashingFixtureStory implements Story {
  config = config;

  initializeWorld(world: WorldModel): void {
    const room = world.createEntity('Crash Cell', EntityType.ROOM);
    room.add(new RoomTrait({}));
    room.add(
      new IdentityTrait({
        name: 'Crash Cell',
        description: 'You will not see this — the engine throws before describe.',
      }),
    );
    room.add(new ContainerTrait({}));
    const player = world.getPlayer();
    if (player) world.moveEntity(player.id, room.id);
  }

  createPlayer(world: WorldModel): IFEntity {
    const existing = world.getPlayer();
    if (existing) return existing;
    const player = world.createEntity('yourself', EntityType.ACTOR);
    player.add(
      new IdentityTrait({
        name: 'yourself',
        description: 'You are about to crash.',
        properName: true,
        article: '',
      }),
    );
    player.add(new ActorTrait({ isPlayer: true }));
    player.add(new ContainerTrait({ capacity: { maxItems: 5 } }));
    return player;
  }

  onEngineReady(_engine: GameEngine): void {
    throw new Error('crashing-fixture: induced engine-setup failure');
  }
}

export const story: Story = new CrashingFixtureStory();
