/**
 * Example demonstrating the message system
 */

import { 
  ActionMessages, 
  SystemMessages,
  EntityMessages,
  getMessage,
  withParams,
  messageResolver
} from '../src/messages';

// Import to register the English bundle
import '../src/messages/bundles';

// Example 1: Simple message
console.log('Simple message:');
console.log(getMessage(ActionMessages.CANT_TAKE_THAT));
// Output: "You can't take that."

// Example 2: Message with parameters
console.log('\nMessage with parameters:');
console.log(getMessage(withParams(ActionMessages.NOTHING_SPECIAL, { target: 'the sword' })));
// Output: "You see nothing special about the sword."

// Example 3: Entity-specific messages
console.log('\nEntity messages:');
const swordDescKey = EntityMessages.description('sword');
console.log(`Key namespace: ${swordDescKey.namespace}, key: ${swordDescKey.key}`);

// Example 4: Checking if messages exist
console.log('\nChecking message existence:');
console.log(`Has CANT_TAKE_THAT: ${messageResolver.hasMessage(ActionMessages.CANT_TAKE_THAT)}`);
console.log(`Has sword description: ${messageResolver.hasMessage(EntityMessages.description('sword'))}`);

// Example 5: Using with events
import { createActionFailedEvent, withMessageKey } from '../src/events';
import { createEvent } from '@sharpee/core';

console.log('\nCreating events with messages:');
const failedEvent = createActionFailedEvent(
  'TAKING',
  ActionMessages.ALREADY_CARRYING,
  { actor: 'player', target: 'sword' }
);
console.log('Failed event:', JSON.stringify(failedEvent, null, 2));

// Example 6: Adding message to existing event
const baseEvent = createEvent('TAKEN', {}, { actor: 'player', target: 'sword' });
const eventWithMessage = withMessageKey(baseEvent, ActionMessages.TAKEN);
console.log('\nEvent with message:', JSON.stringify(eventWithMessage, null, 2));
