/**
 * Very basic test to debug the rule system
 */

import { createSimpleRuleSystem, createSimpleRuleWorld } from '../../src/rules';
import { createEvent } from '../../src/events/event-system';
import { StandardEventTypes } from '../../src/events/standard-events';

test('Basic rule system functionality', () => {
  // Create system
  const ruleSystem = createSimpleRuleSystem();
  const world = createSimpleRuleWorld({
    entities: {
      'player': { id: 'player', attributes: { name: 'Player' } },
      'apple': { id: 'apple', attributes: { name: 'apple' } }
    }
  });

  // Add simple rule
  ruleSystem.addRule({
    id: 'test-rule',
    eventType: 'item:taken',
    action: () => ({ message: 'Test message' })
  });

  // Create event
  const event = createEvent(
    StandardEventTypes.ITEM_TAKEN,
    { itemId: 'apple' },
    { actor: 'player', target: 'apple' }
  );

  console.log('Event created:', event);

  // Process event
  const result = ruleSystem.processEvent(event, world);

  console.log('Result:', result);
  console.log('Events:', result.events);
  if (result.events.length > 0) {
    console.log('First event payload:', result.events[0].payload);
  }

  // Basic assertions
  expect(result).toBeDefined();
  expect(result.events).toBeDefined();
});
