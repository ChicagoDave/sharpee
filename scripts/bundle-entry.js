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
  // ADR-302 D15: a separate harness, not a mode of the first. Which one runs
  // is decided by the story's directory (D16), never by a flag.
  const branchTester = require('../packages/branch-tester/dist/index.js');
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
      // ADR-293 D15: print the full per-point coverage breakdown (the
      // one-line summary always prints at the end of a --test run).
      coverage: false,
      // ADR-293 D12: first-firing outcome search — 'point=CLASS' target;
      // the transcript argument is the command driver.
      search: null,
      searchBudget: null,
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
      } else if (arg === '--coverage') {
        options.coverage = true;
      } else if (arg === '--search') {
        i++;
        if (i < args.length) {
          options.search = args[i];
        }
      } else if (arg === '--search-budget') {
        i++;
        if (i < args.length) {
          options.searchBudget = args[i];
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
  --coverage           Print the full per-point outcome-class coverage
                       breakdown (ADR-293 D15); the one-line summary always
                       prints at the end of a --test run
  --search <pt>=<CLS>  First-firing outcome search (ADR-293 D12): find a
                       point-seed under which the point's first drawn firing
                       produces the class, driving the world with the given
                       transcript's commands. Reports tries-spent and the
                       point-seed: header line to paste on success
  --search-budget <N>  Override the search try budget (default: 10 x the
                       point's declared class count)
  --help, -h           Show this help message

Examples:
  node dist/cli/sharpee.js --exec "look" --story stories/dungeo --debug
  node dist/cli/sharpee.js --exec "wait/wait/tie wire to hook" --story stories/dungeo --restore wt-13a --debug
  node dist/cli/sharpee.js --test stories/dungeo/tests/transcripts/save-restore-basic.transcript
  node dist/cli/sharpee.js --test --chain stories/dungeo/walkthroughs/wt-*.transcript
  node dist/cli/sharpee.js --play --story branch-stories/fernhill/fernhill.story
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
  function loadChordStory(storyFile, seed) {
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
    // ADR-293 D1: the chord evaluator's stream (`one chance in <n>`,
    // `randomly`) derives from the session's master seed — omitting it here
    // left chord draws clock-seeded under a pinned --seed/seed: header.
    return storyLoader.createStory(result.ir, { hatchModules, seed });
  }

  // Single loader (ADR-180): resolve the story module (entry-aware) and assemble
  // the game via @sharpee/bootstrap. Replaces the former inline copy; the
  // channel-packet assembly now lives once in bootstrap.assembleGame.
  // A path ending in `.story` is compiled + interpreted instead of required
  // (`entry` applies only to module stories and is ignored for `.story` files).
  // Channels carrying the game's opening. The banner and the prologue are said
  // before anything is typed and are not prose channels, so any surface showing
  // the game to a person has to ask for them or the player never sees them
  // (ADR-300 D15). The turn's prose rides `lastOutput` and needs no declaration.
  const OPENING_CHANNELS = ['prologue', 'banner'];

  /**
   * Print the opening captured on the way to the first command.
   *
   * The banner arrives as properties rather than prose, so the order the lines
   * appear in is this surface's choice — a different client is free to lay the
   * same pieces out differently.
   */
  function printOpening(game) {
    const channels = game.lastChannels || {};

    const prologue = channels.prologue;
    if (prologue && prologue.length > 0) {
      console.log(prologue.join('\n'));
      console.log('');
    }

    const raw = channels.banner;
    if (!raw || raw.length === 0) return;
    let banner;
    try {
      banner = JSON.parse(raw[raw.length - 1]);
    } catch {
      return;
    }

    const lines = [];
    if (banner.title) lines.push(banner.title);
    if (banner.storyVersion) lines.push(banner.storyVersion);
    if (banner.platformVersion) lines.push(banner.platformVersion);
    if (banner.subtitle) lines.push(banner.subtitle);
    for (const credit of banner.credits || []) lines.push(credit);
    if (banner.tail && banner.tail.length > 0) {
      lines.push('');
      for (const line of banner.tail) lines.push(line);
    }
    if (lines.length > 0) {
      console.log(lines.join('\n'));
      console.log('');
    }
  }

  function loadStoryAndCreateGame(storyPath, entry, seed, channels) {
    // ADR-293: forward the resolved master seed to EngineConfig.seed; a
    // restart reboot reuses it, so pinned runs survive in-transcript RESTART.
    const seedOption = seed !== undefined ? { seed } : {};
    // ADR-294 D15: declared capture channels flow to assembly — the
    // capability profile and per-command channel capture are fixed there.
    const channelsOption = channels !== undefined ? { channels } : {};
    if (storyPath.endsWith('.story')) {
      // ADR-293 D1: one master seed governs the engine AND the chord
      // evaluator. When none was injected, read the clock once HERE so both
      // get the same value — the reported seed then reproduces chord draws.
      const masterSeed = seed !== undefined ? seed : Date.now();
      // ADR-248: freshStory recompiles from source, so an in-transcript
      // RESTART reboots onto a fully fresh ChordStory (same master seed).
      return bootstrap.assembleGame(loadChordStory(storyPath, masterSeed), {
        freshStory: () => loadChordStory(storyPath, masterSeed),
        seed: masterSeed,
        ...channelsOption,
      });
    }
    const modulePath = bootstrap.resolveStoryModulePath(storyPath, entry);
    // ADR-248: bootstrap's one purge+re-require+createStory() implementation
    // serves both the initial load and every in-process restart reboot.
    const freshStory = bootstrap.moduleFreshStory(storyPath, modulePath);
    return bootstrap.assembleGame(freshStory(), { freshStory, ...seedOption, ...channelsOption });
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
    printOpening(game);
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
      const match = /(^|\/)((?:stories|tutorials|branch-stories)\/[^/]+)(\/|$)/.exec(p.replace(/\\/g, '/'));
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

  /**
   * Run a v2 story as a tree (ADR-302 D10, D11).
   *
   * Uses the bundle's own loader, so a Chord `.story` compiles and runs here
   * exactly as it does for v1 — that capability lives in the bundle, not in
   * either harness package.
   *
   * The tree is the input: every transcript is parsed and assembled, and the
   * whole tree is validated before a single command runs. A root gets a fresh
   * game built from its own header when the walk reaches it.
   *
   * `resolveSeed` is passed in rather than re-derived: it carries ADR-293 D1's
   * precedence (`--seed` | `--vary` → `seed:` → the clock), and a second copy
   * would be a second answer.
   */
  async function runBranchTree(options, resolveSeed) {
    const parsed = [];
    let parseFailures = 0;
    for (const transcriptPath of options.transcriptPaths) {
      const transcript = branchTester.parseTranscriptFile(transcriptPath);
      const errors = branchTester.validateTranscript(transcript);
      if (errors.length > 0) {
        parseFailures++;
        console.error(`${transcriptPath}:`);
        for (const error of errors) console.error(`  ${error}`);
        continue;
      }
      parsed.push(transcript);
    }
    if (parseFailures > 0) {
      console.error(`\n${parseFailures} transcript(s) failed to parse — nothing ran.`);
      process.exit(2);
    }

    const storyName = path.basename(storyDirOf(options.storyPath));
    const tree = branchTester.assembleTree(parsed, storyName);
    if (tree.defects.length > 0) {
      for (const line of branchTester.formatTreeRun({
        outcomes: [],
        defects: tree.defects,
        executedCommands: 0,
        authoredCommands: 0
      })) {
        console.error(line);
      }
      process.exit(2);
    }

    const coverageTracker = new branchTester.CoverageTracker();

    // A root is a fresh game (D1) built from ITS OWN header — `entry:`, the
    // pinned seed, and any declared channels. Children inherit through the
    // effective header rather than by reloading (D8).
    //
    // D17 asks for a boot per FORK as well as per root, so the same root may be
    // booted several times and every one of them must land on the same seed —
    // a root that declared none would otherwise draw a new clock seed per boot
    // and its replayed prefix would diverge from the one its first child saw.
    // The seed the first boot actually resolved is therefore remembered and
    // re-pinned, and the announcement is made once.
    const bootedSeeds = new Map();
    const freshGameForRoot = async (root) => {
      const config = root.transcript.config || {};
      const remembered = bootedSeeds.get(root.stem);
      const resolved = remembered ?? resolveSeed(root.transcript.seed);
      const game = loadStoryAndCreateGame(
        options.storyPath,
        root.transcript.header && root.transcript.header.entry,
        resolved.seed,
        config.channels || []
      );
      if (!remembered) {
        const seed = game.engine.getMasterSeed();
        bootedSeeds.set(root.stem, { seed, source: resolved.source });
        console.log(`Seed: ${seed} (${resolved.source})`);
      }
      return game;
    };

    const run = await branchTester.runTree(tree, freshGameForRoot, {
      verbose: options.verbose,
      emitTraits: options.emitTraits,
      stopOnFailure: options.stopOnFailure,
      bless: options.bless,
      savesDirectory: path.join(storyDirOf(options.storyPath), 'saves'),
      storyName,
      coverage: coverageTracker
    });

    const results = [];
    for (const outcome of run.outcomes) {
      if (!outcome.result) continue;
      results.push(outcome.result);
      branchTester.reportTranscript(outcome.result, {
        verbose: options.verbose,
        emitTraits: options.emitTraits
      });
    }

    // D13: unreached is not failed. Printed after the runs, so the tally reads
    // as blast radius rather than as more failures.
    console.log();
    for (const line of branchTester.formatTreeRun(run)) console.log(line);

    const coverageReport = coverageTracker.buildReport();
    console.log();
    console.log(branchTester.formatCoverageSummary(coverageReport));
    if (options.coverage) {
      console.log();
      console.log(branchTester.formatCoverageBreakdown(coverageReport));
    }

    const runResult = branchTester.aggregateTestRun(results);
    process.exit(run.defects.length > 0 ? 2 : branchTester.getExitCode(runResult));
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
        resolveSeed(undefined).seed,
        OPENING_CHANNELS
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
      let openingPrinted = false;
      for (const command of commands) {
        console.log(`> ${command}`);
        try {
          const output = await game.executeCommand(command);
          if (!openingPrinted) {
            openingPrinted = true;
            printOpening(game);
          }
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
        resolveSeed(undefined).seed,
        OPENING_CHANNELS
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

    // ADR-293 D12: first-firing outcome search. The transcript is the command
    // driver; the search forks the real engine save per candidate in-process
    // (ruled Decision 5(a)) and reports a reproducible (seed, point-seed) pair.
    if (options.search !== null) {
      const searchMatch = /^([^#=\s]+)=([^=\s]+)$/.exec(options.search);
      if (!searchMatch) {
        console.error(`Invalid --search target "${options.search}" — expected point=CLASS (e.g. dungeo.thief.steal=yes)`);
        process.exit(2);
      }
      if (options.transcriptPaths.length !== 1) {
        console.error('--search needs exactly one driver transcript (its commands walk the world to the firing)');
        process.exit(2);
      }
      let budget;
      if (options.searchBudget !== null) {
        budget = Number(options.searchBudget);
        if (!Number.isInteger(budget) || budget < 1) {
          console.error(`Invalid --search-budget value "${options.searchBudget}" — must be a positive integer`);
          process.exit(2);
        }
      }

      const transcriptPath = options.transcriptPaths[0];
      const transcript = transcriptTester.parseTranscriptFile(transcriptPath);
      const errors = transcriptTester.validateTranscript(transcript);
      if (errors.length > 0) {
        console.error(`Errors in ${transcriptPath}:`);
        for (const err of errors) console.error(`  - ${err}`);
        process.exit(1);
      }

      const resolved = resolveSeed(transcript.seed);
      const game = loadStoryAndCreateGame(options.storyPath, transcript.header && transcript.header.entry, resolved.seed);
      console.log(`Seed: ${game.engine.getMasterSeed()} (${resolved.source})`);
      console.log(`Searching ${searchMatch[1]}=${searchMatch[2]} over ${path.basename(transcriptPath)}...`);

      const result = await transcriptTester.searchOutcome(
        transcript,
        game,
        { point: searchMatch[1], cls: searchMatch[2] },
        budget !== undefined ? { budget } : {}
      );

      if (result.found) {
        console.log(`✓ found in ${result.tries} of ${result.budget} tries (firing command #${result.firingCommandIndex + 1})`);
        console.log('Reproduce with these header lines:');
        console.log(`  seed: ${result.masterSeed}`);
        if (result.pointSeed !== undefined) {
          console.log(`  point-seed: ${searchMatch[1]}=${result.pointSeed}`);
        } else {
          console.log(`  (no point-seed needed — the class occurs naturally at this seed)`);
        }
        process.exit(0);
      }
      console.error(
        result.reason === 'budget-exhausted'
          ? `✗ budget exhausted after ${result.tries} tries — the class may be rarer than the uniform prior; retry with --search-budget N (ADR-293 D12)`
          : `✗ search failed: ${result.reason}`
      );
      process.exit(1);
    }

    if (options.test || options.transcriptPaths.length > 0) {
      if (options.transcriptPaths.length === 0) {
        console.error('Error: No transcript files specified');
        printHelp();
        process.exit(1);
      }

      console.log(`Loading story from: ${options.storyPath}`);
      console.log(`Found ${options.transcriptPaths.length} transcript(s) to run`);

      // ── Which harness? The directory decides (ADR-302 D16) ──────────
      // Not a flag and not a header field: `branch-stories/` is v2's, and
      // everything else is v1's. Mixed paths are a hard error rather than a
      // pick, for the same reason mixed story prefixes are — the two
      // harnesses disagree on grammar and runtime semantics, so a run that
      // spanned both would mean two different things at once.
      const underBranch = options.transcriptPaths.map((p) =>
        /(^|\/)branch-stories\//.test(p.replace(/\\/g, '/'))
      );
      if (underBranch.some(Boolean) && !underBranch.every(Boolean)) {
        console.error(
          'Transcripts span both branch-stories/ and stories/ — each harness reads only its ' +
          'own directory (ADR-302 D16). Run them separately.'
        );
        process.exit(1);
      }

      if (underBranch.every(Boolean) && underBranch.length > 0) {
        return await runBranchTree(options, resolveSeed);
      }

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
          // ADR-294 D15: assemble with the transcript's declared channels.
          const declaredChannels = (transcript.config && transcript.config.channels) || [];
          const game = loadStoryAndCreateGame(options.storyPath, transcript.header && transcript.header.entry, resolved.seed, declaredChannels);
          // ADR-293 D14: every run reports the seed it used, clock-derived included.
          console.log(`Seed: ${game.engine.getMasterSeed()} (${resolved.source})`);

          const result = await transcriptTester.runTranscript(transcript, game, {
            verbose: options.verbose,
            emitTraits: options.emitTraits,
            stopOnFailure: options.stopOnFailure,
            savesDirectory: path.join(storyDirOf(options.storyPath), 'saves'),
            bless,
            assembledChannels: declaredChannels,
            storyName: path.basename(storyDirOf(options.storyPath)),
            testingExtension: game.testingExtension,
            coverage: coverageTracker
          });

          out.push(result);
          transcriptTester.reportTranscript(result, { verbose: options.verbose, emitTraits: options.emitTraits });
          if (result.status !== 'passed' && options.stopOnFailure) break;
        }
        return out;
      }

      const results = [];

      // ADR-293 D15: one tracker per run — a chain is one session with one
      // report, and a multi-transcript run is one suite. The runner feeds it
      // from each command's system.draw trace events.
      const coverageTracker = new transcriptTester.CoverageTracker();

      if (options.chain) {
        const resolved = resolveSeed(parsedTranscripts[0] && parsedTranscripts[0].transcript.seed);
        // ADR-294 D15: one session, one profile — the FIRST member's channels
        // govern assembly; the runner rejects a member that disagrees.
        const chainChannels =
          (parsedTranscripts[0] && parsedTranscripts[0].transcript.config &&
            parsedTranscripts[0].transcript.config.channels) || [];
        const game = loadStoryAndCreateGame(options.storyPath, undefined, resolved.seed, chainChannels);
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
            assembledChannels: chainChannels,
            storyName: path.basename(storyDirOf(options.storyPath)),
            testingExtension: game.testingExtension,
            coverage: coverageTracker
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

      // ADR-293 D15: the one-line summary always prints — the never-fired
      // count is worthless if it has to be asked for. --coverage adds the
      // full per-point breakdown.
      const coverageReport = coverageTracker.buildReport();
      console.log();
      console.log(transcriptTester.formatCoverageSummary(coverageReport));
      if (options.coverage) {
        console.log();
        console.log(transcriptTester.formatCoverageBreakdown(coverageReport));
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
