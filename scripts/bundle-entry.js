/**
 * Bundle entry point - re-exports everything from all Sharpee packages.
 * Also provides CLI functionality when run directly with --test or --play.
 *
 * Usage as library:
 *   const sharpee = require('./dist/sharpee.js');
 *
 * Usage as CLI:
 *   node dist/sharpee.js --test <transcript-file>
 *   node dist/sharpee.js --play
 *
 * NOTE: Uses direct paths to dist folders to avoid esbuild resolution issues
 * with pnpm symlinks and directory imports (e.g., ./actions, ./grammar).
 */

// Core types and utilities - use literal paths for esbuild static analysis
const exports = {
  ...require('../packages/core/dist/index.js'),
  ...require('../packages/if-domain/dist/index.js'),
  ...require('../packages/world-model/dist/index.js'),
  ...require('../packages/stdlib/dist/index.js'),
  ...require('../packages/engine/dist/index.js'),
  ...require('../packages/parser-en-us/dist/index.js'),
  ...require('../packages/lang-en-us/dist/index.js'),
  ...require('../packages/event-processor/dist/index.js'),
  ...require('../packages/text-blocks/dist/index.js'),
  ...require('../packages/text-service/dist/index.js'),
  ...require('../packages/if-services/dist/index.js'),
  // TODO: Testing extension package not yet created
  // ...require('../packages/extensions/testing/dist/index.js')
};

module.exports = exports;

// CLI functionality - only runs when executed directly (not when required as library)
if (require.main === module) {
  // Import CLI components
  const path = require('path');
  const fs = require('fs');
  const readline = require('readline');
  const transcriptTester = require('../packages/transcript-tester/dist/index.js');

  const { GameEngine, WorldModel, EntityType, Parser, LanguageProvider, PerceptionService, TestingExtension } = exports;

  // Parse CLI arguments
  const args = process.argv.slice(2);

  function parseArgs(args) {
    const options = {
      transcriptPaths: [],
      verbose: false,
      stopOnFailure: false,
      chain: false,
      play: false,
      test: false,
      storyPath: 'stories/dungeo',
      help: false
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
      } else if (arg === '--test' || arg === '-t') {
        options.test = true;
      } else if (arg === '--story') {
        i++;
        if (i < args.length) {
          options.storyPath = args[i];
        }
      } else if (arg === '--help' || arg === '-h') {
        options.help = true;
      } else if (!arg.startsWith('-')) {
        options.transcriptPaths.push(arg);
      }

      i++;
    }

    return options;
  }

  function printHelp() {
    console.log(`
Sharpee CLI - Fast transcript testing and interactive play

Usage:
  node dist/sharpee.js --test [transcript-files...] [options]
  node dist/sharpee.js --play [options]

Options:
  --test, -t           Run transcript tests
  --play, -p           Interactive play mode (REPL)
  --chain, -c          Chain transcripts (don't reset game state between them)
  --verbose, -v        Show detailed output for each command
  --stop-on-failure, -s Stop on first failure
  --story <path>       Story path (default: stories/dungeo)
  --help, -h           Show this help message

Examples:
  node dist/sharpee.js --test stories/dungeo/tests/transcripts/save-restore-basic.transcript
  node dist/sharpee.js --test --chain stories/dungeo/walkthroughs/wt-*.transcript
  node dist/sharpee.js --play
`);
  }

  function loadStoryAndCreateGame(storyPath) {
    const resolvedPath = path.isAbsolute(storyPath)
      ? storyPath
      : path.resolve(process.cwd(), storyPath);

    const distPath = path.join(resolvedPath, 'dist', 'index.js');
    const storyModule = require(distPath);
    const story = storyModule.story || storyModule.default;

    if (!story) {
      throw new Error(`Story module at ${storyPath} does not export 'story' or 'default'`);
    }

    const world = new WorldModel();
    const player = world.createEntity('player', EntityType.ACTOR);
    world.setPlayer(player.id);

    const language = new LanguageProvider();
    const parser = new Parser(language);

    if (story.extendParser) {
      story.extendParser(parser);
    }
    if (story.extendLanguage) {
      story.extendLanguage(language);
    }

    const perceptionService = new PerceptionService();

    const engine = new GameEngine({
      world,
      player,
      parser,
      language,
      perceptionService,
    });

    engine.setStory(story);
    engine.start();

    // Create testing extension for $commands in transcripts
    const testingExtension = TestingExtension ? new TestingExtension() : null;

    let lastOutput = '';
    let outputBuffer = [];
    let lastEvents = [];

    engine.on('text:output', (text) => {
      outputBuffer.push(text);
    });

    let eventBuffer = [];
    engine.on('event', (event) => {
      eventBuffer.push(event);
    });

    const testableGame = {
      engine,
      world,
      testingExtension,
      lastOutput: '',
      lastEvents: [],

      async executeCommand(input) {
        outputBuffer = [];
        eventBuffer = [];

        try {
          await engine.executeTurn(input);
          lastEvents = eventBuffer;
        } catch (error) {
          outputBuffer.push(`Error: ${error.message || error}`);
        }

        lastOutput = outputBuffer.join('\n');
        testableGame.lastOutput = lastOutput;
        testableGame.lastEvents = lastEvents;
        return lastOutput;
      },
    };

    return testableGame;
  }

  async function runInteractiveMode(game) {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    console.log('\n--- Interactive Mode ---');
    console.log('Type commands to play. Special commands:');
    console.log('  /quit, /q    - Exit the game');
    console.log('  /look, /l    - Shortcut for "look"');
    console.log('  /inv, /i     - Shortcut for "inventory"');
    console.log('');

    const initialOutput = await game.executeCommand('look');
    console.log(initialOutput);

    const prompt = () => {
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

        let command = trimmed;
        if (trimmed === '/look' || trimmed === '/l') {
          command = 'look';
        } else if (trimmed === '/inv' || trimmed === '/i') {
          command = 'inventory';
        }

        try {
          const output = await game.executeCommand(command);
          console.log(output);
        } catch (error) {
          console.error(`Error: ${error.message || error}`);
        }

        prompt();
      });
    };

    prompt();
  }

  async function main() {
    const options = parseArgs(args);

    if (options.help || (args.length === 0)) {
      printHelp();
      process.exit(0);
    }

    if (options.play) {
      console.log(`Loading story from: ${options.storyPath}`);
      const game = loadStoryAndCreateGame(options.storyPath);
      await runInteractiveMode(game);
      return;
    }

    if (options.test || options.transcriptPaths.length > 0) {
      if (options.transcriptPaths.length === 0) {
        console.error('Error: No transcript files specified');
        printHelp();
        process.exit(1);
      }

      console.log(`Loading story from: ${options.storyPath}`);
      console.log(`Found ${options.transcriptPaths.length} transcript(s) to run`);
      if (options.chain) {
        console.log(`Chain mode: Game state will persist between transcripts`);
      }

      let game = loadStoryAndCreateGame(options.storyPath);
      const results = [];

      for (const transcriptPath of options.transcriptPaths) {
        const transcript = transcriptTester.parseTranscriptFile(transcriptPath);

        const errors = transcriptTester.validateTranscript(transcript);
        if (errors.length > 0) {
          console.error(`\nErrors in ${transcriptPath}:`);
          for (const err of errors) {
            console.error(`  - ${err}`);
          }
          continue;
        }

        if (!options.chain) {
          game = loadStoryAndCreateGame(options.storyPath);
        }

        const savesDirectory = path.join(options.storyPath, 'saves');
        const result = await transcriptTester.runTranscript(transcript, game, {
          verbose: options.verbose,
          stopOnFailure: options.stopOnFailure,
          savesDirectory,
          testingExtension: game.testingExtension
        });

        results.push(result);
        transcriptTester.reportTranscript(result, { verbose: options.verbose });

        if (options.stopOnFailure && result.failed > 0) {
          break;
        }
      }

      const runResult = {
        transcripts: results,
        totalPassed: results.reduce((sum, r) => sum + r.passed, 0),
        totalFailed: results.reduce((sum, r) => sum + r.failed, 0),
        totalExpectedFailures: results.reduce((sum, r) => sum + r.expectedFailures, 0),
        totalSkipped: results.reduce((sum, r) => sum + r.skipped, 0),
        totalDuration: results.reduce((sum, r) => sum + r.duration, 0)
      };

      if (results.length > 1) {
        transcriptTester.reportTestRun(runResult, { verbose: options.verbose });
      }

      process.exit(transcriptTester.getExitCode(runResult));
    }
  }

  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}
