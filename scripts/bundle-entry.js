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
  // ADR-174 Phase 2: text-service no longer spread into the bundle.
  // Wire-production helpers (renderToString, renderStatusLine) ship from
  // channel-service below. Block-production exports (TextService,
  // createTextService, ITextService) are dead — no first-party consumer
  // instantiates a text-service post-Phase-1.
  ...require('../packages/channel-service/dist/index.js'),
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

  // Find story in stories/ or tutorials/ folder
  const basePath = projectPath || process.cwd();
  let storyPath = path.resolve(basePath, 'stories', storyId);
  let distPath = path.join(storyPath, 'dist', 'index.js');

  if (!fs.existsSync(distPath)) {
    storyPath = path.resolve(basePath, 'tutorials', storyId);
    distPath = path.join(storyPath, 'dist', 'index.js');
  }

  if (!fs.existsSync(distPath)) {
    throw new Error(`Story not found: ${storyId}. Expected in stories/ or tutorials/`);
  }

  // Clear require cache to get fresh story
  delete require.cache[require.resolve(distPath)];

  const storyModule = require(distPath);
  // ADR-248 factory-only contract
  if (typeof storyModule.createStory !== 'function') {
    throw new Error(`Story module '${storyId}' does not export createStory() (ADR-248 factory contract)`);
  }
  const story = storyModule.createStory();

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
  const bootstrap = require('@sharpee/bootstrap');
  // Chord (ADR-210 Phase A): the CLI is the host layer for `.story` stories —
  // it compiles the source and owns hatch-module resolution. These live here,
  // not in bootstrap, because no platform package may depend on @sharpee/chord
  // or @sharpee/story-loader (ADR-210 direction rule).
  const chord = require('../packages/chord/dist/index.js');
  const storyLoader = require('../packages/story-loader/dist/index.js');

  const { GameEngine, WorldModel, EntityType, Parser, LanguageProvider, PerceptionService, TestingExtension } = exports;

  // Parse CLI arguments
  const args = process.argv.slice(2);

  function parseArgs(args) {
    const options = {
      transcriptPaths: [],
      verbose: false,
      emitTraits: false,
      stopOnFailure: false,
      chain: false,
      play: false,
      test: false,
      introspect: false,
      exec: null,
      debug: false,
      restore: null,
      // No default story (removed 2026-07-19, David's ruling — the silent
      // dungeo fallback ran transcripts against the wrong story). --story
      // wins; otherwise the story is inferred from the transcript paths'
      // stories/<name>/ prefix (resolveStoryPath); play/exec require --story.
      storyPath: null,
      // ADR-293 D1/D14 seed injection: --seed pins the master seed, --vary
      // mints one fresh seed to run a pinned suite off-baseline. Mutually
      // exclusive — validated in main().
      seed: null,
      vary: false,
      // ADR-294 D1: create/overwrite golden recordings instead of diffing.
      bless: false,
      // ADR-294 D14: watch mode — targeted reruns with inline bless.
      watch: false,
      help: false
    };

    let i = 0;
    while (i < args.length) {
      const arg = args[i];

      if (arg === '--verbose' || arg === '-v') {
        options.verbose = true;
      } else if (arg === '--emit-traits') {
        options.emitTraits = true;
        options.verbose = true;
      } else if (arg === '--stop-on-failure' || arg === '-s') {
        options.stopOnFailure = true;
      } else if (arg === '--chain' || arg === '-c') {
        options.chain = true;
      } else if (arg === '--play' || arg === '-p') {
        options.play = true;
      } else if (arg === '--world-json') {
        options.worldJson = true;
      } else if (arg === '--introspect') {
        options.introspect = true;
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
      } else if (arg.startsWith('--seed=')) {
        options.seed = arg.split('=')[1];
      } else if (arg === '--seed') {
        i++;
        if (i < args.length) {
          options.seed = args[i];
        }
      } else if (arg === '--vary') {
        options.vary = true;
      } else if (arg === '--bless') {
        options.bless = true;
      } else if (arg === '--watch') {
        options.watch = true;
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
  --world-json         Dump initialized world model as JSON to stdout and exit
  --introspect         Emit the IDE project manifest (ADR-184) as JSON and exit
  --debug              Show parsed/validated/events JSON (use with --exec)
  --restore <name>     Restore from save file
  --chain, -c          Chain transcripts (don't reset game state between them)
  --verbose, -v        Show detailed output for each command
  --emit-traits        Show entity traits for objects referenced in events (implies --verbose)
  --stop-on-failure, -s Stop on first failure
  --story <path>       Story directory, or a Chord .story file (default: inferred
                       from the transcript paths' stories/<name>/ prefix; required
                       for --play/--exec)
  --seed <N>           Pin the session's master seed (ADR-293). Wins over a
                       transcript's seed: header field.
  --vary               Run a seed-pinned suite off its pin with one fresh
                       seed (reported). Mutually exclusive with --seed.
  --bless              Create/overwrite golden recordings (ADR-294) — run the
                       transcripts and record their output as .golden siblings
  --watch              Watch mode (ADR-294): rerun affected transcripts on
                       change; golden failures offer bless? [y/n/all] at a TTY
                       (an unattended watch never blesses)
  --help, -h           Show this help message

Examples:
  node dist/cli/sharpee.js --exec "look" --story stories/dungeo --debug
  node dist/cli/sharpee.js --exec "wait/wait/tie wire to hook" --story stories/dungeo --restore wt-13a --debug
  node dist/cli/sharpee.js --test stories/dungeo/tests/transcripts/save-restore-basic.transcript
  node dist/cli/sharpee.js --test --chain stories/dungeo/walkthroughs/wt-*.transcript
  node dist/cli/sharpee.js --play --story stories/fernhill/fernhill.story
  node dist/cli/sharpee.js --restore wt-11 --story stories/dungeo
`);
  }

  // A --story path is either a story directory (compiled module story) or a
  // Chord `.story` file. Saves live beside the story in both cases.
  function storyDirOf(storyPath) {
    return storyPath.endsWith('.story') ? path.dirname(storyPath) : storyPath;
  }

  // Hatch policy (ADR-210 §5.6, ADR-259 D6 as amended 2026-07-23): `define
  // text X from "./extras.ts"` names authored TypeScript, and the CLI loads
  // THAT — transpiled through esbuild, exactly as the browser build does. The
  // old `<storyDir>/dist/<base>.js` (tsc output) lookup is retired: it forced
  // every hatched story to carry a package.json and tsconfig.json purely to
  // emit one file. One implementation, shared with the devkit, so the two
  // hosts cannot drift.
  const { requireHatchModule: resolveHatch } =
    require('../packages/devkit/dist/standalone/hatch-transpile.js');

  function requireHatchModule(storyDir, modulePath) {
    try {
      return resolveHatch(storyDir, modulePath);
    } catch (err) {
      // ADR-274 D2: the named environmental error already carries the file and
      // the remedy — pass it through so its name survives to the author.
      if (err && err.name === 'HatchTranspileError') throw err;
      throw new Error(`Hatch module "${modulePath}" for ${storyDir}: ${err.message}`);
    }
  }

  // Compile a `.story` file and interpret it via @sharpee/story-loader.
  // Load-time-gate diagnostics abort with `.story` line numbers (AC-3).
  function loadChordStory(storyFile) {
    const source = fs.readFileSync(storyFile, 'utf-8');
    const result = chord.compile(source);
    const errors = result.diagnostics.filter((d) => d.severity === 'error');
    if (!result.ok) {
      const lines = errors.map(
        (d) => `  ${storyFile}:${d.span.line}:${d.span.column} [${d.code}] ${d.message}`
      );
      throw new Error(`Chord load-time gate failed (${errors.length} error(s)):\n${lines.join('\n')}`);
    }
    const storyDir = path.dirname(storyFile);
    const hatchModules = {};
    for (const hatch of result.ir.hatches) {
      if (!(hatch.modulePath in hatchModules)) {
        hatchModules[hatch.modulePath] = requireHatchModule(storyDir, hatch.modulePath);
      }
    }
    return storyLoader.createStory(result.ir, { hatchModules });
  }

  // Single loader (ADR-180): resolve the story module (entry-aware) and assemble
  // the game via @sharpee/bootstrap. Replaces the former inline copy; the
  // channel-packet assembly now lives once in bootstrap.assembleGame.
  // A path ending in `.story` is compiled + interpreted instead of required
  // (`entry` applies only to module stories and is ignored for `.story` files).
  function loadStoryAndCreateGame(storyPath, entry, seed) {
    // ADR-293: forward the resolved master seed to EngineConfig.seed; a
    // restart reboot reuses it, so pinned runs survive in-transcript RESTART.
    const seedOption = seed !== undefined ? { seed } : {};
    if (storyPath.endsWith('.story')) {
      // ADR-248: freshStory recompiles from source, so an in-transcript
      // RESTART reboots onto a fully fresh ChordStory.
      return bootstrap.assembleGame(loadChordStory(storyPath), {
        freshStory: () => loadChordStory(storyPath),
        ...seedOption,
      });
    }
    const modulePath = bootstrap.resolveStoryModulePath(storyPath, entry);
    // ADR-248: bootstrap's one purge+re-require+createStory() implementation
    // serves both the initial load and every in-process restart reboot.
    const freshStory = bootstrap.moduleFreshStory(storyPath, modulePath);
    return bootstrap.assembleGame(freshStory(), { freshStory, ...seedOption });
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

  /**
   * Resolve the story to load when --story was not given.
   *
   * Inference (David's ruling, 2026-07-19): the transcript paths name the
   * story themselves — every path must share one stories/<name>/ (or
   * tutorials/<name>/) prefix; mixed prefixes are a hard error, never a
   * pick. Inside the inferred directory a lone top-level `.story` file is
   * preferred over a compiled dist (chord stories load from source; a stale
   * dist is the trap). No transcripts to read (play/exec/world-json/
   * introspect) → --story is required.
   */
  function resolveStoryPath(options) {
    if (options.storyPath) return options.storyPath;

    const roots = new Set();
    for (const p of options.transcriptPaths) {
      const match = /(^|\/)((?:stories|tutorials)\/[^/]+)(\/|$)/.exec(p.replace(/\\/g, '/'));
      if (match) roots.add(p.slice(0, p.replace(/\\/g, '/').indexOf(match[2])) + match[2]);
    }
    if (roots.size === 1) {
      const dir = [...roots][0];
      const storyFiles = fs.existsSync(dir)
        ? fs.readdirSync(dir).filter((f) => f.endsWith('.story'))
        : [];
      if (storyFiles.length === 1) return path.join(dir, storyFiles[0]);
      if (storyFiles.length > 1) {
        console.error(`Cannot infer the story: ${dir} contains ${storyFiles.length} .story files — pass --story <path>.`);
        process.exit(1);
      }
      return dir;
    }
    if (roots.size > 1) {
      console.error(`Cannot infer the story: transcripts span multiple story directories (${[...roots].join(', ')}) — pass --story <path> or run per story.`);
      process.exit(1);
    }
    console.error('No story specified. Pass --story <dir | .story file>, or give transcript paths under stories/<name>/ so it can be inferred.');
    process.exit(1);
  }

  async function main() {
    const options = parseArgs(args);

    if (options.help || (args.length === 0)) {
      printHelp();
      process.exit(0);
    }

    // ADR-293 D1: --seed and --vary are two explicit, contradictory
    // instructions — passing both is a hard error, not an ordered win.
    if (options.seed !== null && options.vary) {
      console.error('--seed and --vary are mutually exclusive (ADR-293 D1)');
      process.exit(2);
    }
    if (options.seed !== null) {
      const parsedSeed = Number(options.seed);
      if (!Number.isInteger(parsedSeed) || parsedSeed < 0) {
        console.error(`Invalid --seed value "${options.seed}" — must be a non-negative integer`);
        process.exit(2);
      }
      // Above MAX_SAFE_INTEGER the parsed value no longer equals the typed
      // digits, so the echoed seed would not reproduce the run (AC-12).
      if (parsedSeed > Number.MAX_SAFE_INTEGER) {
        console.error(`Invalid --seed value "${options.seed}" — out of range (max ${Number.MAX_SAFE_INTEGER})`);
        process.exit(2);
      }
      options.seed = parsedSeed;
    }

    // ADR-293 D1/D14 precedence: (--seed | --vary) → [SEED:] → the clock
    // (engine-internal, read once). --vary mints ONE fresh seed for the
    // whole invocation and must win over a transcript's pin — that is its
    // entire job: running a pinned suite off-baseline, reported.
    const varySeed = options.vary ? (Date.now() >>> 0) : null;
    function resolveSeed(transcriptSeed) {
      if (options.seed !== null) return { seed: options.seed, source: '--seed' };
      if (varySeed !== null) return { seed: varySeed, source: '--vary' };
      if (transcriptSeed !== undefined) return { seed: transcriptSeed, source: 'seed:' };
      return { seed: undefined, source: 'clock' };
    }

    options.storyPath = resolveStoryPath(options);

    // Restore a named save through the engine's real save format (version
    // reader, turn counter, RNG stream states — ADR-293 D7). The CLI owns
    // only the file location; a pre-ADR-293 snapshot is a hard error.
    async function restoreNamedSave(game, saveName) {
      const savesDir = path.join(storyDirOf(options.storyPath), 'saves');
      // A bare name resolves in the story's saves/ directory; a path (ADR-294
      // D18 divergence saves report one) is used as-is.
      const isPath = saveName.endsWith('.json') || saveName.includes(path.sep);
      const savePath = isPath ? saveName : path.join(savesDir, `${saveName}.json`);
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
      const parsed = JSON.parse(fs.readFileSync(savePath, 'utf-8'));
      if (parsed.worldState !== undefined || parsed.version === undefined) {
        console.error(`Save "${saveName}" is a legacy snapshot (no save-format version) — delete it and re-run the chain that creates it`);
        process.exit(1);
      }
      game.engine.registerSaveRestoreHooks({
        onSaveRequested: async () => {},
        onRestoreRequested: async () => parsed
      });
      const restored = await game.engine.restore();
      if (!restored) {
        console.error(`Failed to restore "${saveName}" from ${savePath}`);
        process.exit(1);
      }
      return savePath;
    }

    if (options.exec) {
      const game = loadStoryAndCreateGame(
        options.storyPath,
        undefined,
        resolveSeed(undefined).seed
      );
      console.log(`Seed: ${game.engine.getMasterSeed()}`);

      if (options.restore) {
        await restoreNamedSave(game, options.restore);
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

    if (options.worldJson) {
      const game = loadStoryAndCreateGame(options.storyPath);
      const world = game.world;
      const allEntities = world.getAllEntities();

      const rooms = [];
      const entities = [];
      const npcs = [];

      for (const entity of allEntities) {
        const identity = entity.get('identity');
        const name = identity ? identity.name : entity.id;
        const location = world.getLocation(entity.id) || null;
        const traitTypes = entity.getTraitTypes();

        if (traitTypes.includes('room')) {
          const roomTrait = entity.get('room');
          const exitEntries = {};
          if (roomTrait && roomTrait.exits) {
            for (const [dir, exitData] of Object.entries(roomTrait.exits)) {
              const dest = exitData ? exitData.destination : null;
              if (dest) {
                const destEntity = world.getEntity(dest);
                const destIdentity = destEntity ? destEntity.get('identity') : null;
                exitEntries[dir] = {
                  id: dest,
                  name: destIdentity ? destIdentity.name : dest
                };
              }
            }
          }
          rooms.push({
            id: entity.id,
            name,
            aliases: identity ? (identity.aliases || []) : [],
            isDark: roomTrait ? (roomTrait.isDark || false) : false,
            regionId: roomTrait ? (roomTrait.regionId || null) : null,
            exits: exitEntries,
          });
        } else if (traitTypes.includes('actor') && !traitTypes.includes('player')) {
          const npcTrait = entity.get('npc');
          npcs.push({
            id: entity.id,
            name,
            location,
            traits: traitTypes,
            behaviorId: npcTrait ? (npcTrait.behaviorId || null) : null,
          });
        } else if (entity.type !== 'player'
                   && !traitTypes.includes('region')
                   && !traitTypes.includes('scene')) {
          entities.push({
            id: entity.id,
            name,
            location,
            traits: traitTypes,
          });
        }
      }

      // Collect regions (ADR-149)
      const regions = [];
      for (const entity of allEntities) {
        const regionTrait = entity.get('region');
        if (regionTrait) {
          regions.push({
            id: entity.id,
            name: regionTrait.name,
            parentRegionId: regionTrait.parentRegionId || null,
          });
        }
      }

      // Collect scenes (ADR-149)
      const scenes = [];
      for (const entity of allEntities) {
        const sceneTrait = entity.get('scene');
        if (sceneTrait) {
          scenes.push({
            id: entity.id,
            name: sceneTrait.name,
            state: sceneTrait.state,
            recurring: sceneTrait.recurring,
          });
        }
      }

      // Engine introspection — actions with patterns and metadata
      const introspection = game.engine.introspect();

      const output = {
        storyPath: options.storyPath,
        rooms,
        entities,
        npcs,
        actions: introspection.actions,
        traits: introspection.traits,
        behaviors: introspection.behaviors,
        messages: introspection.messages,
        regions,
        scenes,
      };

      const jsonStr = JSON.stringify(output, null, 2);
      process.stdout.write(jsonStr, () => {
        process.exit(0);
      });
    }

    if (options.introspect) {
      // Emit the IDE project manifest (ADR-184). Status to stderr so stdout
      // carries only the manifest JSON for the IDE to parse.
      console.error(`Introspecting story: ${options.storyPath}`);
      const game = loadStoryAndCreateGame(options.storyPath);
      const manifest = bootstrap.buildManifest(game.world, path.basename(options.storyPath), 'cli');
      process.stdout.write(JSON.stringify(manifest, null, 2) + '\n', () => {
        process.exit(0);
      });
      return;
    }

    if (options.play) {
      console.log(`Loading story from: ${options.storyPath}`);
      const game = loadStoryAndCreateGame(
        options.storyPath,
        undefined,
        resolveSeed(undefined).seed
      );
      // ADR-293 D14: author surfaces show the seed automatically — one
      // number plus a command list reproduces the session.
      console.log(`Seed: ${game.engine.getMasterSeed()}`);

      if (options.restore) {
        const savePath = await restoreNamedSave(game, options.restore);
        console.log(`Restored: ${options.restore} (${savePath})`);
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

      // Parse every transcript up front: the chain's seed comes from the
      // FIRST member's seed: header field (ADR-293 D14 / ADR-294 D3), so
      // parsing must precede the chain game's construction.
      const parsedTranscripts = options.transcriptPaths.map((transcriptPath) => ({
        transcriptPath,
        transcript: transcriptTester.parseTranscriptFile(transcriptPath)
      }));

      // ADR-293 D14 chain rule: the chain is one session — only the first
      // transcript's seed pin is honored, and a pin on a later member is a
      // loud error, never silently ignored.
      if (options.chain) {
        for (let memberIndex = 0; memberIndex < parsedTranscripts.length; memberIndex++) {
          const member = parsedTranscripts[memberIndex];
          // A chain is one session at one seed — a seeds: matrix cannot ride it.
          const memberSeeds = member.transcript.config && member.transcript.config.seeds;
          if (memberSeeds && memberSeeds.length > 1) {
            console.error(
              `${member.transcriptPath}: seeds: matrix on a chain member — a chain is one ` +
              `session at one seed; matrices run per-transcript (ADR-294 D8)`
            );
            process.exit(1);
          }
          if (memberIndex > 0 && member.transcript.seed !== undefined) {
            console.error(
              `${member.transcriptPath}:${member.transcript.seedLineNumber}: ` +
              `seed: on a chain member after the first — the chain is one ` +
              `session and its seed comes from the first transcript (ADR-293 D14)`
            );
            process.exit(1);
          }
        }
      }

      // Chain mode shares one game instance across all transcripts, so load it
      // up front. In per-transcript mode the loop loads a fresh game for each
      // transcript (honoring its `entry:` header) — an eager load here would be
      // discarded unused (ADR-207 AC-7: no side-effecting pre-load).
      // ADR-294 D14: watch reruns are per-transcript; a chain is one session
      // and cannot be partially rerun. Chain watch lands with the corpus
      // migration, not silently wrong before it.
      if (options.watch && options.chain) {
        console.error('--watch does not support --chain yet — chain reruns land with the corpus migration (ADR-294 D14)');
        process.exit(1);
      }

      /** An error-status record for a transcript that failed validation. */
      function validationErrorRecord(transcript, errors) {
        const errorRecord = {
          transcript,
          commands: [],
          status: 'error',
          passed: 0,
          failed: 0,
          expectedFailures: 0,
          skipped: 0,
          duration: 0,
          errorMessage: errors.join('; ')
        };
        transcriptTester.reportTranscript(errorRecord, { verbose: options.verbose });
        return errorRecord;
      }

      /**
       * Run one transcript file fresh (non-chain): re-parse (watch reruns
       * follow edits), validate, and run once per matrix seed (ADR-294 D8 —
       * a --seed/--vary override collapses the matrix; the runner enforces
       * membership). Returns one result per run.
       */
      async function runTranscriptFileFresh(transcriptPath, bless) {
        const transcript = transcriptTester.parseTranscriptFile(transcriptPath);
        // Validation errors are recorded as an error-status result, never
        // dropped (ADR-294 AC-4: nothing executes, and the run fails).
        const errors = transcriptTester.validateTranscript(transcript);
        if (errors.length > 0) {
          return [validationErrorRecord(transcript, errors)];
        }

        const declaredSeeds = transcript.config && transcript.config.seeds;
        const matrixSeeds =
          options.seed === null && !options.vary && declaredSeeds && declaredSeeds.length > 1
            ? declaredSeeds
            : [null];

        const out = [];
        for (const matrixSeed of matrixSeeds) {
          const resolved = matrixSeed !== null
            ? { seed: matrixSeed, source: 'seeds:' }
            : resolveSeed(transcript.seed);
          const game = loadStoryAndCreateGame(options.storyPath, transcript.header && transcript.header.entry, resolved.seed);
          // ADR-293 D14: every run reports the seed it used, clock-derived included.
          console.log(`Seed: ${game.engine.getMasterSeed()} (${resolved.source})`);

          const result = await transcriptTester.runTranscript(transcript, game, {
            verbose: options.verbose,
            emitTraits: options.emitTraits,
            stopOnFailure: options.stopOnFailure,
            savesDirectory: path.join(storyDirOf(options.storyPath), 'saves'),
            bless,
            storyName: path.basename(storyDirOf(options.storyPath)),
            testingExtension: game.testingExtension
          });

          out.push(result);
          transcriptTester.reportTranscript(result, { verbose: options.verbose, emitTraits: options.emitTraits });
          if (result.status !== 'passed' && options.stopOnFailure) break;
        }
        return out;
      }

      const results = [];

      if (options.chain) {
        const resolved = resolveSeed(parsedTranscripts[0] && parsedTranscripts[0].transcript.seed);
        const game = loadStoryAndCreateGame(options.storyPath, undefined, resolved.seed);
        // ADR-293 D14: every run reports the seed it used, clock-derived included.
        console.log(`Seed: ${game.engine.getMasterSeed()} (${resolved.source})`);

        for (const { transcript } of parsedTranscripts) {
          const errors = transcriptTester.validateTranscript(transcript);
          if (errors.length > 0) {
            results.push(validationErrorRecord(transcript, errors));
            break;  // one session — later members need this state
          }

          const result = await transcriptTester.runTranscript(transcript, game, {
            verbose: options.verbose,
            emitTraits: options.emitTraits,
            stopOnFailure: options.stopOnFailure,
            savesDirectory: path.join(storyDirOf(options.storyPath), 'saves'),
            bless: options.bless,
            chain: true,
            storyName: path.basename(storyDirOf(options.storyPath)),
            testingExtension: game.testingExtension
          });

          results.push(result);
          transcriptTester.reportTranscript(result, { verbose: options.verbose, emitTraits: options.emitTraits });

          // A chain is one session: any non-passing member leaves the world
          // in the wrong state for every member after it, so the chain always
          // stops there (blessing past it would enshrine a broken session).
          if (result.status !== 'passed') break;
        }
      } else {
        for (const { transcriptPath } of parsedTranscripts) {
          const out = await runTranscriptFileFresh(transcriptPath, options.bless);
          results.push(...out);
          if (out.some((r) => r.status !== 'passed') && options.stopOnFailure) break;
        }
      }

      // The one shared reduce (ADR-277 D1) — includes totalErrors, which the
      // exit code must reflect (ADR-294 AC-4/AC-5).
      const runResult = transcriptTester.aggregateTestRun(results);

      if (results.length > 1) {
        transcriptTester.reportTestRun(runResult, { verbose: options.verbose });
      }

      if (!options.watch) {
        process.exit(transcriptTester.getExitCode(runResult));
      }

      // ADR-294 D14: stay resident and rerun what changes. The bless prompt
      // exists only at a TTY — an unattended watch never blesses anything.
      const promptBless = process.stdin.isTTY
        ? (transcriptPath) =>
            new Promise((resolve) => {
              const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
              rl.question(`bless ${path.basename(transcriptPath)}? [y/n/all] `, (answer) => {
                rl.close();
                const a = answer.trim().toLowerCase();
                resolve(a === 'y' ? 'y' : a === 'all' ? 'all' : 'n');
              });
            })
        : undefined;

      transcriptTester.startWatch(
        {
          transcripts: options.transcriptPaths,
          storyDirs: [storyDirOf(options.storyPath)]
        },
        {
          run: (transcriptPath, bless) => runTranscriptFileFresh(transcriptPath, bless),
          log: (message) => console.log(message)
        },
        new transcriptTester.BlessPolicy(promptBless)
      );
      console.log(`\nwatching ${options.transcriptPaths.length} transcript(s) and ${storyDirOf(options.storyPath)} — Ctrl+C to stop`);
    }
  }

  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}
