#!/usr/bin/env node

/**
 * Platform runner for Cloak of Darkness using static architecture
 */

const path = require('path');
const fs = require('fs');

// Set NODE_PATH to include our packages directory
const packagesDir = path.resolve(__dirname, '../../packages');
const nodeModulesDir = path.resolve(__dirname, '../../node_modules');

// Add both packages and node_modules to NODE_PATH
process.env.NODE_PATH = `${packagesDir}:${nodeModulesDir}:${process.env.NODE_PATH || ''}`;
require('module').Module._initPaths();

// Configure module resolution for @sharpee packages
const Module = require('module');
const originalResolveFilename = Module._resolveFilename;

Module._resolveFilename = function (request, parent, isMain) {
  if (request.startsWith('@sharpee/')) {
    const packageName = request.replace('@sharpee/', '');

    // Try different paths in order
    const attempts = [
      path.join(packagesDir, packageName, 'dist', 'index.js'),
      path.join(packagesDir, packageName, 'src', 'index.js'),
      path.join(packagesDir, packageName, 'index.js')
    ];

    for (const attemptPath of attempts) {
      try {
        return originalResolveFilename.call(this, attemptPath, parent, isMain);
      } catch (e) {
        // Try next path
      }
    }

    // Check package.json main field
    try {
      const packageJsonPath = path.join(packagesDir, packageName, 'package.json');
      const packageJson = require(packageJsonPath);
      if (packageJson.main) {
        const mainPath = path.join(packagesDir, packageName, packageJson.main);
        return originalResolveFilename.call(this, mainPath, parent, isMain);
      }
    } catch (e) {
      // Fall through
    }
  }

  return originalResolveFilename.call(this, request, parent, isMain);
};

async function runStory() {
  console.log('=== Cloak of Darkness (Static Platform) ===');
  console.log('A Sharpee IF demonstration');
  console.log('');

  try {
    // Import required modules
    const { WorldModel, EntityType } = require('@sharpee/world-model');
    const { GameEngine } = require('@sharpee/engine');
    const { renderToString } = require('@sharpee/text-service');
    const { Parser } = require('@sharpee/parser-en-us');
    const { EnglishLanguageProvider } = require('@sharpee/lang-en-us');
    const { TextService } = require('@sharpee/text-services');
    const { story } = require('./dist/index.js');

    // Create world and player
    const world = new WorldModel();
    const player = world.createEntity('You', EntityType.ACTOR);
    world.setPlayer(player.id);

    // Create services
    const language = new EnglishLanguageProvider();
    const parser = new Parser(language);
    // Use CLI events text service for debugging
    const { CLIEventsTextService } = require('@sharpee/text-services');
    const textService = new CLIEventsTextService({
      showTurnHeader: true,
      showLocation: true,
      showEventData: true,
      indentEvents: true
    });

    // Extend parser and language with story-specific vocabulary/messages
    if (story.extendParser) {
      story.extendParser(parser);
    }
    if (story.extendLanguage) {
      story.extendLanguage(language);
    }

    // Create engine with static dependencies
    const engine = new GameEngine({
      world,
      player,
      parser,
      language,
      textService
    });

    // Set up event listeners BEFORE starting the engine
    // Listen for text output
    engine.on('text:output', (blocks, turn) => {
      console.log(renderToString(blocks));
    });

    // Listen for all events
    engine.on('event', (event) => {
      // Display game lifecycle events
      if (event.type && event.type.startsWith('game.')) {
        console.log(`\n[GAME EVENT]: ${event.type} - ${JSON.stringify(event.data || {})}`);
      }
    });

    // Set the story
    engine.setStory(story);

    // Start the engine
    engine.start();
    console.log('Engine started successfully');

    // Listen for turn completion
    engine.on('turn:complete', (result) => {
      if (result.error) {
        console.log(`Error: ${result.error}`);
      }

      // Check for system events
      const systemEvents = result.events.filter(e =>
        e.type.startsWith('system.')
      );
      if (systemEvents.length > 0) {
        console.log('\n[SYSTEM EVENTS]:');
        systemEvents.forEach(e => {
          console.log(`  ${e.type}: ${JSON.stringify(e.data)}`);
        });
      }

      // Check for game events in turn
      const gameEvents = result.events.filter(e =>
        e.type.startsWith('game.')
      );
      if (gameEvents.length > 0) {
        console.log('\n[GAME LIFECYCLE EVENTS]:');
        gameEvents.forEach(e => {
          console.log(`  ${e.type}: ${JSON.stringify(e.data)}`);
        });
      }
    });

    // Execute test commands
    const commands = [
      'trace on',        // Turn on parser events
      'look',
      'examine cloak',          // Should show parser events
      'west',                   // Should show both events
      'look',                   // Should only show validation events
      'hang cloak on hook',     // Should show no debug events
      'east',
      'south',
      'examine message',
      'read message'                    // Test game end events
    ];

    for (const command of commands) {
      console.log(`\n> ${command}`);
      try {
        await engine.executeTurn(command);
      } catch (error) {
        console.error(`Error executing command '${command}':`, error.message);
      }
    }

    console.log('\n=== Story Complete ===');
    process.exit(0);

  } catch (error) {
    console.error('Error running story:', error);
    process.exit(1);
  }
}

// Run the story
runStory().catch(console.error);