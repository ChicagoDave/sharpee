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
    const { EnglishParser } = require('@sharpee/parser-en-us');
    const { EnglishLanguageProvider } = require('@sharpee/lang-en-us');
    const { TemplateTextService } = require('@sharpee/text-services');
    const { story } = require('./dist/index.js');
    
    // Create world and player
    const world = new WorldModel();
    const player = world.createEntity('You', EntityType.ACTOR);
    world.setPlayer(player.id);
    
    // Create services
    const language = new EnglishLanguageProvider();
    const parser = new EnglishParser(world, language);
    const textService = new TemplateTextService();
    textService.setLanguageProvider(language);
    
    // Create engine with static dependencies
    const engine = new GameEngine({
      world,
      player,
      parser,
      language,
      textService
    });
    
    // Set the story
    engine.setStory(story);
    
    // Start the engine
    engine.start();
    console.log('Engine started successfully');
    
    // Listen for text output
    engine.on('text:output', (text, turn) => {
      console.log(text);
    });
    
    // Listen for turn completion
    engine.on('turn:complete', (result) => {
      if (result.error) {
        console.log(`Error: ${result.error}`);
      }
    });
    
    // Execute test commands
    const commands = [
      'look',
      'examine cloak',
      'west',
      'look',
      'hang cloak on hook',
      'east',
      'south',
      'examine message',
      'read message'
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