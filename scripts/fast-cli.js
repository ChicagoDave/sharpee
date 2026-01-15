#!/usr/bin/env node
/**
 * Fast CLI - Play mode using bundled sharpee.js
 *
 * Usage: node scripts/fast-cli.js [story-path]
 *
 * Loads in ~200ms vs ~60s for individual packages on WSL.
 */

const path = require('path');
const readline = require('readline');

// Load the bundle
const bundlePath = path.join(__dirname, '..', 'dist', 'sharpee.js');
let sharpee;
try {
  sharpee = require(bundlePath);
} catch (e) {
  console.error('Bundle not found. Run: ./scripts/bundle-sharpee.sh');
  process.exit(1);
}

const {
  GameEngine,
  WorldModel,
  Parser,
  LanguageProvider,
  TextService,
  PerceptionService
} = sharpee;

async function loadStory(storyPath) {
  const resolvedPath = path.isAbsolute(storyPath)
    ? storyPath
    : path.resolve(process.cwd(), storyPath);

  // Try loading the compiled dist version
  const distPath = path.join(resolvedPath, 'dist', 'index.js');
  let storyModule;
  try {
    storyModule = require(distPath);
  } catch (e) {
    console.error(`Failed to load story from ${distPath}`);
    console.error(e.message);
    process.exit(1);
  }

  const story = storyModule.story || storyModule.default;
  if (!story) {
    console.error('Story module does not export story or default');
    process.exit(1);
  }

  // Initialize world
  const world = new WorldModel();
  story.initializeWorld(world);

  // Initialize services
  const languageProvider = new LanguageProvider();
  const parser = new Parser(languageProvider);
  const textService = new TextService();
  textService.setLanguageProvider(languageProvider);
  const perceptionService = new PerceptionService(world);

  // Extend parser with story-specific grammar
  if (story.extendParser) {
    story.extendParser(parser);
  }

  // Initialize engine
  const engine = new GameEngine(
    world,
    parser,
    textService,
    perceptionService,
    story.getActionRegistry?.() || story.actionRegistry
  );

  // Register story handlers
  if (story.registerHandlers) {
    story.registerHandlers(world, engine);
  }

  // Initialize scheduler if present
  if (story.initializeScheduler) {
    story.initializeScheduler(world, engine);
  }

  return { engine, world, story };
}

async function play(storyPath) {
  console.log(`Loading story from: ${storyPath}`);
  const startTime = Date.now();

  const { engine, world } = await loadStory(storyPath);

  console.log(`Loaded in ${Date.now() - startTime}ms`);
  console.log('Type commands to play. Type "quit" or Ctrl+C to exit.\n');

  // Show initial room
  const result = await engine.executeTurn('look');
  console.log(result.output || '');
  console.log();

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: '> '
  });

  rl.prompt();

  rl.on('line', async (line) => {
    const input = line.trim();

    if (!input) {
      rl.prompt();
      return;
    }

    if (input.toLowerCase() === 'quit' || input.toLowerCase() === 'q') {
      console.log('Goodbye!');
      rl.close();
      process.exit(0);
    }

    try {
      const result = await engine.executeTurn(input);
      if (result.output) {
        console.log(result.output);
      }
      console.log();
    } catch (e) {
      console.error('Error:', e.message);
    }

    rl.prompt();
  });

  rl.on('close', () => {
    console.log('\nGoodbye!');
    process.exit(0);
  });
}

// Main
const storyPath = process.argv[2] || 'stories/dungeo';
play(storyPath);
