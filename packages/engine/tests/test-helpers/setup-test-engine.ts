/**
 * Test helper to set up engine without dynamic imports
 */

import { GameEngine, createStandardEngine } from '../../src/game-engine';
import { WorldModel, EntityType } from '@sharpee/world-model';
import { registerStandardCapabilities } from '@sharpee/stdlib';
import { createMockTextService } from '../../src/test-helpers/mock-text-service';
import { Story } from '../../src/story';
import { EnglishLanguageProvider } from '@sharpee/lang-en-us';
import { EnglishParser } from '@sharpee/parser-en-us';

export interface TestEngineOptions {
  includeCapabilities?: boolean;
  includeObjects?: boolean;
}

/**
 * Create a test engine with all services pre-configured
 * This avoids dynamic imports that cause test hangs
 */
export async function setupTestEngine(options: TestEngineOptions = {}): Promise<{
  engine: GameEngine;
  world: WorldModel;
  player: any;
}> {
  const { includeCapabilities = true, includeObjects = false } = options;
  
  // Create engine
  const engine = createStandardEngine();
  const world = engine.getWorld();
  
  // Set text service directly (no dynamic import)
  const textService = createMockTextService();
  engine.setTextService(textService);
  
  // Set language provider directly (no dynamic import)
  const languageProvider = new EnglishLanguageProvider();
  (engine as any).languageProvider = languageProvider;
  
  // Set parser directly (no dynamic import)  
  const parser = new EnglishParser(world, languageProvider);
  (engine as any).parser = parser;
  
  // Create player
  const player = world.createEntity('You', EntityType.ACTOR);
  (engine as any).player = player;
  
  // Register capabilities if requested
  if (includeCapabilities) {
    registerStandardCapabilities(world);
  }
  
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
  
  // Mark as initialized
  (engine as any).initialized = true;
  
  return { engine, world, player };
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
      version: '1.0.0',
      language: 'en-us'
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