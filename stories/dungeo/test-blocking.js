const path = require('path');
const base = '/mnt/c/repotemp/sharpee';

// Load the bundle
const sharpee = require(path.join(base, 'dist/sharpee.js'));
const { createGame, processCommand } = sharpee;

// Create game
const game = createGame({ debug: false });

// Send commands
const commands = [
  'n', 'e', 'open window', 'w', 'w',
  'take lantern', 'take sword', 'turn on lantern',
  'push rug', 'open trapdoor', 'down', 'e',
  'z', // Wait - troll should attack
  'kill troll' // Player attacks troll
];

for (const cmd of commands) {
  console.log('\n> ' + cmd);
  const result = processCommand(game, cmd);
  
  // Show text output
  if (result.text) {
    console.log(result.text.substring(0, 300));
  }
  
  // Show events
  if (result.events) {
    const interestingEvents = result.events.filter(function(e) {
      return e.type.indexOf('attack') !== -1 || 
        e.type.indexOf('npc') !== -1 ||
        e.type.indexOf('death') !== -1 ||
        e.type.indexOf('blocked') !== -1;
    });
    if (interestingEvents.length > 0) {
      console.log('Events:', interestingEvents.map(function(e) {
        return e.type + ': ' + (e.data ? e.data.messageId || '' : '');
      }).join(', '));
    }
  }
}
