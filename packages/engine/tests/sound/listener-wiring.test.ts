/**
 * @file ADR-172 Phase 4 — engine-side player Listener-trait wiring.
 *
 * Verifies that when the engine loads a story, the player gains a
 * `ListenerTrait` automatically — without the story explicitly adding
 * one. This is the contract that lets Phase 6's sound dispatcher
 * enumerate the player as a listener for every emission.
 *
 * Owner context: `@sharpee/engine` — sound subsystem tests.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  ActorTrait,
  ContainerTrait,
  IdentityTrait,
  IFEntity,
  ListenerTrait,
  RoomTrait,
  TraitType,
  WorldModel,
} from '@sharpee/world-model';

import { GameEngine } from '../../src/game-engine';
import { Story, StoryConfig } from '../../src/story';
import { setupTestEngine } from '../test-helpers/setup-test-engine';
import { MinimalTestStory } from '../stories/minimal-test-story';

describe('GameEngine — player Listener-trait wiring (ADR-172 Phase 4)', () => {
  let engine: GameEngine;

  beforeEach(() => {
    ({ engine } = setupTestEngine());
  });

  it('attaches ListenerTrait to a freshly-created player without story authoring', () => {
    // MinimalTestStory.createPlayer() does NOT add a ListenerTrait.
    const story = new MinimalTestStory();
    engine.setStory(story);

    const player = story.getPlayer();
    expect(player).not.toBeNull();
    expect(player!.has(TraitType.LISTENER)).toBe(true);

    const trait = player!.get<ListenerTrait>(TraitType.LISTENER);
    expect(trait).toBeDefined();
    expect(trait?.type).toBe(TraitType.LISTENER);
  });

  it('does not double-attach when a story already added ListenerTrait in createPlayer', () => {
    // A story that explicitly opts into ListenerTrait should keep its
    // own instance — the engine must not overwrite it. Future per-listener
    // data fields could break if the engine clobbered the story's trait.
    class StoryWithListener implements Story {
      config: StoryConfig = {
        id: 'story-with-listener',
        title: 'Story With Listener',
        author: 'Test',
        version: '1.0.0',
      };

      private _player: IFEntity | null = null;
      private _customTrait: ListenerTrait | null = null;
      private _room: IFEntity | null = null;

      createPlayer(world: WorldModel): IFEntity {
        const player = world.createEntity('yourself', 'actor');
        player.add(new ActorTrait());
        player.add(new ContainerTrait());
        player.add(
          new IdentityTrait({
            name: 'yourself',
            article: '',
          }),
        );
        this._customTrait = new ListenerTrait();
        player.add(this._customTrait);
        this._player = player;
        return player;
      }

      initializeWorld(world: WorldModel): void {
        const room = world.createEntity('Test Room', 'room');
        room.add(new RoomTrait());
        this._room = room;
        if (this._player) {
          world.moveEntity(this._player.id, room.id);
        }
      }

      initialize(): void {}

      getPlayer(): IFEntity | null {
        return this._player;
      }

      getCustomTrait(): ListenerTrait | null {
        return this._customTrait;
      }
    }

    const story = new StoryWithListener();
    engine.setStory(story);

    const player = story.getPlayer();
    const customTrait = story.getCustomTrait();
    const actualTrait = player!.get<ListenerTrait>(TraitType.LISTENER);

    expect(actualTrait).toBeDefined();
    // Same instance — engine did not clobber the story's trait.
    expect(actualTrait).toBe(customTrait);
  });
});
