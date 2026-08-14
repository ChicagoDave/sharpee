/**
 * Example: Using the Event-Driven Action System
 * 
 * This example demonstrates how actions generate events that are then
 * applied to the world model through the event processor.
 */

import { WorldModel } from '@sharpee/world-model';
import { 
  StandardActionRegistry, 
  registerStandardActions, 
  ReadOnlyActionContext,
  ParsedCommand 
} from '@sharpee/actions';
import { EventProcessor } from '@sharpee/event-processor';

// Create the world model
const world = new WorldModel();

// Create and setup the action registry
const actionRegistry = new StandardActionRegistry();
registerStandardActions(actionRegistry);

// Create the event processor
const eventProcessor = new EventProcessor(world);

// Create some entities for our example
const player = world.createEntity('player', 'yourself');
player.add('identity', { 
  displayName: 'yourself',
  description: 'As good-looking as ever.'
});
player.add('container', { capacity: 10 });

const room = world.createEntity('living-room', 'Living Room');
room.add('room', {});
room.add('identity', {
  displayName: 'Living Room',
  description: 'A cozy living room with a comfortable couch.'
});

const ball = world.createEntity('ball', 'red ball');
ball.add('identity', {
  displayName: 'red ball',
  description: 'A bright red rubber ball.'
});
ball.add('portable', { weight: 0.5 });

const box = world.createEntity('box', 'wooden box');
box.add('identity', {
  displayName: 'wooden box',
  description: 'A sturdy wooden box with a hinged lid.'
});
box.add('container', { capacity: 5 });
box.add('openable', { isOpen: false });
box.add('portable', { weight: 2 });

// Place entities in the world
world.moveEntity(player.id, room.id);
world.moveEntity(ball.id, room.id);
world.moveEntity(box.id, room.id);
world.setPlayer(player.id);

// Example 1: Taking an object
console.log('=== Example 1: Taking the ball ===');
console.log('Ball location before:', world.getLocation(ball.id));

// Create action context
const context = new ReadOnlyActionContext(world, player, room);

// Create parsed command for taking the ball
const takeCommand: ParsedCommand = {
  action: 'if.action.taking',
  actor: player,
  noun: ball
};

// Execute the action to get events
const takingAction = actionRegistry.get('if.action.taking')!;
const takeEvents = takingAction.execute(takeCommand, context);

console.log('Events generated:', takeEvents.map(e => ({
  type: e.type,
  entities: e.entities
})));

// Process the events to apply them to the world
const takeResults = eventProcessor.processEvents(takeEvents);

console.log('Applied events:', takeResults.applied.length);
console.log('Failed events:', takeResults.failed.length);
console.log('Ball location after:', world.getLocation(ball.id));

// Example 2: Opening a container
console.log('\n=== Example 2: Opening the box ===');
console.log('Box open state before:', box.get('openable')?.isOpen);

const openCommand: ParsedCommand = {
  action: 'if.action.opening',
  actor: player,
  noun: box
};

const openingAction = actionRegistry.get('if.action.opening')!;
const openEvents = openingAction.execute(openCommand, context);

console.log('Events generated:', openEvents.map(e => ({
  type: e.type,
  data: e.data
})));

const openResults = eventProcessor.processEvents(openEvents);
console.log('Box open state after:', box.get('openable')?.isOpen);

// Example 3: Failed action - taking something not reachable
console.log('\n=== Example 3: Failed action - taking from closed container ===');

// Put ball in the closed box
world.moveEntity(ball.id, box.id);
box.set('openable', { isOpen: false });

const takeFromBoxCommand: ParsedCommand = {
  action: 'if.action.taking',
  actor: player,
  noun: ball
};

const failedTakeEvents = takingAction.execute(takeFromBoxCommand, context);

console.log('Events generated:', failedTakeEvents.map(e => ({
  type: e.type,
  data: e.data,
  payload: e.payload
})));

// Example 4: Movement
console.log('\n=== Example 4: Movement ===');

// Create another room
const kitchen = world.createEntity('kitchen', 'Kitchen');
kitchen.add('room', {});
kitchen.add('identity', {
  displayName: 'Kitchen',
  description: 'A modern kitchen with stainless steel appliances.'
});
kitchen.add('visited', { hasBeenVisited: false });

// Add exits
room.add('exits', {
  exits: {
    north: {
      to: kitchen.id,
      description: 'To the north is the kitchen.'
    }
  }
});

kitchen.add('exits', {
  exits: {
    south: {
      to: room.id,
      description: 'To the south is the living room.'
    }
  }
});

console.log('Player location before:', world.getLocation(player.id));
console.log('Kitchen visited before:', kitchen.get('visited')?.hasBeenVisited);

const goCommand: ParsedCommand = {
  action: 'if.action.going',
  actor: player,
  params: { direction: 'north' }
};

const goingAction = actionRegistry.get('if.action.going')!;
const goEvents = goingAction.execute(goCommand, context);

console.log('Movement events:', goEvents.map(e => ({
  type: e.type,
  data: e.data
})));

const goResults = eventProcessor.processEvents(goEvents);
console.log('Player location after:', world.getLocation(player.id));
console.log('Kitchen visited after:', kitchen.get('visited')?.hasBeenVisited);

// Summary
console.log('\n=== Summary ===');
console.log('The event-driven architecture ensures:');
console.log('1. Actions are pure functions that only validate and return events');
console.log('2. State changes only happen through event handlers');
console.log('3. All state changes are traceable through events');
console.log('4. The system is extensible - new events and handlers can be added');
