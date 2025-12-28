/**
 * Story Loader
 *
 * Dynamically loads and initializes a story for testing.
 */

import * as path from 'path';
import { GameEngine, TurnResult, SequencedEvent } from '@sharpee/engine';
import { WorldModel, EntityType } from '@sharpee/world-model';
import { Parser } from '@sharpee/parser-en-us';
import { PerceptionService } from '@sharpee/stdlib';
// @ts-ignore
import { LanguageProvider } from '@sharpee/lang-en-us';
// @ts-ignore
import { TextService } from '@sharpee/text-services';

/**
 * Interface for a story module
 */
interface StoryModule {
  story?: any;
  default?: any;
}

/**
 * A testable game instance
 */
export interface TestableGame {
  engine: GameEngine;
  world: WorldModel;
  lastOutput: string;
  lastEvents: SequencedEvent[];
  lastTurnResult: TurnResult | null;
  executeCommand(input: string): Promise<string>;
}

/**
 * Load a story from a path and create a testable game instance
 */
export async function loadStory(storyPath: string): Promise<TestableGame> {
  // Resolve the story path
  const resolvedPath = path.isAbsolute(storyPath)
    ? storyPath
    : path.resolve(process.cwd(), storyPath);

  // Try to load the story module
  let storyModule: StoryModule;
  try {
    // Try loading the compiled dist version first
    const distPath = path.join(resolvedPath, 'dist', 'index.js');
    storyModule = require(distPath);
  } catch (e) {
    try {
      // Fall back to src (for ts-node environments)
      const srcPath = path.join(resolvedPath, 'src', 'index.ts');
      storyModule = require(srcPath);
    } catch (e2) {
      throw new Error(`Could not load story from ${storyPath}: ${e}`);
    }
  }

  const story = storyModule.story || storyModule.default;
  if (!story) {
    throw new Error(`Story module at ${storyPath} does not export 'story' or 'default'`);
  }

  // Create the game instance
  return createTestableGame(story);
}

/**
 * Create a testable game from a story instance
 */
export function createTestableGame(story: any): TestableGame {
  // Create world and player
  const world = new WorldModel();
  const player = world.createEntity('player', EntityType.ACTOR);
  world.setPlayer(player.id);

  // Create parser, language, and text service
  const language = new LanguageProvider();
  const parser = new Parser(language);
  const textService = new TextService();
  textService.setLanguageProvider(language);

  // Extend parser and language with story-specific vocabulary
  if (story.extendParser) {
    story.extendParser(parser);
  }
  if (story.extendLanguage) {
    story.extendLanguage(language);
  }

  // Create perception service
  const perceptionService = new PerceptionService();

  // Create engine
  const engine = new GameEngine({
    world,
    player,
    parser,
    language,
    textService,
    perceptionService
  });

  // Set the story and start
  engine.setStory(story);
  engine.start();

  // Capture text output and events
  let lastOutput = '';
  let outputBuffer: string[] = [];
  let lastEvents: SequencedEvent[] = [];
  let lastTurnResult: TurnResult | null = null;

  engine.on('text:output', (text: string) => {
    outputBuffer.push(text);
  });

  // Create the testable game interface
  const testableGame: TestableGame = {
    engine,
    world,
    lastOutput: '',
    lastEvents: [],
    lastTurnResult: null,

    async executeCommand(input: string): Promise<string> {
      outputBuffer = [];
      lastEvents = [];
      lastTurnResult = null;

      try {
        const result = await engine.executeTurn(input);
        if (result) {
          lastTurnResult = result;
          lastEvents = result.events || [];
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        outputBuffer.push(`Error: ${errorMessage}`);
      }

      lastOutput = outputBuffer.join('\n');
      testableGame.lastOutput = lastOutput;
      testableGame.lastEvents = lastEvents;
      testableGame.lastTurnResult = lastTurnResult;
      return lastOutput;
    }
  };

  return testableGame;
}

/**
 * Find all transcript files in a directory
 */
export function findTranscripts(dir: string, pattern: string = '*.transcript'): string[] {
  const glob = require('glob');
  const resolvedDir = path.isAbsolute(dir) ? dir : path.resolve(process.cwd(), dir);

  const files = glob.sync(path.join(resolvedDir, '**', pattern));
  return files;
}
