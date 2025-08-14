#!/usr/bin/env node

import { createCLIPlatform } from '@sharpee/platform-cli-en-us';
import { story } from './src/index';
import { WorldModel } from '@sharpee/world-model';

// Create world model
const world = new WorldModel();

// Create player
const player = story.createPlayer(world);
world.setPlayer(player);

// Initialize the story world
story.initializeWorld(world);

// Initialize the story
story.initialize();

// Create and start the CLI platform
const engine = createCLIPlatform({
  story,
  world,
  player
});

// Start the game
console.log('\n' + story.config.title);
console.log('by ' + story.config.author);
console.log(story.config.description);
console.log('\n');

// Get initial room description
const currentLocation = world.getLocation(player.id);
if (currentLocation) {
  const room = world.getEntity(currentLocation);
  if (room) {
    const identity = room.get('identity');
    if (identity) {
      console.log(identity.description);
    }
  }
}

// Start accepting commands
process.stdin.setEncoding('utf8');
process.stdin.on('data', (input) => {
  const command = input.trim();
  if (command.toLowerCase() === 'quit' || command.toLowerCase() === 'exit') {
    process.exit(0);
  }
  
  // Process command through engine
  engine.processCommand(command).then((response) => {
    if (response) {
      console.log(response);
    }
    
    // Check if story is complete
    if (story.isComplete()) {
      console.log('\n*** You have won! ***\n');
      process.exit(0);
    }
  });
});

console.log('\nType commands to play. Type "quit" to exit.\n> ');