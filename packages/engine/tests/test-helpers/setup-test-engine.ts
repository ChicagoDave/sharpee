/**
 * Test helper to set up engine without dynamic imports
 */

import { GameEngine } from '../../src/game-engine';
import { WorldModel, EntityType } from '@sharpee/world-model';
import { registerStandardCapabilities } from '@sharpee/stdlib';
import { createMockTextService } from '../../src/test-helpers/mock-text-service';
import { Story } from '../../src/story';
import { EnglishLanguageProvider } from '@sharpee/lang-en-us';
import { EnglishParser } from '@sharpee/parser-en-us';
import { TextService } from '@sharpee/if-services';

export interface TestEngineOptions {
  includeCapabilities?: boolean;
  includeObjects?: boolean;
}

/**
 * Create a test engine with all services pre-configured
 * This avoids dynamic imports that cause test hangs
 */
export function setupTestEngine(options: TestEngineOptions = {}): {
  engine: GameEngine;
  world: WorldModel;
  player: any;
  languageProvider: EnglishLanguageProvider;
  parser: EnglishParser;
  textService: TextService;
} {
  const { includeCapabilities = true, includeObjects = false } = options;
  
  // Create world model
  const world = new WorldModel();
  
  // Register capabilities if requested
  if (includeCapabilities) {
    registerStandardCapabilities(world);
  }
  
  // Create player
  const player = world.createEntity('You', EntityType.ACTOR);
  world.setPlayer(player.id);
  
  // Create test room
  const room = world.createEntity('Test Room', EntityType.ROOM);
  world.moveEntity(player.id, room.id);
  
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
  const textService = createMockTextService();
  
  // Create engine with static dependencies
  const engine = new GameEngine({
    world,
    player,
    parser,
    language: languageProvider,
    textService
  });
  
  return { engine, world, player, languageProvider, parser, textService };
}

/**
 * Create a minimal test story object
 */
export function createMinimalStory(): Story {
  return {
    config: {
      id: 'test-story',
      title: 'Test Story',
      author: 'Test Author',
      version: '1.0.0'
    },
    
    createPlayer: (world: WorldModel) => {
      return world.createEntity('You', EntityType.ACTOR);
    },
    
    initializeWorld: (world: WorldModel) => {
      // Minimal initialization
      const room = world.createEntity('Test Room', EntityType.ROOM);
    }
  };
}