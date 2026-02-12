#!/usr/bin/env node

/**
 * Fast Transcript Tester CLI
 *
 * Uses pre-bundled platform (dist/cli/sharpee.js) and story for instant loading.
 * Supports --chain flag for walkthrough testing.
 *
 * Usage:
 *   node packages/transcript-tester/dist/fast-cli.js [transcript-files...] [options]
 *   node packages/transcript-tester/dist/fast-cli.js --chain wt-*.transcript
 */

import * as path from 'path';
import * as fs from 'fs';
import * as readline from 'readline';
import { parseTranscriptFile, validateTranscript } from './parser';
import { runTranscript } from './runner';
import {
  reportTranscript,
  reportTestRun,
  getExitCode,
} from './reporter';
import { TranscriptResult, TestRunResult } from './types';

// Load the pre-bundled platform
// __dirname is packages/transcript-tester/dist, so go up 3 levels to repo root
const bundlePath = path.resolve(__dirname, '..', '..', '..', 'dist', 'sharpee.js');
const platform = require(bundlePath);

// Extract what we need from the bundle
const { GameEngine, WorldModel, EntityType, Parser, LanguageProvider, PerceptionService, TestingExtension } = platform;

interface CliOptions {
  transcriptPaths: string[];
  verbose: boolean;
  stopOnFailure: boolean;
  chain: boolean;
  play: boolean;
  restore: string | null;
  storyPath: string;
}

interface TestableGame {
  engine: any;
  world: any;
  testingExtension: any;  // TestingExtension instance
  lastOutput: string;
  lastEvents: any[];
  lastTurnResult: any;
  executeCommand(input: string): Promise<string>;
}

/**
 * Parse command line arguments
 */
function parseArgs(args: string[]): CliOptions {
  const options: CliOptions = {
    transcriptPaths: [],
    verbose: false,
    stopOnFailure: false,
    chain: false,
    play: false,
    restore: null,
    storyPath: 'stories/dungeo'
  };

  let i = 0;
  while (i < args.length) {
    const arg = args[i];

    if (arg === '--verbose' || arg === '-v') {
      options.verbose = true;
    } else if (arg === '--stop-on-failure' || arg === '-s') {
      options.stopOnFailure = true;
    } else if (arg === '--chain' || arg === '-c') {
      options.chain = true;
    } else if (arg === '--play' || arg === '-p') {
      options.play = true;
    } else if (arg.startsWith('--restore=')) {
      options.restore = arg.split('=')[1];
      options.play = true;  // --restore implies --play
    } else if (arg === '--restore') {
      i++;
      if (i < args.length) {
        options.restore = args[i];
        options.play = true;
      }
    } else if (arg === '--story') {
      i++;
      if (i < args.length) {
        options.storyPath = args[i];
      }
    } else if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    } else if (!arg.startsWith('-')) {
      options.transcriptPaths.push(arg);
    }

    i++;
  }

  return options;
}

/**
 * Print help message
 */
function printHelp(): void {
  console.log(`
Fast Transcript Tester - Uses pre-bundled platform for instant loading

Usage:
  fast-transcript-test [transcript-files...] [options]

Arguments:
  transcript-files   One or more .transcript files to run

Options:
  -c, --chain            Chain transcripts (don't reset game state between them)
  -v, --verbose          Show detailed output for each command
  -s, --stop-on-failure  Stop on first failure
  -p, --play             Interactive play mode (REPL)
  --restore <name>       Restore from save file and enter play mode
  --story <path>         Story path (default: stories/dungeo)
  -h, --help             Show this help message

Examples:
  fast-transcript-test stories/dungeo/walkthroughs/wt-01-get-torch-early.transcript
  fast-transcript-test --chain stories/dungeo/walkthroughs/wt-*.transcript
  fast-transcript-test --play
  fast-transcript-test --restore wt-11
`);
}

/**
 * Load the story and create a testable game
 */
function loadStoryAndCreateGame(storyPath: string): TestableGame {
  // Resolve story path
  const resolvedPath = path.isAbsolute(storyPath)
    ? storyPath
    : path.resolve(process.cwd(), storyPath);

  // Load the story module
  const distPath = path.join(resolvedPath, 'dist', 'index.js');
  const storyModule = require(distPath);
  const story = storyModule.story || storyModule.default;

  if (!story) {
    throw new Error(`Story module at ${storyPath} does not export 'story' or 'default'`);
  }

  // Create world and player
  const world = new WorldModel();
  const player = world.createEntity('player', EntityType.ACTOR);
  world.setPlayer(player.id);

  // Create parser and language
  const language = new LanguageProvider();
  const parser = new Parser(language);

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
    perceptionService,
  });

  // Set the story and start
  engine.setStory(story);
  engine.start();

  // Create testing extension
  const testingExtension = TestingExtension ? new TestingExtension() : null;

  // Capture text output and events
  let lastOutput = '';
  let outputBuffer: string[] = [];
  let lastEvents: any[] = [];
  let lastTurnResult: any = null;

  engine.on('text:output', (text: string) => {
    outputBuffer.push(text);
  });

  let eventBuffer: any[] = [];
  engine.on('event', (event: any) => {
    eventBuffer.push(event);
  });

  const testableGame: TestableGame = {
    engine,
    world,
    testingExtension,
    lastOutput: '',
    lastEvents: [],
    lastTurnResult: null,

    async executeCommand(input: string): Promise<string> {
      outputBuffer = [];
      eventBuffer = [];
      lastEvents = [];
      lastTurnResult = null;

      try {
        const result = await engine.executeTurn(input);
        if (result) {
          lastTurnResult = result;
          lastEvents = eventBuffer;
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
    },
  };

  return testableGame;
}

/**
 * Run interactive play mode (REPL)
 */
async function runInteractiveMode(game: TestableGame): Promise<void> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  let debugMode = false;

  console.log('\n--- Interactive Mode (Fast) ---');
  console.log('Type commands to play. Special commands:');
  console.log('  /quit, /q    - Exit the game');
  console.log('  /debug       - Toggle debug mode (show events)');
  console.log('  /look, /l    - Shortcut for "look"');
  console.log('  /inv, /i     - Shortcut for "inventory"');
  console.log('');

  const initialOutput = await game.executeCommand('look');
  console.log(initialOutput);

  const prompt = (): void => {
    rl.question('\n> ', async (input) => {
      const trimmed = input.trim();

      if (!trimmed) {
        prompt();
        return;
      }

      if (trimmed === '/quit' || trimmed === '/q') {
        console.log('Goodbye!');
        rl.close();
        process.exit(0);
        return;
      }

      if (trimmed === '/debug') {
        debugMode = !debugMode;
        console.log(`Debug mode: ${debugMode ? 'ON' : 'OFF'}`);
        prompt();
        return;
      }

      let command = trimmed;
      if (trimmed === '/look' || trimmed === '/l') {
        command = 'look';
      } else if (trimmed === '/inv' || trimmed === '/i') {
        command = 'inventory';
      }

      try {
        const output = await game.executeCommand(command);
        console.log(output);

        if (debugMode && game.lastEvents && game.lastEvents.length > 0) {
          console.log('\n[Events]');
          for (const event of game.lastEvents) {
            console.log(`  ${event.type}`);
          }
        }
      } catch (error) {
        console.error(`Error: ${error instanceof Error ? error.message : error}`);
      }

      prompt();
    });
  };

  prompt();
}

/**
 * Main entry point
 */
async function main(): Promise<void> {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    printHelp();
    process.exit(1);
  }

  const options = parseArgs(args);

  // Interactive play mode
  if (options.play) {
    console.log(`Loading story from: ${options.storyPath} (using bundle)`);
    const game = loadStoryAndCreateGame(options.storyPath);

    // Restore from save file if requested
    if (options.restore) {
      const savesDir = path.join(options.storyPath, 'saves');
      const savePath = path.join(savesDir, `${options.restore}.json`);
      if (!fs.existsSync(savePath)) {
        console.error(`Save file not found: ${savePath}`);
        console.error(`Available saves:`);
        if (fs.existsSync(savesDir)) {
          const files = fs.readdirSync(savesDir).filter(f => f.endsWith('.json'));
          for (const f of files) {
            console.error(`  ${f.replace('.json', '')}`);
          }
        } else {
          console.error(`  (no saves directory — run --chain walkthroughs first)`);
        }
        process.exit(1);
      }

      console.log(`Restoring from: ${savePath}`);
      const worldState = fs.readFileSync(savePath, 'utf-8');
      (game.world as any).loadJSON(worldState);
      console.log(`Restored save: ${options.restore}`);
    }

    await runInteractiveMode(game);
    return;
  }

  if (options.transcriptPaths.length === 0) {
    console.error('Error: No transcript files specified');
    printHelp();
    process.exit(1);
  }

  console.log(`Loading story from: ${options.storyPath} (using bundle)`);
  console.log(`Found ${options.transcriptPaths.length} transcript(s) to run`);
  if (options.chain) {
    console.log(`Chain mode: Game state will persist between transcripts`);
  }

  // Load the game once (will reload for each transcript unless chaining)
  let game = loadStoryAndCreateGame(options.storyPath);

  // Run all transcripts
  const results: TranscriptResult[] = [];

  for (const transcriptPath of options.transcriptPaths) {
    // Parse the transcript
    const transcript = parseTranscriptFile(transcriptPath);

    // Validate
    const errors = validateTranscript(transcript);
    if (errors.length > 0) {
      console.error(`\nErrors in ${transcriptPath}:`);
      for (const err of errors) {
        console.error(`  - ${err}`);
      }
      continue;
    }

    // Reload story for each transcript to reset state (unless chaining)
    if (!options.chain) {
      game = loadStoryAndCreateGame(options.storyPath);
    }

    // Run the transcript with saves directory based on story path
    const savesDirectory = path.join(options.storyPath, 'saves');
    const result = await runTranscript(transcript, game, {
      verbose: options.verbose,
      stopOnFailure: options.stopOnFailure,
      savesDirectory,
      testingExtension: game.testingExtension
    });

    results.push(result);

    // Report individual transcript results
    reportTranscript(result, { verbose: options.verbose });

    // Stop if requested and there was a failure
    if (options.stopOnFailure && result.failed > 0) {
      break;
    }
  }

  // Aggregate results
  const runResult: TestRunResult = {
    transcripts: results,
    totalPassed: results.reduce((sum, r) => sum + r.passed, 0),
    totalFailed: results.reduce((sum, r) => sum + r.failed, 0),
    totalExpectedFailures: results.reduce((sum, r) => sum + r.expectedFailures, 0),
    totalSkipped: results.reduce((sum, r) => sum + r.skipped, 0),
    totalDuration: results.reduce((sum, r) => sum + r.duration, 0)
  };

  // Final report if multiple transcripts
  if (results.length > 1) {
    reportTestRun(runResult, { verbose: options.verbose });
  }

  // Exit with appropriate code
  process.exit(getExitCode(runResult));
}

// Run
main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
