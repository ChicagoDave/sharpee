/**
 * Test bundle entry template.
 *
 * build.sh --test generates a concrete entry from this by replacing
 * __STORY_DIST_PATH__ with the actual story dist path, then esbuild
 * bundles everything (platform + story + transcript-tester) into a
 * single file: dist/cli/{story}-test.js
 *
 * This eliminates the dynamic require() that forces Node to resolve
 * hundreds of files through pnpm's node_modules at runtime.
 */

const path = require('path');
const fs = require('fs');

// Platform packages (same as bundle-entry.js)
const {
  GameEngine,
  WorldModel,
  EntityType,
  Parser,
  LanguageProvider,
  PerceptionService,
  TestingExtension
} = {
  ...require('__REPO_ROOT__/packages/core/dist/index.js'),
  ...require('__REPO_ROOT__/packages/if-domain/dist/index.js'),
  ...require('__REPO_ROOT__/packages/world-model/dist/index.js'),
  ...require('__REPO_ROOT__/packages/stdlib/dist/index.js'),
  ...require('__REPO_ROOT__/packages/engine/dist/index.js'),
  ...require('__REPO_ROOT__/packages/parser-en-us/dist/index.js'),
  ...require('__REPO_ROOT__/packages/lang-en-us/dist/index.js'),
  ...require('__REPO_ROOT__/packages/event-processor/dist/index.js'),
  ...require('__REPO_ROOT__/packages/text-blocks/dist/index.js'),
  ...require('__REPO_ROOT__/packages/text-service/dist/index.js'),
  ...require('__REPO_ROOT__/packages/if-services/dist/index.js'),
  ...require('__REPO_ROOT__/packages/extensions/testing/dist/index.js')
};

// Story — static require so esbuild bundles it
const storyModule = require('__STORY_DIST_PATH__');

// Transcript tester
const transcriptTester = require('__REPO_ROOT__/packages/transcript-tester/dist/index.js');

function createGame() {
  const story = storyModule.story || storyModule.default;
  if (!story) {
    throw new Error('Story module does not export "story" or "default"');
  }

  const world = new WorldModel();
  const player = world.createEntity('player', EntityType.ACTOR);
  world.setPlayer(player.id);

  const language = new LanguageProvider();
  const parser = new Parser(language);

  if (story.extendParser) story.extendParser(parser);
  if (story.extendLanguage) story.extendLanguage(language);

  const perceptionService = new PerceptionService();

  const engine = new GameEngine({ world, player, parser, language, perceptionService });
  engine.setStory(story);
  engine.start();

  const testingExtension = TestingExtension ? new TestingExtension() : null;

  let outputBuffer = [];
  let eventBuffer = [];
  let lastTurnResult = null;

  engine.on('text:output', (blocks) => { outputBuffer.push(exports.renderToString(blocks)); });
  engine.on('event', (event) => { eventBuffer.push(event); });

  return {
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
        lastTurnResult = result;
      } catch (error) {
        outputBuffer.push(`Error: ${error.message || error}`);
      }

      const output = outputBuffer.join('\n');
      this.lastOutput = output;
      this.lastEvents = eventBuffer;
      this.lastTurnResult = lastTurnResult;
      return output;
    }
  };
}

// CLI — test-only subset
const args = process.argv.slice(2);

function parseArgs(args) {
  const options = {
    transcriptPaths: [],
    verbose: false,
    stopOnFailure: false,
    chain: false,
    savesDirectory: null
  };

  let i = 0;
  while (i < args.length) {
    const arg = args[i];
    if (arg === '--verbose' || arg === '-v') options.verbose = true;
    else if (arg === '--stop-on-failure' || arg === '-s') options.stopOnFailure = true;
    else if (arg === '--chain' || arg === '-c') options.chain = true;
    else if (arg === '--saves-dir') { i++; options.savesDirectory = args[i]; }
    else if (arg === '--test' || arg === '-t') { /* consume flag */ }
    else if (!arg.startsWith('-')) options.transcriptPaths.push(arg);
    i++;
  }

  return options;
}

async function main() {
  const options = parseArgs(args);

  if (options.transcriptPaths.length === 0) {
    console.log('Usage: node dist/cli/__STORY_NAME__-test.js [--chain] [--verbose] [--stop-on-failure] <transcript-files...>');
    process.exit(1);
  }

  console.log(`Found ${options.transcriptPaths.length} transcript(s) to run`);
  if (options.chain) {
    console.log('Chain mode: Game state will persist between transcripts');
  }

  let game = createGame();
  const results = [];

  for (const transcriptPath of options.transcriptPaths) {
    const transcript = transcriptTester.parseTranscriptFile(transcriptPath);

    const errors = transcriptTester.validateTranscript(transcript);
    if (errors.length > 0) {
      console.error(`\nErrors in ${transcriptPath}:`);
      for (const err of errors) console.error(`  - ${err}`);
      continue;
    }

    if (!options.chain) {
      game = createGame();
    }

    const savesDirectory = options.savesDirectory || path.join(path.dirname(transcriptPath), '..', 'saves');
    const result = await transcriptTester.runTranscript(transcript, game, {
      verbose: options.verbose,
      stopOnFailure: options.stopOnFailure,
      savesDirectory,
      testingExtension: game.testingExtension
    });

    results.push(result);
    transcriptTester.reportTranscript(result, { verbose: options.verbose });

    if (options.stopOnFailure && result.failed > 0) break;
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

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
