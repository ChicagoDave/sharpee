/**
 * @sharpee/story-channel-service-test/playable-story — minimal playable
 * story for AC-15 (ADR-163 §14, ADR-165 AC-12).
 *
 * Owner context: AC-15 fixture. One room, one player, one portable
 * item (`beacon`). Stdlib actions (`look`, `take`, `drop`) drive the
 * inventory-size channel registered via `Story.registerChannels`.
 *
 * Note on plan deviation: the master plan suggested a custom verb
 * `stat` to trigger `debug-stats` reads. The implemented version
 * drops the custom verb — natural stdlib actions (`take`, `drop`)
 * mutate inventory, and the channel projects from world state
 * directly. Sparse-emit suppression is exercised by repeating
 * `look` (no inventory change → no re-emission). One fewer moving
 * part to maintain; the AC-15 surfaces of "wire equivalence" and
 * "renderer parity" are covered identically.
 */

import type { GameEngine } from '@sharpee/engine';
import { Story, StoryConfig } from '@sharpee/engine';
import type { Parser } from '@sharpee/parser-en-us';
import type { LanguageProvider } from '@sharpee/lang-en-us';
import type { IChannelRegistry } from '@sharpee/if-domain';
import {
  WorldModel,
  IFEntity,
  IdentityTrait,
  ActorTrait,
  ContainerTrait,
  RoomTrait,
  EntityType,
} from '@sharpee/world-model';
import { registerStoryChannels } from './channels';

/**
 * Minimal playable Sharpee story implementing the `Story` interface
 * with the new ADR-163 `registerChannels` hook.
 */
export class ChannelServiceTestStory implements Story {
  config: StoryConfig = {
    id: 'channel-service-test',
    title: 'Channel Service Test Story',
    author: 'Sharpee Platform',
    version: '0.0.2',
    description:
      'AC-15 fixture for ADR-163 channel-I/O parity. One room, one beacon, one debug-stats channel.',
  };

  initializeWorld(world: WorldModel): void {
    // The Lab — single room with one portable item.
    const lab = world.createEntity('The Lab', EntityType.ROOM);
    lab.add(
      new RoomTrait({
        exits: {},
        requiresLight: false,
      }),
    );
    lab.add(
      new IdentityTrait({
        name: 'The Lab',
        aliases: ['lab', 'room'],
        description:
          'A featureless test environment. A single beacon sits on the floor.',
        properName: false,
        article: 'the',
      }),
    );

    // The beacon — portable item that can be taken and dropped.
    const beacon = world.createEntity('beacon', EntityType.ITEM);
    beacon.add(
      new IdentityTrait({
        name: 'beacon',
        aliases: ['beacon', 'lamp', 'light'],
        description: 'A small steady-glow beacon.',
        properName: false,
        article: 'a',
      }),
    );

    // Place the beacon in the lab so the player can take it.
    world.moveEntity(beacon.id, lab.id);

    // Place the player in the lab. The player is created externally
    // (via createPlayer + setPlayer); positioning happens here so the
    // engine's first turn produces the lab's room description.
    const player = world.getPlayer();
    if (player) {
      world.moveEntity(player.id, lab.id);
    }
  }

  createPlayer(world: WorldModel): IFEntity {
    const existing = world.getPlayer();
    if (existing) {
      ensurePlayerTraits(existing);
      return existing;
    }
    const player = world.createEntity('yourself', EntityType.ACTOR);
    ensurePlayerTraits(player);
    return player;
  }

  /**
   * ADR-163 hook — registers the story's `debug-stats` channel on the
   * shared registry before the engine constructs the `ChannelService`.
   */
  registerChannels(registry: IChannelRegistry): void {
    registerStoryChannels(registry);
  }

  // No `extendParser`, `extendLanguage`, or `onEngineReady` overrides —
  // stdlib's default actions cover look/take/drop.
  extendParser?(_parser: Parser): void {
    // intentionally empty
  }

  extendLanguage?(_language: LanguageProvider): void {
    // intentionally empty
  }

  onEngineReady?(_engine: GameEngine): void {
    // intentionally empty
  }
}

function ensurePlayerTraits(entity: IFEntity): void {
  if (!entity.has('identity')) {
    entity.add(
      new IdentityTrait({
        name: 'yourself',
        description: 'A test subject.',
        aliases: ['self', 'myself', 'me', 'yourself'],
        properName: true,
        article: '',
      }),
    );
  }
  if (!entity.has('actor')) {
    entity.add(new ActorTrait({ isPlayer: true }));
  }
  if (!entity.has('container')) {
    entity.add(new ContainerTrait({ capacity: { maxItems: 10 } }));
  }
}

/**
 * Story factory (ADR-248): the module's sole story export. Each call
 * returns a fully fresh story instance — clients call this per boot.
 */
export function createStory(): ChannelServiceTestStory {
  return new ChannelServiceTestStory();
}
