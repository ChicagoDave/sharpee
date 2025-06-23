/**
 * Example demonstrating Parser-World Integration
 * 
 * This example shows how the enhanced parser integrates with the world model
 * to provide context-aware command parsing with scope hints.
 */

import { createStory, US_EN } from '../src';
import { EntityFactory } from '../src/world-model/if-world/entity-factory';

// Create a story with enhanced parser
const story = createStory({ 
  title: "Parser Integration Demo",
  language: US_EN 
});

// Get the world instance
const world = story.getWorld();

// Create a starting room
const livingRoom = EntityFactory.createRoom({
  id: 'living-room',
  name: 'Living Room',
  description: 'A cozy living room with comfortable furniture.'
});
world.addEntity(livingRoom);

// Create player and place in room
const player = EntityFactory.createPlayer('player');
world.addEntity(player);
world.moveEntity('player', 'living-room');

// Create some objects to interact with
const brassKey = EntityFactory.createThing({
  id: 'brass-key',
  name: 'key',
  adjectives: ['brass', 'small'],
  description: 'A small brass key with intricate engravings.'
});

const ironKey = EntityFactory.createThing({
  id: 'iron-key',
  name: 'key',
  adjectives: ['iron', 'rusty'],
  description: 'A rusty iron key that looks quite old.'
});

const woodenBox = EntityFactory.createContainer({
  id: 'wooden-box',
  name: 'box',
  adjectives: ['wooden', 'ornate'],
  description: 'An ornate wooden box with brass hinges.',
  lockable: true,
  locked: true,
  key: 'brass-key'
});

const table = EntityFactory.createSupporter({
  id: 'table',
  name: 'table',
  adjectives: ['oak'],
  description: 'A sturdy oak table.'
});

// Add objects to the world
world.addEntity(brassKey);
world.addEntity(ironKey);
world.addEntity(woodenBox);
world.addEntity(table);

// Place objects: brass key on player, iron key on table, box on floor
world.moveEntity('brass-key', 'player');
world.moveEntity('iron-key', 'table');
world.moveEntity('wooden-box', 'living-room');
world.moveEntity('table', 'living-room');

// Example 1: Basic command parsing
console.log("Example 1: Basic Parsing");
console.log("-------------------------");

const result1 = story.parse('look');
console.log(`Command: "look"`);
console.log(`Parsed action: ${result1.commands[0]?.action}`);
console.log();

// Example 2: Object disambiguation
console.log("Example 2: Disambiguation");
console.log("-------------------------");

const result2 = story.parse('take key');
console.log(`Command: "take key"`);
if (result2.needsDisambiguation) {
  console.log("Disambiguation needed!");
  console.log("Options:");
  result2.needsDisambiguation.options.forEach(opt => {
    console.log(`  - ${opt.description}`);
  });
} else {
  console.log(`Would take: ${result2.commands[0]?.noun?.[0].entity.id}`);
}
console.log();

// Example 3: Scope hints in action
console.log("Example 3: Scope Hints");
console.log("----------------------");

const result3 = story.parse('unlock box with key');
console.log(`Command: "unlock box with key"`);
// The parser should prefer the held key (brass) over the one on the table
if (!result3.needsDisambiguation) {
  const chosenKey = result3.commands[0]?.second?.[0].entity.id;
  console.log(`Parser chose: ${chosenKey} (should prefer brass-key as it's held)`);
}
console.log();

// Example 4: Container vs Supporter
console.log("Example 4: Container vs Supporter");
console.log("---------------------------------");

// Create a coin to put somewhere
const coin = EntityFactory.createThing({
  id: 'coin',
  name: 'coin',
  description: 'A shiny gold coin.'
});
world.addEntity(coin);
world.moveEntity('coin', 'player');

const result4a = story.parse('put coin in box');
console.log(`Command: "put coin in box"`);
console.log(`Success: ${result4a.success}`);
console.log(`Target: ${result4a.commands[0]?.second?.[0].entity.id}`);

const result4b = story.parse('put coin on table');
console.log(`Command: "put coin on table"`);
console.log(`Success: ${result4b.success}`);
console.log(`Target: ${result4b.commands[0]?.second?.[0].entity.id}`);
console.log();

// Example 5: Darkness and visibility
console.log("Example 5: Darkness and Visibility");
console.log("----------------------------------");

// Create a dark cellar
const cellar = EntityFactory.createRoom({
  id: 'cellar',
  name: 'Cellar',
  description: 'A dark, musty cellar.',
  dark: true
});
world.addEntity(cellar);

// Add a treasure in the cellar
const treasure = EntityFactory.createThing({
  id: 'treasure',
  name: 'treasure',
  description: 'A chest full of gold coins!'
});
world.addEntity(treasure);
world.moveEntity('treasure', 'cellar');

// Move player to dark cellar
world.moveEntity('player', 'cellar');

const result5a = story.parse('take treasure');
console.log(`Command: "take treasure" (in darkness)`);
console.log(`Success: ${result5a.success}`);
console.log(`Error: ${result5a.error || 'none'}`);

// Give player a light source
const lamp = EntityFactory.createDevice({
  id: 'lamp',
  name: 'lamp',
  description: 'A battery-powered lamp.',
  on: true,
  providesLight: true
});
world.addEntity(lamp);
world.moveEntity('lamp', 'player');

// Update lamp to be lit
const litLamp = world.getEntity('lamp')!;
world.updateEntity('lamp', {
  ...litLamp,
  attributes: { ...litLamp.attributes, lit: true }
});

const result5b = story.parse('take treasure');
console.log(`Command: "take treasure" (with light)`);
console.log(`Success: ${result5b.success}`);
console.log();

// Example 6: Pronoun resolution
console.log("Example 6: Pronoun Resolution");
console.log("-----------------------------");

// Move back to living room
world.moveEntity('player', 'living-room');

// Take the iron key to make it recently mentioned
story.parse('take iron key');

const result6 = story.parse('examine it');
console.log(`Command: "examine it"`);
console.log(`Refers to: ${result6.commands[0]?.noun?.[0].entity.id}`);
console.log(`Match type: ${result6.commands[0]?.noun?.[0].matchType}`);

console.log("\nParser-World Integration Demo Complete!");
