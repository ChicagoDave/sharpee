#!/bin/bash
# Bundle dungeo into a single playable file

set -e
cd "$(dirname "$0")/.."

echo "=== Bundling Dungeo ==="

# Create entry point in project root
cat > .dungeo-entry.js << 'ENTRY'
const readline = require('readline');

// Story
const { story } = require('./stories/dungeo/dist/index.js');

// Platform
const { GameEngine } = require('./packages/engine/dist/index.js');
const { WorldModel, EntityType } = require('./packages/world-model/dist/index.js');
const { Parser } = require('./packages/parser-en-us/dist/index.js');
const { LanguageProvider } = require('./packages/lang-en-us/dist/index.js');
const { TextService } = require('./packages/text-services/dist/index.js');
const { PerceptionService } = require('./packages/stdlib/dist/index.js');

async function main() {
  // Create world and temporary player
  const world = new WorldModel();
  const player = world.createEntity('player', EntityType.ACTOR);
  world.setPlayer(player.id);

  // Create parser, language, and text service
  const language = new LanguageProvider();
  const parser = new Parser(language);
  const textService = new TextService();
  textService.setLanguageProvider(language);

  // Extend parser with story-specific vocabulary
  if (story.extendParser) story.extendParser(parser);
  if (story.extendLanguage) story.extendLanguage(language);

  // Create perception service
  const perceptionService = new PerceptionService();

  // Create engine with options object
  const engine = new GameEngine({
    world,
    player,
    parser,
    language,
    textService,
    perceptionService
  });

  // Set story and start
  engine.setStory(story);
  engine.start();

  // Capture text output
  let outputBuffer = [];
  engine.on('text:output', (text) => {
    outputBuffer.push(text);
  });

  // Show initial room
  const result = await engine.executeTurn('look');
  if (outputBuffer.length > 0) {
    console.log(outputBuffer.join('\n'));
    outputBuffer = [];
  }
  console.log();

  // REPL
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: '> '
  });

  rl.prompt();

  rl.on('line', async (line) => {
    const input = line.trim();
    if (!input) { rl.prompt(); return; }
    if (input.toLowerCase() === 'quit') { process.exit(0); }

    try {
      outputBuffer = [];
      const result = await engine.executeTurn(input);
      if (outputBuffer.length > 0) {
        console.log(outputBuffer.join('\n'));
      }
      console.log();
    } catch (e) {
      console.error('Error:', e.message);
    }
    rl.prompt();
  });

  rl.on('close', () => process.exit(0));
}

main().catch(e => { console.error(e); process.exit(1); });
ENTRY

# Bundle everything into one file
npx esbuild .dungeo-entry.js \
  --bundle \
  --platform=node \
  --format=cjs \
  --outfile=dist/dungeo.js \
  --external:readline \
  --minify

rm .dungeo-entry.js
chmod +x dist/dungeo.js

SIZE=$(du -h dist/dungeo.js | cut -f1)
echo "=== Done: dist/dungeo.js ($SIZE) ==="
echo "Run with: node dist/dungeo.js"
