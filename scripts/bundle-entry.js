/**
 * Bundle entry point - re-exports everything from all Sharpee packages.
 * Also provides CLI functionality when run directly with --test or --play.
 *
 * Usage as library:
 *   const sharpee = require('./dist/cli/sharpee.js');
 *
 * Usage as CLI:
 *   node dist/cli/sharpee.js --test <transcript-file>
 *   node dist/cli/sharpee.js --play
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
  // Testing extension (ADR-109/110)
  ...require('../packages/extensions/testing/dist/index.js')
};

/**
 * Create an editor session for the map editor.
 * Initializes a story's world without starting the game engine.
 *
 * @param {string} storyId - The story ID (e.g., 'dungeo')
 * @param {string} [projectPath] - Optional project root path (defaults to cwd)
 * @returns {{ world: WorldModel, story: any }} The initialized world and story
 */
exports.createEditorSession = function createEditorSession(storyId, projectPath) {
  const path = require('path');
  const fs = require('fs');

  // Find story in stories/ folder
  const basePath = projectPath || process.cwd();
  const storyPath = path.resolve(basePath, 'stories', storyId);
  const distPath = path.join(storyPath, 'dist', 'index.js');

  if (!fs.existsSync(distPath)) {
    throw new Error(`Story not found: ${storyId}. Expected at ${distPath}`);
  }

  // Clear require cache to get fresh story
  delete require.cache[require.resolve(distPath)];

  const storyModule = require(distPath);
  const story = storyModule.story || storyModule.default;

  if (!story) {
    throw new Error(`Story module '${storyId}' does not export 'story' or 'default'`);
  }

  // Create world and initialize
  const { WorldModel, EntityType } = exports;
  const world = new WorldModel();

  // Create player entity (required for world initialization)
  const player = world.createEntity('player', EntityType.ACTOR);
  world.setPlayer(player.id);

  // Initialize the story's world
  if (story.initializeWorld) {
    story.initializeWorld(world);
  }

  return { world, story };
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
      exec: null,
      debug: false,
      restore: null,
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
      } else if (arg === '--debug') {
        options.debug = true;
      } else if (arg === '--exec') {
        i++;
        if (i < args.length) {
          options.exec = args[i];
        }
      } else if (arg.startsWith('--restore=')) {
        options.restore = arg.split('=')[1];
      } else if (arg === '--restore') {
        i++;
        if (i < args.length) {
          options.restore = args[i];
        }
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
  node dist/cli/sharpee.js --test [transcript-files...] [options]
  node dist/cli/sharpee.js --play [options]
  node dist/cli/sharpee.js --exec "cmd1/cmd2/cmd3" [--debug] [--restore <name>]

Options:
  --test, -t           Run transcript tests
  --play, -p           Interactive play mode (REPL)
  --exec <cmds>        Run commands non-interactively (separate with /)
  --debug              Show parsed/validated/events JSON (use with --exec)
  --restore <name>     Restore from save file
  --chain, -c          Chain transcripts (don't reset game state between them)
  --verbose, -v        Show detailed output for each command
  --stop-on-failure, -s Stop on first failure
  --story <path>       Story path (default: stories/dungeo)
  --help, -h           Show this help message

Examples:
  node dist/cli/sharpee.js --exec "look" --debug
  node dist/cli/sharpee.js --exec "wait/wait/tie wire to hook" --restore wt-13a --debug
  node dist/cli/sharpee.js --test stories/dungeo/tests/transcripts/save-restore-basic.transcript
  node dist/cli/sharpee.js --test --chain stories/dungeo/walkthroughs/wt-*.transcript
  node dist/cli/sharpee.js --play
  node dist/cli/sharpee.js --restore wt-11
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

    engine.on('text:output', (blocks) => {
      outputBuffer.push(exports.renderToString(blocks));
    });

    let eventBuffer = [];
    engine.on('event', (event) => {
      eventBuffer.push(event);
    });

    let lastTurnResult = null;

    const testableGame = {
      engine,
      world,
      testingExtension,
      lastOutput: '',
      lastEvents: [],
      lastTurnResult: null,
      // Proxy for runner save/restore plugin state
      getPluginRegistry() { return engine.getPluginRegistry(); },

      async executeCommand(input) {
        outputBuffer = [];
        eventBuffer = [];
        lastTurnResult = null;

        try {
          const result = await engine.executeTurn(input);
          lastEvents = eventBuffer;
          lastTurnResult = result;
        } catch (error) {
          outputBuffer.push(`Error: ${error.message || error}`);
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

  async function runInteractiveMode(game) {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    let debugMode = false;
    let traceMode = false;

    console.log('\n--- Interactive Mode ---');
    console.log('Type commands to play. Special commands:');
    console.log('  /quit, /q    - Exit the game');
    console.log('  /debug       - Toggle debug mode (show parsed/validated/events JSON)');
    console.log('  /trace       - Toggle parser trace mode (PARSER_DEBUG env)');
    console.log('  /events      - Show events from last command');
    console.log('  /parsed      - Show parsed command from last turn');
    console.log('  /validated   - Show validated command from last turn');
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

        if (trimmed === '/debug') {
          debugMode = !debugMode;
          console.log(`Debug mode: ${debugMode ? 'ON' : 'OFF'}`);
          prompt();
          return;
        }

        if (trimmed === '/trace') {
          traceMode = !traceMode;
          process.env.PARSER_DEBUG = traceMode ? 'true' : '';
          console.log(`Parser trace: ${traceMode ? 'ON' : 'OFF'}`);
          prompt();
          return;
        }

        if (trimmed === '/events') {
          if (game.lastEvents && game.lastEvents.length > 0) {
            console.log('\nEvents from last command:');
            for (const event of game.lastEvents) {
              console.log(`  ${event.type}`);
              if (event.data && Object.keys(event.data).length > 0) {
                console.log(`    ${JSON.stringify(event.data, null, 2).split('\n').join('\n    ')}`);
              }
            }
          } else {
            console.log('(No events from last command)');
          }
          prompt();
          return;
        }

        if (trimmed === '/parsed') {
          if (game.lastTurnResult && game.lastTurnResult.parsedCommand) {
            console.log('\nParsed command:');
            console.log(JSON.stringify(game.lastTurnResult.parsedCommand, null, 2));
          } else {
            console.log('(No parsed command from last turn)');
          }
          prompt();
          return;
        }

        if (trimmed === '/validated') {
          if (game.lastTurnResult && game.lastTurnResult.validatedCommand) {
            console.log('\nValidated command:');
            console.log(JSON.stringify(game.lastTurnResult.validatedCommand, null, 2));
          } else {
            console.log('(No validated command from last turn)');
          }
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

          if (debugMode) {
            if (game.lastTurnResult) {
              if (game.lastTurnResult.parsedCommand) {
                console.log('\n[Parsed]');
                console.log(JSON.stringify(game.lastTurnResult.parsedCommand, null, 2));
              }
              if (game.lastTurnResult.validatedCommand) {
                console.log('\n[Validated]');
                console.log(JSON.stringify(game.lastTurnResult.validatedCommand, null, 2));
              }
            }
            if (game.lastEvents && game.lastEvents.length > 0) {
              console.log('\n[Events]');
              for (const event of game.lastEvents) {
                const data = event.data && Object.keys(event.data).length > 0
                  ? ` ${JSON.stringify(event.data)}`
                  : '';
                console.log(`  ${event.type}${data}`);
              }
            }
          }
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

    if (options.exec) {
      const game = loadStoryAndCreateGame(options.storyPath);

      if (options.restore) {
        const savesDir = path.join(options.storyPath, 'saves');
        const savePath = path.join(savesDir, `${options.restore}.json`);
        if (!fs.existsSync(savePath)) {
          console.error(`Save file not found: ${savePath}`);
          process.exit(1);
        }
        const worldState = fs.readFileSync(savePath, 'utf-8');
        game.world.loadJSON(worldState);
      }

      // Enable parser trace when --debug
      if (options.debug) {
        process.env.PARSER_DEBUG = 'true';
      }

      const commands = options.exec.split('/').map(c => c.trim()).filter(c => c);
      for (const command of commands) {
        console.log(`> ${command}`);
        try {
          const output = await game.executeCommand(command);
          console.log(output);

          if (options.debug) {
            if (game.lastTurnResult) {
              if (game.lastTurnResult.parsedCommand) {
                console.log('\n[Parsed]');
                console.log(JSON.stringify(game.lastTurnResult.parsedCommand, null, 2));
              }
              if (game.lastTurnResult.validatedCommand) {
                console.log('\n[Validated]');
                console.log(JSON.stringify(game.lastTurnResult.validatedCommand, null, 2));
              }
            }
            if (game.lastEvents && game.lastEvents.length > 0) {
              console.log('\n[Events]');
              for (const event of game.lastEvents) {
                const data = event.data && Object.keys(event.data).length > 0
                  ? ` ${JSON.stringify(event.data)}`
                  : '';
                console.log(`  ${event.type}${data}`);
              }
            }
          }
        } catch (error) {
          console.error(`Error: ${error.message || error}`);
        }
        console.log('');
      }
      process.exit(0);
    }

    if (options.play) {
      console.log(`Loading story from: ${options.storyPath}`);
      const game = loadStoryAndCreateGame(options.storyPath);

      if (options.restore) {
        const savesDir = path.join(options.storyPath, 'saves');
        const savePath = path.join(savesDir, `${options.restore}.json`);
        if (!fs.existsSync(savePath)) {
          console.error(`Save file not found: ${savePath}`);
          if (fs.existsSync(savesDir)) {
            const files = fs.readdirSync(savesDir).filter(f => f.endsWith('.json'));
            if (files.length > 0) {
              console.error(`Available saves:`);
              for (const f of files) {
                console.error(`  ${f.replace('.json', '')}`);
              }
            }
          } else {
            console.error(`No saves directory. Run --chain walkthroughs first to generate saves.`);
          }
          process.exit(1);
        }

        console.log(`Restoring from: ${savePath}`);
        const worldState = fs.readFileSync(savePath, 'utf-8');
        game.world.loadJSON(worldState);
        console.log(`Restored: ${options.restore}`);
      }

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
