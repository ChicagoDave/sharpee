/**
 * Test helper to set up engine without dynamic imports
 */

import { GameEngine } from '../../src/game-engine';
import type { IFEntity } from '@sharpee/world-model';
import { WorldModel, EntityType, ActorTrait } from '@sharpee/world-model';
import { registerStandardCapabilities, PerceptionService } from '@sharpee/stdlib';
import { Story } from '../../src/install/story';
import { EnglishLanguageProvider } from '@sharpee/lang-en-us';
import { EnglishParser } from '@sharpee/parser-en-us';

export interface TestEngineOptions {
  includeCapabilities?: boolean;
  includeObjects?: boolean;
  /** Optional EngineConfig forwarded to the GameEngine constructor (e.g. `seed`). */
  config?: import('../../src/types').EngineConfig;
  /** Wire the real stdlib PerceptionService (presence tagging, ADR-328 D3). */
  withPerception?: boolean;
}

/**
 * Create a test engine with all services pre-configured
 * This avoids dynamic imports that cause test hangs
 */
export function setupTestEngine(options: TestEngineOptions = {}): {
  engine: GameEngine;
  world: WorldModel;
  languageProvider: EnglishLanguageProvider;
  parser: EnglishParser;
} {
  const { includeCapabilities = true, includeObjects = false, config, withPerception = false } = options;

  // Create world model
  const world = new WorldModel();

  // Register capabilities if requested
  if (includeCapabilities) {
    registerStandardCapabilities(world);
  }

  // No player is created here (ADR-344 D3): the player comes from the story.
  // A caller with no story of its own installs `createMinimalStory()`, which
  // builds a room, a placed actor, and any test objects as one coherent world.
  // The scaffolding room below stays for callers that ask for `includeObjects`
  // alongside a story of their own.
  const room = world.createEntity('Test Room', EntityType.ROOM);

  // Add test objects if requested
  if (includeObjects) {
    const lamp = world.createEntity('brass lamp', EntityType.OBJECT);
    const box = world.createEntity('wooden box', EntityType.CONTAINER);
    world.moveEntity(lamp.id, room.id);
    world.moveEntity(box.id, room.id);
  }

  // Create services
  const languageProvider = new EnglishLanguageProvider();
  const parser = new EnglishParser(languageProvider, { world });

  // Create engine (TextService created internally from language provider)
  const engine = new GameEngine({
    world,
    parser,
    language: languageProvider,
    ...(config ? { config } : {}),
    ...(withPerception ? { perceptionService: new PerceptionService() } : {}),
  });

  return { engine, world, languageProvider, parser };
}

/**
 * A test engine with a minimal story already installed.
 *
 * For tests that need a working engine but have no story of their own — the
 * player, its room and any test objects all come from the story, which is the
 * post-ADR-327-D10 shape (ADR-344 D3).
 *
 * @param options same as `setupTestEngine`; `includeObjects` puts a brass lamp
 *   and a wooden box in the player's room.
 * @returns the engine, world, services, and the story's player entity.
 */
export function setupTestEngineWithStory(options: TestEngineOptions = {}): {
  engine: GameEngine;
  world: WorldModel;
  player: IFEntity;
  languageProvider: EnglishLanguageProvider;
  parser: EnglishParser;
} {
  const setup = setupTestEngine(options);
  setup.engine.installStory(createMinimalStory({ includeObjects: options.includeObjects }));
  return { ...setup, player: setup.world.getPlayer()! };
}

/**
 * Create a minimal test story object
 */
export function createMinimalStory(options: { includeObjects?: boolean } = {}): Story {
  // The entity `initializeWorld` builds, handed to `createPlayer` below.
  let playerId: string | undefined;

  return {
    config: {
      id: 'test-story',
      title: 'Test Story',
      authors: ['Test Author'],
      version: '1.0.0',
    },

    // ADR-327 D10: the world is built first and the player found second, so
    // the actor is created and PLACED here and `createPlayer` below is a
    // lookup, not a build. Building an unplaced actor in `createPlayer` left
    // every scope-dependent assertion running against an empty scope (GH #278).
    initializeWorld: (world: WorldModel) => {
      const room = world.createEntity('Story Room', EntityType.ROOM);
      const player = world.createEntity('You', EntityType.ACTOR);
      player.add(new ActorTrait());
      world.moveEntity(player.id, room.id);
      playerId = player.id;

      if (options.includeObjects) {
        const lamp = world.createEntity('brass lamp', EntityType.OBJECT);
        const box = world.createEntity('wooden box', EntityType.CONTAINER);
        world.moveEntity(lamp.id, room.id);
        world.moveEntity(box.id, room.id);
      }
    },

    createPlayer: (world: WorldModel) => {
      if (!playerId) {
        throw new Error('createMinimalStory: initializeWorld must run before createPlayer (ADR-327 D10)');
      }
      return world.getEntity(playerId)!;
    },
  };
}
