/**
 * heard-presence.test.ts — what is heard passes the one enrichment funnel
 * (alignment-fixes Older-2; ADR-334 D4), and a hearing is witnessed where
 * the listener is, not where the sound came from (ADR-328 D3).
 *
 * A bell rings in the Hall while the player stands in the Parlor next door,
 * with a cook listening in the Hall. The player's heard event names the
 * Hall as its location (the sound's room); stamped from that, it would read
 * as a turn the player was absent from and the client would hide it. The
 * sound stage stamps presence from the listener first: the player's own
 * hearing is present, the cook's is absent (the player is not in the
 * Hall). Every heard event carries the turn and the sound stage's own
 * transaction id. A real engine with the real perception service; nothing
 * stubbed.
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
  RoomBehavior,
  RoomTrait,
  WorldModel,
} from '@sharpee/world-model';
import { PerceptionService, type Action, type ActionContext, type ValidationResult } from '@sharpee/stdlib';
import { EnglishLanguageProvider } from '@sharpee/lang-en-us';
import { EnglishParser } from '@sharpee/parser-en-us';
import { SOUND_EVENT_TYPES, type ISound } from '@sharpee/if-domain';
import type { ISemanticEvent } from '@sharpee/core';

import { GameEngine } from '../../src/game-engine';
import type { Story, StoryConfig } from '../../src/install/story';

const RING_ACTION_ID = 'test.action.ring';

class BellStory implements Story {
  config: StoryConfig = { id: 'bell-test', title: 'Bell Test', authors: ['test'], version: '1.0.0' };

  player!: IFEntity;
  cook!: IFEntity;
  bell!: IFEntity;
  parlor!: IFEntity;
  hall!: IFEntity;

  /** Rings the bell where it hangs — a sound made away from the player, as a story clause makes one. */
  private ringAction: Action = {
    id: RING_ACTION_ID,
    validate(_context: ActionContext): ValidationResult {
      return { valid: true };
    },
    execute(_context: ActionContext): void {},
    report: (context: ActionContext): ISemanticEvent[] => {
      const sound: ISound = { sourceEntity: this.bell.id, sourceLocation: this.hall.id, kind: 'bell', volumeTier: 'raised' };
      return [context.event(SOUND_EVENT_TYPES.EMITTED, { ...sound })];
    },
  };

  initializeWorld(world: WorldModel): void {
    this.parlor = world.createEntity('Parlor', 'room');
    this.parlor.add(new RoomTrait());
    this.parlor.add(new IdentityTrait({ name: 'Parlor', article: 'the' }));
    this.hall = world.createEntity('Hall', 'room');
    this.hall.add(new RoomTrait());
    this.hall.add(new IdentityTrait({ name: 'Hall', article: 'the' }));
    RoomBehavior.setExit(this.parlor, 'north', this.hall.id);
    RoomBehavior.setExit(this.hall, 'south', this.parlor.id);

    this.bell = world.createEntity('bell', 'object');
    this.bell.add(new IdentityTrait({ name: 'bell', article: 'the' }));
    world.moveEntity(this.bell.id, this.hall.id);

    this.cook = world.createEntity('cook', 'actor');
    this.cook.add(new ActorTrait());
    this.cook.add(new ContainerTrait());
    this.cook.add(new IdentityTrait({ name: 'cook', article: 'the' }));
    this.cook.add(new ListenerTrait());
    world.moveEntity(this.cook.id, this.hall.id);
  }

  createPlayer(world: WorldModel): IFEntity {
    this.player = world.createEntity('yourself', 'actor');
    this.player.add(new ActorTrait({ isPlayable: true }));
    this.player.add(new ContainerTrait());
    this.player.add(new IdentityTrait({ name: 'yourself', article: '' }));
    world.moveEntity(this.player.id, this.parlor.id);
    return this.player;
  }

  getCustomActions(): Action[] {
    return [this.ringAction];
  }
}

describe('a hearing is enriched and witnessed where the listener is (Older-2)', () => {
  let engine: GameEngine;
  let story: BellStory;

  beforeEach(async () => {
    const world = new WorldModel();
    const language = new EnglishLanguageProvider();
    const parser = new EnglishParser(language, { world });
    engine = new GameEngine({ world, parser, language, perceptionService: new PerceptionService() });
    parser.addVerb(RING_ACTION_ID, ['ring'], 'VERB_ONLY');
    story = new BellStory();
    engine.installStory(story);
    await engine.start();
  });

  const heardBy = (events: ISemanticEvent[], listenerId: string) =>
    events.filter((e) => e.type === SOUND_EVENT_TYPES.AUDIBILITY_HEARD && e.entities.target === listenerId);

  it('the player hears the bell next door, present at their own hearing though the sound came from the Hall', async () => {
    const result = await engine.executeTurn('ring');
    const heard = heardBy(result.events, story.player.id);
    expect(heard).toHaveLength(1);
    expect(heard[0].entities.location).toBe(story.hall.id);
    expect(heard[0].presence).toBe('present');
  });

  it('the cook\'s hearing in the Hall is absent, since the player is not there', async () => {
    const result = await engine.executeTurn('ring');
    const heard = heardBy(result.events, story.cook.id);
    expect(heard).toHaveLength(1);
    expect(heard[0].presence).toBe('absent');
  });

  it('every heard event carries the turn and the sound stage\'s transaction', async () => {
    const result = await engine.executeTurn('ring');
    const heard = result.events.filter((e) => e.type === SOUND_EVENT_TYPES.AUDIBILITY_HEARD);
    expect(heard.length).toBeGreaterThan(0);
    for (const event of heard) {
      const data = event.data as { turn?: number; _transactionId?: string };
      expect(data._transactionId).toBe(`txn:${data.turn}:sound`);
      expect(typeof data.turn).toBe('number');
    }
  });
});
