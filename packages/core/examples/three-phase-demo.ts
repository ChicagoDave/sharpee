/**
 * Example demonstrating the Three-Phase Command Processing
 * 
 * This example shows how the parser, validator, and executor work together
 * in the new architecture.
 */

import { BasicParser, CommandValidator, standardVocabulary } from '@sharpee/stdlib';
import { WorldModel } from '@sharpee/world-model';
import { ActionRegistry } from '@sharpee/stdlib/actions';
import { takingAction, droppingAction, examiningAction } from '@sharpee/stdlib/actions/standard';

// Create world and entities
const world = new WorldModel();

// Create a room
world.createEntity({
  id: 'living-room',
  type: 'room',
  attributes: {
    name: 'Living Room',
    description: 'A cozy living room with comfortable furniture.'
  }
});

// Create player
world.createEntity({
  id: 'player',
  type: 'actor',
  location: 'living-room',
  attributes: {
    name: 'you'
  }
});

// Create some objects
world.createEntity({
  id: 'brass-key',
  type: 'thing',
  location: 'living-room',
  attributes: {
    name: 'brass key',
    description: 'A small brass key with intricate engravings.',
    adjectives: ['brass', 'small'],
    takeable: true
  }
});

world.createEntity({
  id: 'iron-key',
  type: 'thing',
  location: 'living-room',
  attributes: {
    name: 'iron key',
    description: 'A rusty iron key that looks quite old.',
    adjectives: ['iron', 'rusty'],
    takeable: true
  }
});

world.createEntity({
  id: 'table',
  type: 'supporter',
  location: 'living-room',
  attributes: {
    name: 'oak table',
    description: 'A sturdy oak table.',
    adjectives: ['oak', 'sturdy'],
    fixed: true
  }
});

// Phase 1: Set up Parser
console.log("=== PHASE 1: PARSING ===");
console.log("Parser has no world knowledge, only grammar\n");

const parser = new BasicParser();
parser.registerVocabulary(standardVocabulary);

// Example 1: Simple command
const input1 = "take key";
console.log(`Input: "${input1}"`);
const parsed1 = parser.parse(input1);
if (parsed1.length > 0) {
  const cmd = parsed1[0];
  console.log("ParsedCommand:");
  console.log(`  action: ${cmd.action}`);
  console.log(`  directObject: { text: "${cmd.directObject?.text}", candidates: ${JSON.stringify(cmd.directObject?.candidates)} }`);
  console.log("  (Note: Parser doesn't know which key or if keys exist!)");
}
console.log();

// Example 2: Command with adjective
const input2 = "examine brass key";
console.log(`Input: "${input2}"`);
const parsed2 = parser.parse(input2);
if (parsed2.length > 0) {
  const cmd = parsed2[0];
  console.log("ParsedCommand:");
  console.log(`  action: ${cmd.action}`);
  console.log(`  directObject: { text: "${cmd.directObject?.text}", candidates: ${JSON.stringify(cmd.directObject?.candidates)} }`);
}
console.log();

// Phase 2: Set up Validator
console.log("\n=== PHASE 2: VALIDATION ===");
console.log("Validator resolves entities and checks visibility\n");

// Set up action registry
const actionRegistry = new ActionRegistry();
actionRegistry.register(takingAction);
actionRegistry.register(droppingAction);
actionRegistry.register(examiningAction);

const validator = new CommandValidator(world, actionRegistry);

// Enable debug events to see resolution process
const debugEvents: any[] = [];
validator.setSystemEventSource({
  emit: (event) => debugEvents.push(event),
  subscribe: () => () => {}
});

// Validate the ambiguous "take key" command
console.log(`Validating: "take key"`);
const validationContext = {
  world,
  player: world.getEntity('player')!,
  location: world.getEntity('living-room')!,
  actionRegistry,
  scopeService: {
    getEntitiesInScope: () => world.getEntitiesAt('living-room')
  }
};

const validated1 = validator.validate(parsed1[0], validationContext);

if (!validated1.success) {
  console.log(`Validation failed: ${validated1.error.message}`);
  console.log("\nDebug info:");
  debugEvents
    .filter(e => e.type === 'ambiguity_check')
    .forEach(e => {
      console.log(`  Found ${e.data.matches.length} matches for "${e.data.reference.text}":`);
      e.data.matches.forEach((m: any) => 
        console.log(`    - ${m.entityId} (score: ${m.score})`)
      );
    });
} else {
  console.log("Validation successful!");
  console.log(`  Resolved to: ${validated1.value.directObject?.entity.id}`);
}

// Clear debug events
debugEvents.length = 0;

// Validate the specific "examine brass key" command
console.log(`\nValidating: "examine brass key"`);
const validated2 = validator.validate(parsed2[0], validationContext);

if (validated2.success) {
  console.log("Validation successful!");
  console.log(`  Resolved to: ${validated2.value.directObject?.entity.id}`);
  console.log(`  Action handler: ${validated2.value.actionHandler.id}`);
}

// Phase 3: Execution
console.log("\n=== PHASE 3: EXECUTION ===");
console.log("Actions execute business logic and return events\n");

if (validated2.success) {
  const actionContext = {
    world,
    player: world.getEntity('player')!
  };
  
  console.log(`Executing: ${validated2.value.actionHandler.id}`);
  const events = validated2.value.actionHandler.execute(validated2.value, actionContext);
  
  console.log("Generated events:");
  events.forEach(event => {
    console.log(`  ${event.type}:`, event.entities);
  });
}

// Example showing scope differences
console.log("\n=== SCOPE EXAMPLE ===");

// Move iron key to player inventory
world.moveEntity('iron-key', 'player');

console.log("Iron key is now in player inventory");
console.log("Brass key is still in the room");

const input3 = "drop key";
console.log(`\nInput: "${input3}"`);
const parsed3 = parser.parse(input3);
const validated3 = validator.validate(parsed3[0], validationContext);

if (validated3.success) {
  console.log(`Validator chose: ${validated3.value.directObject?.entity.id}`);
  console.log("(Should prefer iron key since DROP requires held items)");
}

console.log("\n=== COMPLETE ===");
console.log("This demonstrates the clean separation between:");
console.log("1. Parsing (grammar only)");
console.log("2. Validation (entity resolution)"); 
console.log("3. Execution (business logic)");
